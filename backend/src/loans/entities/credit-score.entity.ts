import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Salon } from '../../salons/entities/salon.entity';

@Entity('credit_scores')
export class CreditScore {
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

  @Index()
  @Column({ name: 'salon_id', nullable: true })
  salonId: string;

  @Column()
  score: number;

  @Column({ name: 'risk_level', length: 32, nullable: true })
  riskLevel: string;

  @Column({ type: 'simple-json', default: '{}' })
  factors: Record<string, any>;

  @CreateDateColumn({ name: 'calculated_at' })
  calculatedAt: Date;

  @Column({ name: 'valid_until', type: 'datetime', nullable: true })
  validUntil: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

