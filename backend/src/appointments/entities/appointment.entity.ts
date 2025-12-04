import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Salon } from '../../salons/entities/salon.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Service } from '../../services/entities/service.entity';
import { User } from '../../users/entities/user.entity';

export enum AppointmentStatus {
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
  @Column({ name: 'scheduled_start', type: 'datetime' })
  scheduledStart: Date;

  @Column({ name: 'scheduled_end', type: 'datetime' })
  scheduledEnd: Date;

  @Column({
    type: 'varchar',
    length: 32,
    default: AppointmentStatus.BOOKED,
  })
  status: AppointmentStatus;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

