import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ASSOCIATION_ADMIN = 'association_admin',
  DISTRICT_LEADER = 'district_leader',
  SALON_OWNER = 'salon_owner',
  SALON_EMPLOYEE = 'salon_employee',
  CUSTOMER = 'customer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Index()
  @Column({ nullable: true, length: 32 })
  phone: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({
    type: 'varchar',
    length: 32,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Index()
  @Column({
    name: 'membership_number',
    unique: true,
    nullable: true,
    length: 128,
  })
  membershipNumber: string;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
