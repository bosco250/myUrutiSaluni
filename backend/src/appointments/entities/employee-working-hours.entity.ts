import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SalonEmployee } from '../../salons/entities/salon-employee.entity';

@Entity('employee_working_hours')
export class EmployeeWorkingHours {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  employeeId: string;

  @ManyToOne(() => SalonEmployee)
  @JoinColumn({ name: 'employeeId' })
  employee: SalonEmployee;

  @Column()
  dayOfWeek: number; // 0-6 (Sunday-Saturday)

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ type: 'simple-json', nullable: true })
  breaks: Array<{ startTime: string; endTime: string }>;

  @Column({ default: true })
  isActive: boolean;
}
