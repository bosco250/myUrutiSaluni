import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';

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

  constructor(private configService: ConfigService) {}

  /**
   * Get MongoDB connection and GridFS bucket
   */
  private async getBucket(): Promise<GridFSBucket> {
    if (this.bucket) {
      return this.bucket;
    }

    const mongoUri = this.configService.get<string>('MONGODB_URI');

    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in backend .env file');
    }

    this.client = new MongoClient(mongoUri);
    await this.client.connect();

    const db = this.client.db(this.dbName);
    this.bucket = new GridFSBucket(db, { bucketName: 'uploads' });

    return this.bucket;
  }

  /**
   * Upload file to MongoDB GridFS
   */
  async uploadFile(
    file: Express.Multer.File,
    baseUrl: string,
    folder: string = 'avatars',
  ): Promise<UploadResult> {
    const bucket = await this.getBucket();

    // Create a readable stream from the buffer
    const readableStream = new Readable();
    readableStream.push(file.buffer);
    readableStream.push(null);

    // Generate unique filename
    const timestamp = Date.now();
    const uniqueFilename = `${folder}/${timestamp}-${file.originalname}`;

    // Upload to GridFS
    const uploadStream = bucket.openUploadStream(uniqueFilename, {
      contentType: file.mimetype,
      metadata: {
        folder,
        originalName: file.originalname,
        uploadedAt: new Date(),
      },
    });

    return new Promise((resolve, reject) => {
      readableStream
        .pipe(uploadStream)
        .on('error', reject)
        .on('finish', () => {
          resolve({
            id: uploadStream.id.toString(),
            filename: uniqueFilename,
            url: `${baseUrl}/api/uploads/${uploadStream.id.toString()}`,
            contentType: file.mimetype,
            size: file.size,
          });
        });
    });
  }

  /**
   * Get file from MongoDB GridFS
   */
  async getFile(fileId: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string;
    filename: string;
  }> {
    const bucket = await this.getBucket();

    try {
      const objectId = new ObjectId(fileId);

      // Get file metadata
      const files = await bucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        throw new NotFoundException('File not found');
      }

      const file = files[0];
      const downloadStream = bucket.openDownloadStream(objectId);

      return {
        stream: downloadStream,
        contentType: file.contentType || 'application/octet-stream',
        filename: file.filename,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('File not found');
    }
  }

  /**
   * Delete file from MongoDB GridFS
   */
  async deleteFile(fileId: string): Promise<void> {
    const bucket = await this.getBucket();

    try {
      const objectId = new ObjectId(fileId);
      await bucket.delete(objectId);
    } catch {
      throw new NotFoundException('File not found');
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
