import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeePermission } from '../../common/enums/employee-permission.enum';

export class RevokeEmployeePermissionDto {
  @ApiProperty({
    description: 'List of permissions to revoke from the employee',
    enum: EmployeePermission,
    isArray: true,
    example: [EmployeePermission.MANAGE_APPOINTMENTS],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one permission must be specified' })
  @IsEnum(EmployeePermission, { each: true })
  permissions: EmployeePermission[];

  @ApiPropertyOptional({
    description: 'Optional reason for revoking the permissions',
    example: 'Employee no longer needs these permissions',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
