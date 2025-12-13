import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaymentMethod, PaymentType } from '../entities/payment.entity';

export class InitiatePaymentDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsEnum(PaymentType)
  type: PaymentType;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsUUID()
  @IsOptional()
  appointmentId?: string;

  @IsUUID()
  @IsOptional()
  salonId?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class ConfirmPaymentDto {
  @IsUUID()
  paymentId: string;

  @IsString()
  @IsOptional()
  otp?: string;
}
