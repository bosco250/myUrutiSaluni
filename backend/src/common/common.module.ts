import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers/health.controller';
import { FileUploadModule } from './services/file-upload.module';

@Module({
  imports: [TerminusModule, FileUploadModule],
  controllers: [HealthController],
  exports: [FileUploadModule],
})
export class CommonModule {}
