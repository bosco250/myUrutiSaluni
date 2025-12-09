import {
  IsUUID,
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LoanStatus } from '../entities/loan.entity';

export class CreateLoanDto {
  @ApiProperty()
  @IsString()
  loanNumber: string;

  @ApiProperty()
  @IsUUID()
  loanProductId: string;

  @ApiProperty()
  @IsUUID()
  applicantId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  principalAmount: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  interestRate: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  termMonths: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  monthlyPayment: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalAmountDue: number;

  @ApiProperty({ enum: LoanStatus, required: false, default: LoanStatus.DRAFT })
  @IsOptional()
  @IsEnum(LoanStatus)
  status?: LoanStatus;

  @ApiProperty()
  @IsDateString()
  applicationDate: string;
}
