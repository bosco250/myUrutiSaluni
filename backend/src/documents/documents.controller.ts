import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Get,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { Response } from 'express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a file to MongoDB GridFS' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    return this.documentsService.uploadFile(file);
  }

  @Get(':filename')
  @ApiOperation({ summary: 'Download/View a file by filename' })
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const { stream, contentType } =
        await this.documentsService.getFileStream(filename);
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
      });
      stream.pipe(res);
    } catch (e) {
      throw new NotFoundException('File not found');
    }
  }
}
