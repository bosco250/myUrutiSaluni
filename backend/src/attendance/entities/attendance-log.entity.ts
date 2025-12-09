import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SalonEmployee } from '../../salons/entities/salon-employee.entity';

export enum AttendanceType {
  CLOCK_IN = 'clock_in',
  CLOCK_OUT = 'clock_out',
}

@Entity('attendance_logs')
export class AttendanceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SalonEmployee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_employee_id' })
  salonEmployee: SalonEmployee;

  @Index()
  @Column({ name: 'salon_employee_id' })
  salonEmployeeId: string;

  @Column({
    type: 'varchar',
    length: 32,
  })
  type: AttendanceType;

  @Index()
  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt: Date;

  @Column({ length: 64, nullable: true })
  source: string;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;
}
