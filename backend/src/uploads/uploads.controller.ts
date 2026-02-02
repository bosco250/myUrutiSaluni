import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  Res,
  Req,
  Delete,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response, Request } from 'express';
import { UploadsService } from './uploads.service';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('avatar')
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
  @ApiOperation({ summary: 'Upload user avatar to MongoDB GridFS' })
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new NotFoundException('No file uploaded');
    }
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.uploadsService.uploadFile(file, baseUrl, 'avatars');
  }

  @Post('service')
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
  @ApiOperation({ summary: 'Upload service image to MongoDB GridFS' })
  async uploadServiceImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new NotFoundException('No file uploaded');
    }
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.uploadsService.uploadFile(file, baseUrl, 'services');
  }

  @Post('document')
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
  @ApiOperation({ summary: 'Upload document to MongoDB GridFS' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new NotFoundException('No file uploaded');
    }
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.uploadsService.uploadFile(file, baseUrl, 'documents');
  }

  @Post('salon')
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
  @ApiOperation({ summary: 'Upload salon image to MongoDB GridFS' })
  async uploadSalonImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new NotFoundException('No file uploaded');
    }
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    return this.uploadsService.uploadFile(file, baseUrl, 'salons');
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get file by ID from MongoDB GridFS' })
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.uploadsService.getFile(id);

    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `inline; filename="${file.filename}"`,
    });

    file.stream.pipe(res);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete file by ID from MongoDB GridFS' })
  async deleteFile(@Param('id') id: string) {
    await this.uploadsService.deleteFile(id);
    return { message: 'File deleted successfully' };
  }
}
