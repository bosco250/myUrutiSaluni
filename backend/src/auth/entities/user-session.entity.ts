import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_sessions')
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ name: 'refresh_token', nullable: true })
  refreshToken: string;

  @Column({ name: 'device_type', nullable: true })
  deviceType: string; // e.g., 'Windows PC', 'iPhone 14', 'Browser'

  @Column({ name: 'browser', nullable: true })
  browser: string; // e.g., 'Chrome', 'Safari'

  @Column({ name: 'os', nullable: true })
  os: string; // e.g., 'Windows 11', 'iOS'

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'location', nullable: true })
  location: string; // e.g., 'Kigali, RW'

  @Column({
    name: 'last_active',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastActive: Date;

  @Column({ name: 'is_revoked', default: false })
  isRevoked: boolean;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
