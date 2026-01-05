import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../entities/membership-payment.entity';

export class CreateMembershipPaymentDto {
  @ApiProperty()
  @IsUUID()
  memberId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  membershipId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(2020)
  paymentYear: number;

  @ApiProperty({
    description: 'Installment number (1 or 2)',
    minimum: 1,
    maximum: 2,
  })
  @IsNumber()
  @Min(1)
  installmentNumber: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordPaymentDto {
  @ApiProperty()
  @IsUUID()
  paymentId: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transactionReference?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
