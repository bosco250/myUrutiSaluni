import { IsString, IsEnum, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '../entities/chart-of-account.entity';

export class CreateAccountDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: AccountType })
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

