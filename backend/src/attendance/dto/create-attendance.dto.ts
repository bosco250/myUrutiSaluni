import { IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AttendanceType } from '../entities/attendance-log.entity';

export class CreateAttendanceDto {
  @ApiProperty()
  @IsUUID()
  salonEmployeeId: string;

  @ApiProperty({ enum: AttendanceType })
  @IsEnum(AttendanceType)
  type: AttendanceType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  source?: string;
}

