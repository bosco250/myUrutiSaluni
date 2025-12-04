import { IsString, IsUUID, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiProperty()
  @IsUUID()
  salonId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

