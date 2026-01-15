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

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
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

  // Avatar/Profile Photo URL
  @Column({ name: 'avatar_url', nullable: true, length: 500 })
  avatarUrl: string;

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

  // ============ PERSONAL DETAILS ============

  // Date of Birth (stored as YYYY-MM-DD string)
  @Column({
    name: 'date_of_birth',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  dateOfBirth: string;

  // Gender (stored as string: male, female, other)
  @Column({
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  gender: string;

  // Marital Status (stored as string: single, married, divorced, widowed)
  @Column({
    name: 'marital_status',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  maritalStatus: string;

  // Nationality
  @Column({ nullable: true, length: 64 })
  nationality: string;

  // National ID (for contracts)
  @Column({ name: 'national_id', nullable: true, length: 32 })
  nationalId: string;

  // ============ ADDRESS ============

  @Column({ nullable: true, length: 255 })
  address: string;

  @Column({ nullable: true, length: 64 })
  city: string;

  @Column({ nullable: true, length: 64 })
  district: string;

  @Column({ nullable: true, length: 64 })
  sector: string;

  @Column({ nullable: true, length: 64 })
  cell: string;

  // ============ EMERGENCY CONTACT ============

  @Column({ name: 'emergency_contact_name', nullable: true, length: 128 })
  emergencyContactName: string;

  @Column({ name: 'emergency_contact_phone', nullable: true, length: 32 })
  emergencyContactPhone: string;

  @Column({
    name: 'emergency_contact_relationship',
    nullable: true,
    length: 64,
  })
  emergencyContactRelationship: string;

  // ============ PROFESSIONAL ============

  // Bio/About
  @Column({ type: 'text', nullable: true })
  bio: string;

  // Years of experience
  @Column({ name: 'years_of_experience', type: 'int', nullable: true })
  yearsOfExperience: number;

  // Skills/Specializations (comma-separated or JSON)
  @Column({ type: 'simple-json', nullable: true })
  skills: string[];

  // ============ BANKING (for salary/contracts) ============

  @Column({ name: 'bank_name', nullable: true, length: 128 })
  bankName: string;

  @Column({ name: 'bank_account_number', nullable: true, length: 64 })
  bankAccountNumber: string;

  @Column({ name: 'bank_account_name', nullable: true, length: 128 })
  bankAccountName: string;

  // Mobile Money
  @Column({ name: 'momo_number', nullable: true, length: 32 })
  momoNumber: string;

  // ============ SYSTEM ============

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  // Password Reset
  @Column({ name: 'reset_password_token', nullable: true, length: 255 })
  resetPasswordToken: string;

  @Column({ name: 'reset_password_expires', type: 'timestamp', nullable: true })
  resetPasswordExpires: Date;

  @Column({ name: 'expo_push_token', nullable: true, length: 255 })
  expoPushToken: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Profile completion percentage
  @Column({ name: 'profile_completion', type: 'int', default: 0 })
  profileCompletion: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
