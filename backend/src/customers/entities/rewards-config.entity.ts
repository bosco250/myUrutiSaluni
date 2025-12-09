import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Salon } from '../../salons/entities/salon.entity';

@Entity('salon_rewards_config')
@Unique(['salonId'])
export class SalonRewardsConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Salon, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Index()
  @Column({ name: 'salon_id', unique: true })
  salonId: string;

  @Column({
    name: 'points_per_currency_unit',
    type: 'decimal',
    precision: 10,
    scale: 4,
    default: 0.01,
    comment:
      'Points earned per currency unit. Default: 0.01 (1 point per RWF 100)',
  })
  pointsPerCurrencyUnit: number;

  @Column({
    name: 'redemption_rate',
    type: 'decimal',
    precision: 10,
    scale: 4,
    default: 0.1,
    comment: 'Discount amount per point. Default: 0.1 (100 points = RWF 10)',
  })
  redemptionRate: number;

  @Column({
    name: 'min_redemption_points',
    type: 'integer',
    default: 100,
    comment: 'Minimum points required for redemption',
  })
  minRedemptionPoints: number;

  @Column({
    name: 'points_expiration_days',
    type: 'integer',
    nullable: true,
    comment: 'Number of days before points expire. NULL = never expire',
  })
  pointsExpirationDays: number | null;

  @Column({
    name: 'vip_threshold_points',
    type: 'integer',
    default: 1000,
    comment: 'Points required to achieve VIP status',
  })
  vipThresholdPoints: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
