import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsEnum,
  IsString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../entities/sale.entity';

export class CreateSaleItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  salonEmployeeId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}

export class CreateSaleDto {
  @ApiProperty()
  @IsUUID()
  salonId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ enum: PaymentMethod, required: false })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiProperty({ type: [CreateSaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}
