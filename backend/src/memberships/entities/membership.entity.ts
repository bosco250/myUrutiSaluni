import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Salon } from '../../salons/entities/salon.entity';

export enum MembershipStatus {
  NEW = 'new',
  ACTIVE = 'active',
  PENDING_RENEWAL = 'pending_renewal',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
}

@Entity('memberships')
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Salon, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Index()
  @Column({ name: 'salon_id' })
  salonId: string;

  @Column({ length: 64, nullable: true })
  category: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 32,
    default: MembershipStatus.NEW,
  })
  status: MembershipStatus;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @Column({ name: 'membership_number', unique: true, length: 128, nullable: true })
  membershipNumber: string;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

