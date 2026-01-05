import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Salon } from '../../salons/entities/salon.entity';
import { Customer } from './customer.entity';
import { User } from '../../users/entities/user.entity';

export enum CommunicationType {
  SMS = 'sms',
  EMAIL = 'email',
  PHONE = 'phone',
  IN_APP = 'in_app',
}

export enum CommunicationPurpose {
  APPOINTMENT_REMINDER = 'appointment_reminder',
  APPOINTMENT_CONFIRMATION = 'appointment_confirmation',
  APPOINTMENT_CANCELLATION = 'appointment_cancellation',
  MARKETING = 'marketing',
  FOLLOW_UP = 'follow_up',
  BIRTHDAY = 'birthday',
  ANNIVERSARY = 'anniversary',
  OTHER = 'other',
}

@Entity('customer_communications')
export class CustomerCommunication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Salon, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Index()
  @Column({ name: 'salon_id' })
  salonId: string;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Index()
  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sent_by' })
  sentBy: User;

  @Column({ name: 'sent_by', nullable: true })
  sentById: string;

  @Column({
    type: 'enum',
    enum: CommunicationType,
  })
  type: CommunicationType;

  @Column({
    type: 'enum',
    enum: CommunicationPurpose,
    default: CommunicationPurpose.OTHER,
  })
  purpose: CommunicationPurpose;

  @Column({ type: 'text' })
  subject: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  recipient: string; // Phone number or email

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string; // pending, sent, delivered, failed

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>; // Provider response, error details, etc.

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
