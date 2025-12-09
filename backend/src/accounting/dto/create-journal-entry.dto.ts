import {
  IsUUID,
  IsString,
  IsDateString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { JournalEntryStatus } from '../entities/journal-entry.entity';

export class CreateJournalEntryLineDto {
  @ApiProperty()
  @IsUUID()
  accountId: string;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsString()
  debitAmount?: string;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsString()
  creditAmount?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  referenceId?: string;
}

export class CreateJournalEntryDto {
  @ApiProperty()
  @IsUUID()
  salonId: string;

  @ApiProperty()
  @IsString()
  entryNumber: string;

  @ApiProperty()
  @IsDateString()
  entryDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: JournalEntryStatus,
    required: false,
    default: JournalEntryStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(JournalEntryStatus)
  status?: JournalEntryStatus;

  @ApiProperty({ type: [CreateJournalEntryLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJournalEntryLineDto)
  lines: CreateJournalEntryLineDto[];
}
