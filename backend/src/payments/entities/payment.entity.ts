import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  MTN_MOMO = 'mtn_momo',
  AIRTEL_MONEY = 'airtel_money',
  WALLET = 'wallet',
  CASH = 'cash',
  CARD = 'card',
}

export enum PaymentType {
  APPOINTMENT = 'appointment',
  WALLET_TOPUP = 'wallet_topup',
  PRODUCT_PURCHASE = 'product_purchase',
  TIP = 'tip',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'RWF' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentType })
  type: PaymentType;

  @Column({ name: 'external_reference', nullable: true })
  externalReference?: string;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber?: string;

  @ManyToOne(() => Customer, { eager: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Appointment, { nullable: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment?: Appointment;

  @Column({ name: 'appointment_id', nullable: true })
  appointmentId?: string;

  @Column({ name: 'salon_id', nullable: true })
  salonId?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true, name: 'failure_reason' })
  failureReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'completed_at', nullable: true })
  completedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
