import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LoanProductType } from '../entities/loan-product.entity';

export class CreateLoanProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty({ enum: LoanProductType, required: false })
  @IsOptional()
  @IsEnum(LoanProductType)
  productType?: LoanProductType;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  minAmount: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  maxAmount: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  interestRate: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  minTermMonths: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  maxTermMonths: number;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresGuarantor?: boolean;
}
