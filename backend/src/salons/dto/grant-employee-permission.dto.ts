import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsObject,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeePermission } from '../../common/enums/employee-permission.enum';

export class GrantEmployeePermissionDto {
  @ApiProperty({
    description: 'List of permissions to grant to the employee',
    enum: EmployeePermission,
    isArray: true,
    example: [
      EmployeePermission.MANAGE_APPOINTMENTS,
      EmployeePermission.ASSIGN_APPOINTMENTS,
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one permission must be specified' })
  @IsEnum(EmployeePermission, { each: true })
  permissions: EmployeePermission[];

  @ApiPropertyOptional({
    description: 'Optional notes about why these permissions are being granted',
    example: 'Granted for managing appointments during owner absence',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Optional metadata to store with the permission',
    example: { reason: 'temporary_access', expiresAt: '2024-12-31' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
