import { IsUUID, IsInt, Min, Max, IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ReviewAspectsDto {
  @IsInt()
  @Min(1)
  @Max(5)
  service: number;

  @IsInt()
  @Min(1)
  @Max(5)
  punctuality: number;

  @IsInt()
  @Min(1)
  @Max(5)
  cleanliness: number;

  @IsInt()
  @Min(1)
  @Max(5)
  value: number;
}

export class CreateReviewDto {
  @IsUUID()
  salonId: string;

  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @IsUUID()
  @IsOptional()
  appointmentId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @ValidateNested()
  @Type(() => ReviewAspectsDto)
  @IsOptional()
  aspects?: ReviewAspectsDto;
}
