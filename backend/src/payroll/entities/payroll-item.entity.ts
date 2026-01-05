import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PayrollRun } from './payroll-run.entity';
import { SalonEmployee } from '../../salons/entities/salon-employee.entity';

@Entity('payroll_items')
export class PayrollItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PayrollRun, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payroll_run_id' })
  payrollRun: PayrollRun;

  @Index()
  @Column({ name: 'payroll_run_id' })
  payrollRunId: string;

  @ManyToOne(() => SalonEmployee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_employee_id' })
  salonEmployee: SalonEmployee;

  @Index()
  @Column({ name: 'salon_employee_id' })
  salonEmployeeId: string;

  @Column({
    name: 'base_salary',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  baseSalary: number;

  @Column({
    name: 'commission_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  commissionAmount: number;

  @Column({
    name: 'overtime_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  overtimeAmount: number;

  @Column({ name: 'gross_pay', type: 'decimal', precision: 14, scale: 2 })
  grossPay: number;

  @Column({
    name: 'deductions',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  deductions: number;

  @Column({ name: 'net_pay', type: 'decimal', precision: 14, scale: 2 })
  netPay: number;

  @Column({ default: false })
  paid: boolean;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date;

  @Column({ name: 'paid_by', nullable: true })
  paidById: string;

  @Column({ name: 'payment_method', length: 32, nullable: true })
  paymentMethod: string;

  @Column({ name: 'payment_reference', length: 255, nullable: true })
  paymentReference: string;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
