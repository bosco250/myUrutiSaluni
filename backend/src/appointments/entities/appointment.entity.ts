import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Salon } from '../../salons/entities/salon.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Service } from '../../services/entities/service.entity';
import { User } from '../../users/entities/user.entity';
import { SalonEmployee } from '../../salons/entities/salon-employee.entity';

export enum AppointmentStatus {
  PENDING = 'pending',
  BOOKED = 'booked',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Salon, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Index()
  @Column({ name: 'salon_id' })
  salonId: string;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id', nullable: true })
  customerId: string;

  @ManyToOne(() => Service, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @Column({ name: 'service_id', nullable: true })
  serviceId: string;

  @Index()
  @Column({ name: 'scheduled_start', type: 'timestamp' })
  scheduledStart: Date;

  @Column({ name: 'scheduled_end', type: 'timestamp' })
  scheduledEnd: Date;

  @Column({
    type: 'varchar',
    length: 32,
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @ManyToOne(() => SalonEmployee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'salon_employee_id' })
  salonEmployee: SalonEmployee;

  @Index()
  @Column({ name: 'salon_employee_id', nullable: true })
  salonEmployeeId: string;

  @Column({
    name: 'service_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  serviceAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'reminder_sent', default: false })
  reminderSent: boolean;

  @Column({ name: 'reminder_sent_at', type: 'timestamp', nullable: true })
  reminderSentAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
