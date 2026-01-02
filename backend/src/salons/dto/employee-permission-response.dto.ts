import { ApiProperty } from '@nestjs/swagger';
import { EmployeePermission } from '../../common/enums/employee-permission.enum';

export class EmployeePermissionResponseDto {
  @ApiProperty({ description: 'Permission record ID' })
  id: string;

  @ApiProperty({ description: 'Salon employee ID' })
  salonEmployeeId: string;

  @ApiProperty({ description: 'Salon ID' })
  salonId: string;

  @ApiProperty({
    description: 'Permission code',
    enum: EmployeePermission,
  })
  permissionCode: EmployeePermission;

  @ApiProperty({ description: 'User ID who granted the permission' })
  grantedBy: string;

  @ApiProperty({ description: 'Date when permission was granted' })
  grantedAt: Date;

  @ApiProperty({
    description: 'Date when permission was revoked',
    nullable: true,
    required: false,
  })
  revokedAt: Date | null;

  @ApiProperty({
    description: 'User ID who revoked the permission',
    nullable: true,
    required: false,
  })
  revokedBy: string | null;

  @ApiProperty({ description: 'Whether the permission is currently active' })
  isActive: boolean;

  @ApiProperty({ description: 'Metadata stored with the permission' })
  metadata: Record<string, any>;

  @ApiProperty({
    description: 'Notes about the permission',
    nullable: true,
    required: false,
  })
  notes: string | null;

  @ApiProperty({ description: 'Date when record was created' })
  createdAt: Date;

  @ApiProperty({ description: 'Date when record was last updated' })
  updatedAt: Date;
}
