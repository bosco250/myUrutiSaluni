import {
  IsUUID,
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InvoiceStatus } from '../entities/invoice.entity';

export class CreateInvoiceItemDto {
  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;
}

export class CreateInvoiceDto {
  @ApiProperty()
  @IsUUID()
  salonId: string;

  @ApiProperty()
  @IsString()
  invoiceNumber: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty()
  @IsDateString()
  issueDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({
    enum: InvoiceStatus,
    required: false,
    default: InvoiceStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}
