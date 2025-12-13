import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationType } from '../entities/conversation.entity';

export class CreateConversationDto {
  @ApiProperty({ description: 'Employee ID (required for customer-employee chat)' })
  @IsString()
  @IsOptional()
  employeeId?: string;

  @ApiProperty({ description: 'Salon ID (required for customer-salon chat)' })
  @IsString()
  @IsOptional()
  salonId?: string;

  @ApiPropertyOptional({ description: 'Appointment ID (optional, links conversation to appointment)' })
  @IsString()
  @IsOptional()
  appointmentId?: string;

  @ApiPropertyOptional({ enum: ConversationType, default: ConversationType.CUSTOMER_EMPLOYEE })
  @IsEnum(ConversationType)
  @IsOptional()
  type?: ConversationType;
}

