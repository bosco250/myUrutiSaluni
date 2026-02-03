import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentStatus } from '../entities/salon-document.entity';

export class ReviewDocumentDto {
  @ApiProperty({
    enum: DocumentStatus,
    description: 'New status for the document',
    example: DocumentStatus.APPROVED,
  })
  @IsEnum(DocumentStatus)
  status: DocumentStatus;

  @ApiProperty({
    required: false,
    description: 'Notes or rejection reason',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
