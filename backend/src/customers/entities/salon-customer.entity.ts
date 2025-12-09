import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Salon } from '../../salons/entities/salon.entity';
import { Customer } from './customer.entity';

@Entity('salon_customers')
@Unique(['salonId', 'customerId'])
export class SalonCustomer {
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

  // Visit tracking
  @Column({ name: 'visit_count', type: 'integer', default: 0 })
  visitCount: number;

  @Column({ name: 'last_visit_date', type: 'timestamp', nullable: true })
  lastVisitDate: Date | null;

  @Column({ name: 'first_visit_date', type: 'timestamp', nullable: true })
  firstVisitDate: Date | null;

  // Customer lifetime value for this salon
  @Column({
    name: 'total_spent',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  totalSpent: number;

  // Segmentation
  @Column({ type: 'simple-array', nullable: true })
  tags: string[]; // e.g., ['VIP', 'Regular', 'New']

  @Column({ type: 'text', nullable: true })
  notes: string; // Salon-specific notes about the customer

  // Salon-specific preferences
  @Column({ type: 'simple-json', default: '{}' })
  preferences: Record<string, any>; // e.g., { preferredEmployeeId: '...', allergies: '...' }

  // CRM features
  @Column({ name: 'birthday', type: 'date', nullable: true })
  birthday: Date | null;

  @Column({ name: 'anniversary_date', type: 'date', nullable: true })
  anniversaryDate: Date | null; // First visit anniversary

  @Column({ name: 'follow_up_date', type: 'timestamp', nullable: true })
  followUpDate: Date | null;

  @Column({
    name: 'communication_preferences',
    type: 'simple-json',
    default: '{}',
  })
  communicationPreferences: Record<string, any>; // e.g., { sms: true, email: false }

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
