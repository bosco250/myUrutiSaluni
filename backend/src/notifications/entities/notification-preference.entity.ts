import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { NotificationType, NotificationChannel } from './notification.entity';

@Entity('notification_preferences')
@Unique(['userId', 'type', 'channel'])
@Unique(['customerId', 'type', 'channel'])
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ name: 'customer_id', nullable: true })
  customerId?: string;

  @Column({
    type: 'varchar',
    length: 32,
  })
  type: NotificationType;

  @Column({
    type: 'varchar',
    length: 32,
  })
  channel: NotificationChannel;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
