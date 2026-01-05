import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    required: false,
    enum: [
      'super_admin',
      'association_admin',
      'district_leader',
      'salon_owner',
      'salon_employee',
      'customer',
    ],
  })
  @IsOptional()
  @IsEnum([
    'super_admin',
    'association_admin',
    'district_leader',
    'salon_owner',
    'salon_employee',
    'customer',
  ])
  role?: string;
}
