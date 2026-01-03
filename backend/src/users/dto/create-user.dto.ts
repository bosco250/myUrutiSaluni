import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  passwordHash?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ enum: UserRole, default: UserRole.CUSTOMER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  membershipNumber?: string;

  // ============ PERSONAL DETAILS ============

  @ApiProperty({
    required: false,
    description: 'Date of birth in YYYY-MM-DD format',
  })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiProperty({ required: false, description: 'Gender: male, female, other' })
  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'other', 'Male', 'Female', 'Other', ''])
  gender?: string;

  @ApiProperty({
    required: false,
    description: 'Marital status: single, married, divorced, widowed',
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'single',
    'married',
    'divorced',
    'widowed',
    'Single',
    'Married',
    'Divorced',
    'Widowed',
    '',
  ])
  maritalStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiProperty({ required: false, description: 'National ID number' })
  @IsOptional()
  @IsString()
  nationalId?: string;

  // ============ ADDRESS ============

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cell?: string;

  // ============ EMERGENCY CONTACT ============

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emergencyContactRelationship?: string;

  // ============ PROFESSIONAL ============

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  yearsOfExperience?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  // ============ BANKING ============

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @ApiProperty({ required: false, description: 'Mobile Money number' })
  @IsOptional()
  @IsString()
  momoNumber?: string;

  // ============ SYSTEM ============

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
