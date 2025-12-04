import { IsString, IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MembershipStatus } from '../entities/membership.entity';

export class CreateMembershipDto {
  @ApiProperty()
  @IsUUID()
  salonId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ enum: MembershipStatus, default: MembershipStatus.NEW })
  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  membershipNumber?: string;
}

