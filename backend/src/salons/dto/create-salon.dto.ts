import { IsString, IsOptional, IsNumber, IsUUID, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSalonDto {
  @ApiProperty()
  @IsUUID()
  ownerId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({ required: false, default: 'Rwanda' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false, description: 'Additional salon settings (business type, operating hours, etc.)' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

