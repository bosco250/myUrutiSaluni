import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('membership_applications')
export class MembershipApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'applicant_id' })
  applicant: User;

  @Column({ name: 'applicant_id' })
  @Index()
  applicantId: string;

  @Column({ type: 'text', nullable: true })
  businessName: string;

  @Column({ type: 'text', nullable: true })
  businessAddress: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  district: string;

  @Column({ length: 32, nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  businessDescription: string;

  @Column({ name: 'registration_number', length: 128, nullable: true })
  registrationNumber: string;

  @Column({ name: 'tax_id', length: 128, nullable: true })
  taxId: string;

  @Column({
    type: 'varchar',
    length: 32,
    default: ApplicationStatus.PENDING,
  })
  @Index()
  status: ApplicationStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: User;

  @Column({ name: 'reviewed_by_id', nullable: true })
  reviewedById: string;

  @Column({ name: 'reviewed_at', type: 'datetime', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

