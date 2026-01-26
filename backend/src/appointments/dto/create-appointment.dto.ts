import {
  IsUUID,
  IsDateString,
  IsOptional,
  IsString,
  IsEnum,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AppointmentStatus } from '../entities/appointment.entity';

export class CreateAppointmentDto {
  @ApiProperty()
  @IsUUID()
  salonId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiProperty({
    required: false,
    description: 'Assigned employee for the appointment',
  })
  @IsOptional()
  @IsUUID()
  salonEmployeeId?: string;

  @ApiProperty()
  @IsDateString()
  scheduledStart: string;

  @ApiProperty()
  @IsDateString()
  scheduledEnd: string;

  @ApiProperty({
    enum: AppointmentStatus,
    required: false,
    default: AppointmentStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    required: false,
    description: 'Additional metadata (e.g., preferredEmployeeId)',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({
    required: false,
    description:
      'Set to true when booking for yourself (allows staff to book as customers)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  bookForSelf?: boolean;
}
