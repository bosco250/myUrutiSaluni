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
import { User } from '../../users/entities/user.entity';
import { Salon } from '../../salons/entities/salon.entity';

export enum AirtelAgentType {
  AGENT = 'agent',
  AGENT_LITE = 'agent_lite',
}

@Entity('airtel_agents')
export class AirtelAgent {
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

  @Column({
    name: 'agent_type',
    type: 'varchar',
    length: 32,
  })
  agentType: AirtelAgentType;

  @Column({ name: 'agent_id', unique: true, length: 128, nullable: true })
  agentId: string;

  @Column({ name: 'agent_lite_id', length: 128, nullable: true })
  agentLiteId: string;

  @Column({ name: 'phone_number', length: 32 })
  phoneNumber: string;

  @Column({ length: 32, default: 'pending' })
  status: string;

  @Column({
    name: 'float_balance',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  floatBalance: number;

  @Column({
    name: 'total_commissions',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  totalCommissions: number;

  @Column({ name: 'registered_at', type: 'timestamp', nullable: true })
  registeredAt: Date;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
