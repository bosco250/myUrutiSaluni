import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { Salon } from '../../salons/entities/salon.entity';

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

@Entity('chart_of_accounts')
@Unique(['code', 'salonId'])
export class ChartOfAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 32 })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Index()
  @Column({
    name: 'account_type',
    type: 'varchar',
    length: 32,
  })
  accountType: AccountType;

  @ManyToOne(() => ChartOfAccount, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: ChartOfAccount;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @ManyToOne(() => Salon, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Index()
  @Column({ name: 'salon_id', nullable: true })
  salonId: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

