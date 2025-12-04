import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, IsUUID, MinLength, MaxLength, Min, Max } from 'class-validator';

export class CreateServicePackageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  serviceIds: string[];

  @IsNumber()
  @Min(0)
  packagePrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  validFrom?: Date;

  @IsOptional()
  validTo?: Date;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsUUID()
  salonId: string;
}

