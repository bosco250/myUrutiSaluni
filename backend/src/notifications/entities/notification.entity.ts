import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationType {
  APPOINTMENT_REMINDER = 'appointment_reminder',
  APPOINTMENT_CONFIRMED = 'appointment_confirmed',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  APPOINTMENT_RESCHEDULED = 'appointment_rescheduled',
  PAYMENT_RECEIVED = 'payment_received',
  SALON_UPDATE = 'salon_update',
  PROMOTION = 'promotion',
  SYSTEM = 'system',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  DELIVERED = 'delivered',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ name: 'customer_id', nullable: true })
  customerId?: string;

  @ManyToOne(() => Appointment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appointment_id' })
  appointment?: Appointment;

  @Column({ name: 'appointment_id', nullable: true })
  appointmentId?: string;

  @Column({
    type: 'varchar',
    length: 32,
  })
  channel: NotificationChannel;

  @Column({
    type: 'varchar',
    length: 32,
  })
  type: NotificationType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({
    type: 'varchar',
    length: 32,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ name: 'recipient_email', nullable: true })
  recipientEmail?: string;

  @Column({ name: 'recipient_phone', nullable: true })
  recipientPhone?: string;

  @Column({ name: 'scheduled_for', type: 'timestamp', nullable: true })
  scheduledFor?: Date;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
