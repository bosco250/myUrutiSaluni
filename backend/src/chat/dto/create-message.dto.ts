import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../entities/message.entity';

export class CreateMessageDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ enum: MessageType, default: MessageType.TEXT })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

