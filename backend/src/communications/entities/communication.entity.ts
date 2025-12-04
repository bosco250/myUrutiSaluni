import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Sale } from '../../sales/entities/sale.entity';

export enum CommunicationType {
  CALL = 'call',
  EMAIL = 'email',
  SMS = 'sms',
  IN_PERSON = 'in_person',
  NOTE = 'note',
  FOLLOW_UP = 'follow_up',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  MARKETING = 'marketing',
}

export enum CommunicationDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum CommunicationStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SCHEDULED = 'scheduled',
}

@Entity('communications')
export class Communication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Index()
  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @ManyToOne(() => Appointment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appointment_id' })
  appointment?: Appointment;

  @Column({ name: 'appointment_id', nullable: true })
  appointmentId?: string;

  @ManyToOne(() => Sale, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sale_id' })
  sale?: Sale;

  @Column({ name: 'sale_id', nullable: true })
  saleId?: string;

  @Column({
    type: 'enum',
    enum: CommunicationType,
  })
  type: CommunicationType;

  @Column({
    type: 'enum',
    enum: CommunicationDirection,
    default: CommunicationDirection.OUTBOUND,
  })
  direction: CommunicationDirection;

  @Column({
    type: 'enum',
    enum: CommunicationStatus,
    default: CommunicationStatus.COMPLETED,
  })
  status: CommunicationStatus;

  @Column({ length: 255 })
  subject: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ name: 'duration_minutes', type: 'integer', nullable: true })
  durationMinutes?: number;

  @Column({ name: 'scheduled_for', type: 'timestamptz', nullable: true })
  scheduledFor?: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Column({ name: 'follow_up_required', default: false })
  followUpRequired: boolean;

  @Column({ name: 'follow_up_date', type: 'date', nullable: true })
  followUpDate?: Date;

  @Column({ name: 'follow_up_completed', default: false })
  followUpCompleted: boolean;

  @Column({ name: 'sentiment', length: 32, nullable: true })
  sentiment?: string; // positive, neutral, negative

  @Column({ name: 'outcome', length: 255, nullable: true })
  outcome?: string; // appointment_booked, sale_made, issue_resolved, etc.

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

