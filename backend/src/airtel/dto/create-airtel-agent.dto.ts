import { IsUUID, IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AirtelAgentType } from '../entities/airtel-agent.entity';

export class CreateAirtelAgentDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  salonId?: string;

  @ApiProperty({ enum: AirtelAgentType })
  @IsEnum(AirtelAgentType)
  agentType: AirtelAgentType;

  @ApiProperty()
  @IsString()
  phoneNumber: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  agentLiteId?: string;
}

