import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Loan } from './loan.entity';

@Entity('loan_repayments')
export class LoanRepayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Loan, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loan_id' })
  loan: Loan;

  @Index()
  @Column({ name: 'loan_id' })
  loanId: string;

  @Column({ name: 'repayment_number' })
  repaymentNumber: number;

  @Index()
  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Column({ name: 'principal_amount', type: 'decimal', precision: 14, scale: 2 })
  principalAmount: number;

  @Column({ name: 'interest_amount', type: 'decimal', precision: 14, scale: 2 })
  interestAmount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 14, scale: 2 })
  totalAmount: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ name: 'paid_date', type: 'date', nullable: true })
  paidDate: Date;

  @Column({ name: 'payment_method', length: 32, nullable: true })
  paymentMethod: string;

  @Column({ name: 'payment_reference', length: 255, nullable: true })
  paymentReference: string;

  @Column({ name: 'is_overdue', default: false })
  isOverdue: boolean;

  @Column({ name: 'late_fee', type: 'decimal', precision: 14, scale: 2, default: 0 })
  lateFee: number;

  @Column({ length: 32, default: 'pending' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

