import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsIn,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExpenseDto {
  @ApiProperty({ description: 'Salon ID' })
  @IsUUID()
  salonId: string;

  @ApiProperty({ description: 'Expense amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Description of the expense' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({ description: 'Date of expense (YYYY-MM-DD)' })
  @IsString()
  expenseDate: string;

  @ApiPropertyOptional({ description: 'Category account ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Payment method' })
  @IsOptional()
  @IsIn(['cash', 'bank_transfer', 'mobile_money', 'card', 'other'])
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Vendor or supplier name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendorName?: string;

  @ApiPropertyOptional({ description: 'Receipt image URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptUrl?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}
