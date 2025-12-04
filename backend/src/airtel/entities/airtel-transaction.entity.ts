import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AirtelAgent } from './airtel-agent.entity';

export enum AirtelTransactionType {
  CASH_IN = 'cash_in',
  CASH_OUT = 'cash_out',
  COLLECTION = 'collection',
  DISBURSEMENT = 'disbursement',
  COMMISSION = 'commission',
}

@Entity('airtel_transactions')
export class AirtelTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AirtelAgent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'airtel_agent_id' })
  airtelAgent: AirtelAgent;

  @Index()
  @Column({ name: 'airtel_agent_id' })
  airtelAgentId: string;

  @Column({
    name: 'transaction_type',
    type: 'varchar',
    length: 32,
  })
  transactionType: AirtelTransactionType;

  @Index()
  @Column({ name: 'airtel_transaction_id', unique: true, length: 255 })
  airtelTransactionId: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'RWF' })
  currency: string;

  @Column({ name: 'customer_phone', length: 32, nullable: true })
  customerPhone: string;

  @Column({ length: 32, default: 'pending' })
  status: string;

  @Column({ name: 'commission_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  commissionAmount: number;

  @Column({ name: 'airtel_response', type: 'simple-json', nullable: true })
  airtelResponse: Record<string, any>;

  @Column({ name: 'processed_at', type: 'datetime', nullable: true })
  processedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

