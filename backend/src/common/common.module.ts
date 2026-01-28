import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './controllers/health.controller';
import { FileUploadModule } from './services/file-upload.module';
import { TransformInterceptor } from './interceptors/transform.interceptor';

@Module({
  imports: [TerminusModule, FileUploadModule],
  controllers: [HealthController],
  providers: [TransformInterceptor],
  exports: [FileUploadModule, TransformInterceptor],
})
export class CommonModule {}
