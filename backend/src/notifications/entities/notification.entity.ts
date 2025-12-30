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
  // Appointment events
  APPOINTMENT_BOOKED = 'appointment_booked',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  APPOINTMENT_CONFIRMED = 'appointment_confirmed',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  APPOINTMENT_RESCHEDULED = 'appointment_rescheduled',
  APPOINTMENT_COMPLETED = 'appointment_completed',
  APPOINTMENT_NO_SHOW = 'appointment_no_show',
  // Sales events
  SALE_COMPLETED = 'sale_completed',
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_FAILED = 'payment_failed',
  // Commission events
  COMMISSION_EARNED = 'commission_earned',
  COMMISSION_PAID = 'commission_paid',
  COMMISSION_UPDATED = 'commission_updated',
  // Loyalty events
  POINTS_EARNED = 'points_earned',
  POINTS_REDEEMED = 'points_redeemed',
  REWARD_AVAILABLE = 'reward_available',
  VIP_STATUS_ACHIEVED = 'vip_status_achieved',
  // Inventory events
  LOW_STOCK_ALERT = 'low_stock_alert',
  OUT_OF_STOCK = 'out_of_stock',
  STOCK_REPLENISHED = 'stock_replenished',
  // System events
  SALON_UPDATE = 'salon_update',
  EMPLOYEE_ASSIGNED = 'employee_assigned',
  MEMBERSHIP_STATUS = 'membership_status',
  SYSTEM_ALERT = 'system_alert',
  SECURITY_ALERT = 'security_alert',
  // Review events
  REVIEW = 'review',
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

  // In-app specific fields
  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date;

  @Column({ name: 'action_url', nullable: true })
  actionUrl?: string; // Link to relevant page (e.g., /appointments/123)

  @Column({ name: 'action_label', nullable: true })
  actionLabel?: string; // "View Appointment", "View Sale", etc.

  @Column({ type: 'varchar', length: 32, nullable: true })
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon?: string; // Icon name for UI

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
