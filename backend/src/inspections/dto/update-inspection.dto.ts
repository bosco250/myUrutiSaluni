import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsNumber, IsDateString } from 'class-validator';
import { CreateInspectionDto } from './create-inspection.dto';

export class UpdateInspectionDto extends PartialType(CreateInspectionDto) {
  @IsOptional()
  @IsNumber()
  totalScore?: number;

  @IsOptional()
  @IsNumber()
  maxScore?: number;

  @IsOptional()
  @IsDateString()
  completedAt?: string;
}

