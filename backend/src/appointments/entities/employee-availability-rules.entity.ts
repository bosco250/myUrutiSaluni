import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SalonEmployee } from '../../salons/entities/salon-employee.entity';

@Entity('employee_availability_rules')
export class EmployeeAvailabilityRules {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  employeeId: string;

  @ManyToOne(() => SalonEmployee)
  @JoinColumn({ name: 'employeeId' })
  employee: SalonEmployee;

  @Column({ nullable: true })
  advanceBookingDays: number; // Days in advance bookings are allowed

  @Column({ nullable: true })
  minLeadTimeHours: number; // Minimum hours before booking

  @Column({ nullable: true })
  maxBookingsPerDay: number;

  @Column({ nullable: true })
  bufferMinutes: number; // Buffer time between appointments

  @Column({ type: 'simple-json', nullable: true })
  blackoutDates: string[]; // Dates when employee is unavailable
}
