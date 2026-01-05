import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SalonEmployee } from './salon-employee.entity';
import { Salon } from './salon.entity';
import { User } from '../../users/entities/user.entity';
import { EmployeePermission } from '../../common/enums/employee-permission.enum';

/**
 * Employee Permission Entity
 *
 * Stores granular permissions granted to salon employees by salon owners.
 * Each permission is salon-specific and can be granted/revoked independently.
 */
@Entity('employee_permissions')
@Index(['salonEmployeeId', 'permissionCode', 'isActive'], {
  unique: true,
  where: 'is_active = true',
})
export class EmployeePermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SalonEmployee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_employee_id' })
  salonEmployee: SalonEmployee;

  @Index()
  @Column({ name: 'salon_employee_id' })
  salonEmployeeId: string;

  @ManyToOne(() => Salon, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Index()
  @Column({ name: 'salon_id' })
  salonId: string;

  @Column({
    name: 'permission_code',
    type: 'varchar',
    length: 64,
  })
  permissionCode: EmployeePermission;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'granted_by' })
  grantedByUser: User;

  @Index()
  @Column({ name: 'granted_by' })
  grantedBy: string;

  @Column({
    name: 'granted_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  grantedAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'revoked_by' })
  revokedByUser: User | null;

  @Column({ name: 'revoked_by', nullable: true })
  revokedBy: string | null;

  @Index()
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
