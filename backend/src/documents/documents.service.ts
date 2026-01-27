import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class DocumentsService implements OnModuleInit, OnModuleDestroy {
  private client: MongoClient;
  private bucket: GridFSBucket;
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const uri =
      this.configService.get<string>('MONGODB_URI') ||
      'mongodb://localhost:27017/uruti_files';
    try {
      this.client = new MongoClient(uri);
      await this.client.connect();
      const db = this.client.db();
      this.bucket = new GridFSBucket(db, { bucketName: 'uploads' });
      this.logger.log('Successfully connected to MongoDB for File Storage');
    } catch (error) {
      this.logger.error('Failed to connect to MongoDB', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
    }
  }

  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ id: string; filename: string; url: string }> {
    return new Promise((resolve, reject) => {
      const filename = `${Date.now()}-${file.originalname}`;
      const uploadStream = this.bucket.openUploadStream(filename, {
        contentType: file.mimetype,
      });

      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);

      bufferStream
        .pipe(uploadStream)
        .on('error', (error) => reject(error))
        .on('finish', () => {
          resolve({
            id: uploadStream.id.toString(),
            filename: filename,
            url: `/api/documents/${filename}`, // URL to view/download
          });
        });
    });
  }

  async getFileStream(
    filename: string,
  ): Promise<{ stream: Readable; contentType: string }> {
    const files = await this.bucket.find({ filename }).toArray();
    if (!files.length) {
      throw new Error('File not found');
    }

    const file = files[0];
    return {
      stream: this.bucket.openDownloadStreamByName(filename),
      contentType: file.contentType || 'application/octet-stream',
    };
  }
}
