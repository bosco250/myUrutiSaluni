import { IsNotEmpty, IsPhoneNumber, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateMembershipPaymentDto {
  @ApiProperty({
    description: 'Phone number for Mobile Money payment',
    example: '0781234567',
  })
  @IsNotEmpty()
  @IsPhoneNumber('RW')
  phoneNumber: string;

  @ApiProperty({
    description: 'Amount to pay (1500 or 3000 RWF)',
    example: 3000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1500)
  amount: number;
}
