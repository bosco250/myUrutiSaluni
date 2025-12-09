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
import { LoanProduct } from './loan-product.entity';
import { User } from '../../users/entities/user.entity';
import { Salon } from '../../salons/entities/salon.entity';

export enum LoanStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  DISBURSED = 'disbursed',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DEFAULTED = 'defaulted',
  CANCELLED = 'cancelled',
}

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'loan_number', unique: true, length: 64 })
  loanNumber: string;

  @ManyToOne(() => LoanProduct, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'loan_product_id' })
  loanProduct: LoanProduct;

  @Column({ name: 'loan_product_id' })
  loanProductId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'applicant_id' })
  applicant: User;

  @Index()
  @Column({ name: 'applicant_id' })
  applicantId: string;

  @ManyToOne(() => Salon, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Column({ name: 'salon_id', nullable: true })
  salonId: string;

  @Column({
    name: 'principal_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
  })
  principalAmount: number;

  @Column({ name: 'interest_rate', type: 'decimal', precision: 5, scale: 2 })
  interestRate: number;

  @Column({ name: 'term_months' })
  termMonths: number;

  @Column({ name: 'monthly_payment', type: 'decimal', precision: 14, scale: 2 })
  monthlyPayment: number;

  @Column({
    name: 'total_amount_due',
    type: 'decimal',
    precision: 14,
    scale: 2,
  })
  totalAmountDue: number;

  @Index()
  @Column({
    type: 'varchar',
    length: 32,
    default: LoanStatus.DRAFT,
  })
  status: LoanStatus;

  @Column({ name: 'application_date', type: 'date' })
  applicationDate: Date;

  @Column({ name: 'approved_date', type: 'date', nullable: true })
  approvedDate: Date;

  @Column({ name: 'approved_by', nullable: true })
  approvedById: string;

  @Column({ name: 'disbursed_date', type: 'date', nullable: true })
  disbursedDate: Date;

  @Column({
    name: 'disbursed_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  disbursedAmount: number;

  @Column({ name: 'disbursement_method', length: 32, nullable: true })
  disbursementMethod: string;

  @Column({ name: 'disbursement_reference', length: 255, nullable: true })
  disbursementReference: string;

  @Column({ name: 'first_payment_date', type: 'date', nullable: true })
  firstPaymentDate: Date;

  @Column({ name: 'next_payment_date', type: 'date', nullable: true })
  nextPaymentDate: Date;

  @Column({ name: 'completed_date', type: 'date', nullable: true })
  completedDate: Date;

  @Column({ name: 'defaulted_date', type: 'date', nullable: true })
  defaultedDate: Date;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
