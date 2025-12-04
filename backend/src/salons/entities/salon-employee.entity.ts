import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Salon } from './salon.entity';

@Entity('salon_employees')
export class SalonEmployee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @ManyToOne(() => Salon, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Index()
  @Column({ name: 'salon_id' })
  salonId: string;

  @Column({ name: 'role_title', length: 128, nullable: true })
  roleTitle: string;

  @Column({ type: 'simple-array', default: '' })
  skills: string[];

  @Column({ name: 'hire_date', type: 'date', nullable: true })
  hireDate: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  commissionRate: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

