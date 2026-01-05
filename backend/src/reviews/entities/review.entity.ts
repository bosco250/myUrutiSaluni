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
import { Salon } from '../../salons/entities/salon.entity';
import { SalonEmployee } from '../../salons/entities/salon-employee.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

export interface ReviewAspects {
  service: number; // 1-5
  punctuality: number; // 1-5
  cleanliness: number; // 1-5
  value: number; // 1-5
}

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Customer, { eager: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Salon, { eager: true })
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Column({ name: 'salon_id' })
  salonId: string;

  @ManyToOne(() => SalonEmployee, { nullable: true, eager: true })
  @JoinColumn({ name: 'employee_id' })
  employee?: SalonEmployee;

  @Column({ name: 'employee_id', nullable: true })
  employeeId?: string;

  @ManyToOne(() => Appointment, { nullable: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment?: Appointment;

  @Column({ name: 'appointment_id', nullable: true })
  appointmentId?: string;

  @Column({ type: 'int' })
  rating: number; // 1-5 stars overall

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({ type: 'jsonb', nullable: true })
  aspects?: ReviewAspects;

  @Column({ default: true, name: 'is_published' })
  isPublished: boolean;

  @Column({ default: false, name: 'is_verified' })
  isVerified: boolean; // True if from a completed appointment

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
