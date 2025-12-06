import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { Salon } from '../../salons/entities/salon.entity';
import { PayrollItem } from './payroll-item.entity';

export enum PayrollStatus {
  DRAFT = 'draft',
  PROCESSED = 'processed',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('payroll_runs')
export class PayrollRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Salon, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Index()
  @Column({ name: 'salon_id' })
  salonId: string;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: Date;

  @Column({ name: 'total_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalAmount: number;

  @Column({
    type: 'varchar',
    length: 32,
    default: PayrollStatus.DRAFT,
  })
  status: PayrollStatus;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date;

  @Column({ name: 'processed_by', nullable: true })
  processedById: string;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @OneToMany(() => PayrollItem, (item) => item.payrollRun, { cascade: true })
  items: PayrollItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

