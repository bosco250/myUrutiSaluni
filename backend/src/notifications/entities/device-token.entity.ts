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

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

export enum TokenStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

@Entity('device_tokens')
@Index(['userId', 'platform'])
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 512 })
  token: string;

  @Column({
    type: 'varchar',
    length: 32,
    default: DevicePlatform.ANDROID,
  })
  platform: DevicePlatform;

  @Column({
    type: 'varchar',
    length: 32,
    default: TokenStatus.ACTIVE,
  })
  status: TokenStatus;

  @Column({ name: 'device_id', length: 128, nullable: true })
  deviceId: string;

  @Column({ name: 'device_name', length: 128, nullable: true })
  deviceName: string;

  @Column({ name: 'app_version', length: 32, nullable: true })
  appVersion: string;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
