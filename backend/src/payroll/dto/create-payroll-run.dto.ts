import { IsDateString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePayrollRunDto {
  @ApiProperty({ description: 'Salon ID' })
  @IsUUID()
  salonId: string;

  @ApiProperty({ description: 'Period start date (ISO date string)' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: 'Period end date (ISO date string)' })
  @IsDateString()
  periodEnd: string;
}
