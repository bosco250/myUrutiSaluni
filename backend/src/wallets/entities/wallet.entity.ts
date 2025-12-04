import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Salon } from '../../salons/entities/salon.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Salon, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Column({ name: 'salon_id', nullable: true })
  salonId: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  balance: number;

  @Column({ length: 3, default: 'RWF' })
  currency: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

