import {
  IsString,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateWaitlistEntryDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  salonId: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @IsOptional()
  @IsString()
  preferredTimeStart?: string;

  @IsOptional()
  @IsString()
  preferredTimeEnd?: string;

  @IsOptional()
  @IsBoolean()
  flexible?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  expiresAt?: Date;
}
