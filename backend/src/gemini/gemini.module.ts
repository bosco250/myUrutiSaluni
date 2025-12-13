import { Module } from '@nestjs/common';
import { GeminiController } from './gemini.controller';
import { GeminiService } from './gemini.service';
import { ImageSearchService } from './image-search.service';

@Module({
  controllers: [GeminiController],
  providers: [GeminiService, ImageSearchService],
  exports: [GeminiService, ImageSearchService],
})
export class GeminiModule {}

