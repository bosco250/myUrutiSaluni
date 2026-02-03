import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadResult {
  id: string;
  filename: string;
  url: string;
  contentType: string;
  size: number;
}

@Injectable()
export class UploadsService {
  private client: MongoClient | null = null;
  private bucket: GridFSBucket | null = null;
  private readonly dbName = 'uruti_saluni_files';
  private readonly logger = new Logger(UploadsService.name);
  private readonly localUploadDir = path.join(process.cwd(), 'local-uploads');

  constructor(private configService: ConfigService) {
    // Ensure local upload directory exists
    if (!fs.existsSync(this.localUploadDir)) {
      fs.mkdirSync(this.localUploadDir, { recursive: true });
    }
  }

  /**
   * Get MongoDB connection and GridFS bucket
   */
  private async getBucket(): Promise<GridFSBucket> {
    if (this.bucket) {
      return this.bucket;
    }

    const mongoUri = this.configService.get<string>('MONGODB_URI');

    if (!mongoUri) {
        throw new Error('MONGODB_URI is not defined');
    }

    try {
        this.client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 2000 });
        await this.client.connect();
        const db = this.client.db(this.dbName);
        this.bucket = new GridFSBucket(db, { bucketName: 'uploads' });
        this.logger.log('Connected to MongoDB GridFS');
        return this.bucket;
    } catch (error) {
        this.logger.error('Failed to connect to MongoDB, using local fallback', error);
        throw error;
    }
  }

  /**
   * Upload file to MongoDB GridFS with Local Fallback
   */
  async uploadFile(
    file: Express.Multer.File,
    baseUrl: string,
    folder: string = 'avatars',
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    // Sanitize filename to be safe for filesystem
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${timestamp}-${safeOriginalName}`;
    const contentType = file.mimetype;

    try {
        const bucket = await this.getBucket();
        // Create a readable stream from the buffer
        const readableStream = new Readable();
        readableStream.push(file.buffer);
        readableStream.push(null);

        const gridFsFilename = `${folder}/${uniqueFilename}`;
        const uploadStream = bucket.openUploadStream(gridFsFilename, {
            contentType,
            metadata: { folder, originalName: file.originalname, uploadedAt: new Date() },
        });

        return new Promise((resolve, reject) => {
            readableStream
            .pipe(uploadStream)
            .on('error', (err) => {
                this.logger.error('GridFS write error, trying local fallback', err);
                // Fallback inside error handler is tricky, usually better to let it fail and catch below
                reject(err);
            })
            .on('finish', () => {
                resolve({
                    id: uploadStream.id.toString(),
                    filename: gridFsFilename,
                    url: `${baseUrl}/api/uploads/${uploadStream.id.toString()}`,
                    contentType,
                    size: file.size,
                });
            });
        });
    } catch (error) {
        this.logger.warn(`Using local filesystem fallback for upload: ${error.message}`);
        
        // Local Filesystem Fallback
        const userFolderStr = folder.replace(/\//g, '-'); // flatten folder structure
        const localFileName = `${userFolderStr}-${uniqueFilename}`;
        const filePath = path.join(this.localUploadDir, localFileName);
        
        fs.writeFileSync(filePath, file.buffer);
        
        // Return a result that mimics GridFS but points to the local file endpoint (which we handle in getFile)
        // We use "LOCAL-" prefix for ID to distinguish
        const localId = `LOCAL-${localFileName}`;
        
        return {
            id: localId,
            filename: localFileName,
            url: `${baseUrl}/api/uploads/${localId}`,
            contentType,
            size: file.size,
        };
    }
  }

  /**
   * Get file from MongoDB GridFS or Local Filesystem
   */
  async getFile(fileId: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string;
    filename: string;
  }> {
    
    // Check if it's a local file
    if (fileId.startsWith('LOCAL-')) {
        const localFilename = fileId.replace('LOCAL-', '');
        const filePath = path.join(this.localUploadDir, localFilename);
        
        if (fs.existsSync(filePath)) {
            const stream = fs.createReadStream(filePath);
            // Try to guess mime type or default
            return {
                stream,
                contentType: 'application/octet-stream', // simplified
                filename: localFilename,
            };
        }
        throw new NotFoundException('Local file not found');
    }

    // Try Mongo
    try {
        const bucket = await this.getBucket();
        const objectId = new ObjectId(fileId);
        const files = await bucket.find({ _id: objectId }).toArray();
        if (files.length === 0) throw new NotFoundException('File not found');

        const file = files[0];
        const downloadStream = bucket.openDownloadStream(objectId);

        return {
            stream: downloadStream,
            contentType: file.contentType || 'application/octet-stream',
            filename: file.filename,
        };
    } catch (error) {
        if (error instanceof NotFoundException) throw error;
        // If mongo fails here, we can't do much if it wasn't a local file
        throw new NotFoundException('File not found (DB Error)');
    }
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string): Promise<void> {
    if (fileId.startsWith('LOCAL-')) {
        const localFilename = fileId.replace('LOCAL-', '');
        const filePath = path.join(this.localUploadDir, localFilename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return;
    }

    try {
      const bucket = await this.getBucket();
      const objectId = new ObjectId(fileId);
      await bucket.delete(objectId);
    } catch {
       // ignore
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
    }
  }
}
