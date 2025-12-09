import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsArray,
  IsBoolean,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'User ID of the employee (must be an existing user)',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Salon ID where the employee will work' })
  @IsUUID()
  salonId: string;

  @ApiProperty({
    required: false,
    description: 'Job title or role (e.g., Senior Stylist, Junior Stylist)',
  })
  @IsOptional()
  @IsString()
  roleTitle?: string;

  @ApiProperty({
    required: false,
    description: 'Array of skills/specializations',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({ required: false, description: 'Hire date (ISO date string)' })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiProperty({
    required: false,
    default: true,
    description: 'Whether the employee is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    required: false,
    default: 0,
    description: 'Commission rate as percentage (0-100)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @ApiProperty({ required: false, description: 'Base salary amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseSalary?: number;

  @ApiProperty({
    required: false,
    enum: ['COMMISSION_ONLY', 'SALARY_ONLY', 'SALARY_PLUS_COMMISSION'],
    description: 'Salary type',
  })
  @IsOptional()
  @IsString()
  salaryType?: 'COMMISSION_ONLY' | 'SALARY_ONLY' | 'SALARY_PLUS_COMMISSION';

  @ApiProperty({
    required: false,
    enum: ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'],
    description: 'Pay frequency',
  })
  @IsOptional()
  @IsString()
  payFrequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

  @ApiProperty({
    required: false,
    description: 'Hourly rate for hourly employees',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiProperty({
    required: false,
    default: 1.5,
    description: 'Overtime rate multiplier',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  overtimeRate?: number;

  @ApiProperty({
    required: false,
    enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT'],
    description: 'Employment type',
  })
  @IsOptional()
  @IsString()
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
}
