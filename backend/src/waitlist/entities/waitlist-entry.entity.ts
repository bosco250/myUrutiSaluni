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
import { Salon } from '../../salons/entities/salon.entity';
import { Service } from '../../services/entities/service.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

export enum WaitlistStatus {
  PENDING = 'pending',
  CONTACTED = 'contacted',
  BOOKED = 'booked',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('waitlist_entries')
export class WaitlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Index()
  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Salon, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Index()
  @Column({ name: 'salon_id' })
  salonId: string;

  @ManyToOne(() => Service, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'service_id' })
  service?: Service;

  @Column({ name: 'service_id', nullable: true })
  serviceId?: string;

  @ManyToOne(() => Appointment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appointment_id' })
  appointment?: Appointment;

  @Column({ name: 'appointment_id', nullable: true })
  appointmentId?: string;

  @Column({
    type: 'enum',
    enum: WaitlistStatus,
    default: WaitlistStatus.PENDING,
  })
  status: WaitlistStatus;

  @Column({ name: 'preferred_date', type: 'date', nullable: true })
  preferredDate?: Date;

  @Column({ name: 'preferred_time_start', type: 'time', nullable: true })
  preferredTimeStart?: string;

  @Column({ name: 'preferred_time_end', type: 'time', nullable: true })
  preferredTimeEnd?: string;

  @Column({ name: 'flexible', default: true })
  flexible: boolean;

  @Column({ name: 'priority', type: 'integer', default: 0 })
  priority: number;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'contacted_at', type: 'timestamptz', nullable: true })
  contactedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

