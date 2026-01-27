import {
  IsString,
  IsEnum,
  IsOptional,
  IsUrl,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { DocumentType } from '../entities/salon-document.entity';

export class CreateDocumentDto {
  @IsNotEmpty()
  @IsEnum(DocumentType)
  type: DocumentType;

  @IsNotEmpty()
  @IsUrl()
  fileUrl: string;

  @IsNotEmpty()
  @IsString()
  mongoFileId: string;

  @IsNotEmpty()
  @IsString()
  filename: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
