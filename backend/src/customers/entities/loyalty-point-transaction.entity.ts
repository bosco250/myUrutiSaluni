import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Customer } from './customer.entity';
import { User } from '../../users/entities/user.entity';

export enum LoyaltyPointSourceType {
  SALE = 'sale',
  APPOINTMENT = 'appointment',
  REDEMPTION = 'redemption',
  MANUAL = 'manual',
  BONUS = 'bonus',
  CORRECTION = 'correction',
}

@Entity('loyalty_point_transactions')
@Index(['customerId', 'createdAt'])
@Index(['sourceType', 'sourceId'])
export class LoyaltyPointTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Index()
  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ type: 'integer' })
  points: number; // Positive for earned, negative for redeemed

  @Column({ name: 'balance_after', type: 'integer' })
  balanceAfter: number; // Customer's balance after this transaction

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: LoyaltyPointSourceType,
  })
  sourceType: LoyaltyPointSourceType;

  @Column({ name: 'source_id', nullable: true })
  sourceId: string | null; // References sale.id, appointment.id, etc.

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @Column({ name: 'created_by_id', nullable: true })
  createdById: string | null; // For manual adjustments by salon owners/admins

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

