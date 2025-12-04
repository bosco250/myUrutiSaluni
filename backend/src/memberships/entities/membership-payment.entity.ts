import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Membership } from './membership.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CASH = 'cash',
  MOBILE_MONEY = 'mobile_money',
  BANK_TRANSFER = 'bank_transfer',
  CARD = 'card',
}

@Entity('membership_payments')
export class MembershipPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: User;

  @Index()
  @Column({ name: 'member_id' })
  memberId: string;

  @ManyToOne(() => Membership, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'membership_id' })
  membership: Membership;

  @Index()
  @Column({ name: 'membership_id', nullable: true })
  membershipId: string;

  @Column({ name: 'payment_year', type: 'int' })
  paymentYear: number;

  @Column({ name: 'installment_number', type: 'int' })
  installmentNumber: number; // 1 or 2

  @Column({ name: 'total_amount', type: 'decimal', precision: 14, scale: 2 })
  totalAmount: number; // 3000 RWF per year

  @Column({ name: 'installment_amount', type: 'decimal', precision: 14, scale: 2 })
  installmentAmount: number; // 1500 RWF per installment

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Column({
    type: 'varchar',
    length: 32,
    default: PaymentStatus.PENDING,
  })
  @Index()
  status: PaymentStatus;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ name: 'paid_date', type: 'date', nullable: true })
  paidDate: Date;

  @Column({ name: 'payment_method', length: 32, nullable: true })
  paymentMethod: PaymentMethod;

  @Column({ name: 'payment_reference', length: 255, nullable: true })
  paymentReference: string;

  @Column({ name: 'transaction_reference', length: 255, nullable: true })
  transactionReference: string;

  @Column({ name: 'paid_by_id', nullable: true })
  paidById: string; // User who recorded the payment (admin)

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'paid_by_id' })
  paidBy: User;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

