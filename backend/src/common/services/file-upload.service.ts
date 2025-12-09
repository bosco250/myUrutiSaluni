import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileUploadService {
  private readonly uploadPath: string;

  constructor(private configService: ConfigService) {
    // Set upload directory - use 'uploads' in project root
    this.uploadPath = path.join(process.cwd(), 'uploads', 'style-references');
    this.ensureUploadDirectoryExists();
  }

  private ensureUploadDirectoryExists() {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async saveFile(
    file: Express.Multer.File,
    subfolder: string = 'style-references',
  ): Promise<{ filename: string; path: string; url: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    // Create subfolder directory if it doesn't exist
    const subfolderPath = path.join(process.cwd(), 'uploads', subfolder);
    if (!fs.existsSync(subfolderPath)) {
      fs.mkdirSync(subfolderPath, { recursive: true });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const filename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(subfolderPath, filename);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Return relative URL path
    const baseUrl = this.configService.get('BASE_URL', 'http://localhost:3000');
    const url = `${baseUrl}/uploads/${subfolder}/${filename}`;

    return {
      filename,
      path: filePath,
      url,
    };
  }

  async deleteFile(
    filename: string,
    subfolder: string = 'style-references',
  ): Promise<void> {
    const filePath = path.join(this.uploadPath, subfolder, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getFileUrl(filename: string, subfolder: string = 'style-references'): string {
    const baseUrl = this.configService.get('BASE_URL', 'http://localhost:3000');
    return `${baseUrl}/uploads/${subfolder}/${filename}`;
  }
}
