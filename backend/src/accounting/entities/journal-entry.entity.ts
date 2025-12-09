import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Salon } from '../../salons/entities/salon.entity';
import { User } from '../../users/entities/user.entity';
import { JournalEntryLine } from './journal-entry-line.entity';

export enum JournalEntryStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  REVERSED = 'reversed',
}

@Entity('journal_entries')
export class JournalEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Salon, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Index()
  @Column({ name: 'salon_id' })
  salonId: string;

  @Column({ name: 'entry_number', unique: true, length: 64 })
  entryNumber: string;

  @Index()
  @Column({ name: 'entry_date', type: 'date' })
  entryDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    length: 32,
    default: JournalEntryStatus.DRAFT,
  })
  status: JournalEntryStatus;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @Column({ name: 'posted_at', type: 'timestamp', nullable: true })
  postedAt: Date;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @OneToMany(() => JournalEntryLine, (line) => line.journalEntry, {
    cascade: true,
  })
  lines: JournalEntryLine[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
