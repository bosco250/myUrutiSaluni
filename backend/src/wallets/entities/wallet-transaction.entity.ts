import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Wallet } from './wallet.entity';

export enum WalletTransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  LOAN_DISBURSEMENT = 'loan_disbursement',
  LOAN_REPAYMENT = 'loan_repayment',
  COMMISSION = 'commission',
  REFUND = 'refund',
  FEE = 'fee',
}

export enum WalletTransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Wallet, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Index()
  @Column({ name: 'wallet_id' })
  walletId: string;

  @Index()
  @Column({
    name: 'transaction_type',
    type: 'varchar',
    length: 32,
  })
  transactionType: WalletTransactionType;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ name: 'balance_before', type: 'decimal', precision: 14, scale: 2 })
  balanceBefore: number;

  @Column({ name: 'balance_after', type: 'decimal', precision: 14, scale: 2 })
  balanceAfter: number;

  @Column({
    type: 'varchar',
    length: 32,
    default: WalletTransactionStatus.PENDING,
  })
  status: WalletTransactionStatus;

  @Column({ name: 'reference_type', length: 64, nullable: true })
  referenceType: string;

  @Index()
  @Column({ name: 'reference_id', nullable: true })
  referenceId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'transaction_reference', length: 255, nullable: true })
  transactionReference: string;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

