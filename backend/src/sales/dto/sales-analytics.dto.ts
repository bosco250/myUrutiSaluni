import { IsOptional, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SalesAnalyticsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

