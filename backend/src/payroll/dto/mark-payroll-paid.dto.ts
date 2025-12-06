import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkPayrollPaidDto {
  @ApiProperty({ description: 'Payment method' })
  @IsString()
  paymentMethod: string;

  @ApiProperty({ description: 'Payment reference/transaction ID', required: false })
  @IsOptional()
  @IsString()
  paymentReference?: string;
}

