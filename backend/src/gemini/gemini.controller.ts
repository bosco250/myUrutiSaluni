import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GeminiService } from './gemini.service';
import 'multer';

@ApiTags('AI Face Analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Post('analyze-face')
  @ApiOperation({
    summary: 'Analyze face image and get hairstyle recommendations',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  async analyzeFace(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // Convert file buffer to base64
    const imageBase64 = file.buffer.toString('base64');

    return this.geminiService.analyzeFace(imageBase64);
  }

  @Post('analyze-face-base64')
  @ApiOperation({ summary: 'Analyze face from base64 encoded image' })
  async analyzeFaceBase64(@Body() body: { image: string }) {
    if (!body.image) {
      throw new BadRequestException('No image data provided');
    }

    // Remove data URL prefix if present (data:image/jpeg;base64,...)
    const base64Data = body.image.includes(',')
      ? body.image.split(',')[1]
      : body.image;

    return this.geminiService.analyzeFace(base64Data);
  }
}
