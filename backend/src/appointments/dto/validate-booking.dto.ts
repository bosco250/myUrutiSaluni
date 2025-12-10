import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ValidateBookingDto {
  @ApiProperty({
    description: 'Employee ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsUUID()
  employeeId: string;

  @ApiProperty({
    description: 'Service ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString()
  @IsUUID()
  serviceId: string;

  @ApiProperty({
    description: 'Scheduled start time (ISO 8601)',
    example: '2024-01-15T14:00:00.000Z',
  })
  @IsDateString()
  scheduledStart: string;

  @ApiProperty({
    description: 'Scheduled end time (ISO 8601)',
    example: '2024-01-15T15:00:00.000Z',
  })
  @IsDateString()
  scheduledEnd: string;

  @ApiProperty({
    description:
      'Appointment ID to exclude from conflict checking (for updates)',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  excludeAppointmentId?: string;
}
