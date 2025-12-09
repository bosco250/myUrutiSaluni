import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { JournalEntry } from './journal-entry.entity';
import { ChartOfAccount } from './chart-of-account.entity';

@Entity('journal_entry_lines')
export class JournalEntryLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => JournalEntry, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'journal_entry_id' })
  journalEntry: JournalEntry;

  @Column({ name: 'journal_entry_id' })
  journalEntryId: string;

  @ManyToOne(() => ChartOfAccount, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account: ChartOfAccount;

  @Column({ name: 'account_id' })
  accountId: string;

  @Column({
    name: 'debit_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  debitAmount: number;

  @Column({
    name: 'credit_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  creditAmount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'reference_type', length: 64, nullable: true })
  referenceType: string;

  @Column({ name: 'reference_id', nullable: true })
  referenceId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
