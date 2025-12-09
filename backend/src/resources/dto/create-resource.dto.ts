import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  IsUrl,
  MaxLength,
} from 'class-validator';
import {
  ResourceType,
  ResourceCategory,
  ResourceStatus,
} from '../entities/resource.entity';

export class CreateResourceDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ResourceType)
  type: ResourceType;

  @IsOptional()
  @IsEnum(ResourceCategory)
  category?: ResourceCategory;

  @IsOptional()
  @IsEnum(ResourceStatus)
  status?: ResourceStatus;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsUrl()
  externalUrl?: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accessRoles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  expiresAt?: Date;

  @IsOptional()
  metadata?: Record<string, any>;
}
