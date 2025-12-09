import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStyleReferenceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsUUID('all', { each: false })
  appointmentId?: string;

  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  sharedWithEmployees?: boolean;
}
