import { IsString, IsOptional, IsNumber, IsUUID, IsArray, IsBoolean, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ description: 'User ID of the employee (must be an existing user)' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Salon ID where the employee will work' })
  @IsUUID()
  salonId: string;

  @ApiProperty({ required: false, description: 'Job title or role (e.g., Senior Stylist, Junior Stylist)' })
  @IsOptional()
  @IsString()
  roleTitle?: string;

  @ApiProperty({ required: false, description: 'Array of skills/specializations', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({ required: false, description: 'Hire date (ISO date string)' })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiProperty({ required: false, default: true, description: 'Whether the employee is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, default: 0, description: 'Commission rate as percentage (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;
}

