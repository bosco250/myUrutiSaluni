import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsDateString } from 'class-validator';
import { CreateResourceDto } from './create-resource.dto';

export class UpdateResourceDto extends PartialType(CreateResourceDto) {
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}

