import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class SearchUsersDto {
  @ApiPropertyOptional({ description: 'Search query (name, email, phone)' })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiPropertyOptional({ enum: UserRole, description: 'Filter by user role' })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

