import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';
import { Salon } from '../../salons/entities/salon.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Message } from './message.entity';

export enum ConversationType {
  CUSTOMER_EMPLOYEE = 'customer_employee',
  CUSTOMER_SALON = 'customer_salon',
}

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Index()
  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employee_id' })
  employee?: User;

  @Index()
  @Column({ name: 'employee_id', nullable: true })
  employeeId?: string;

  @ManyToOne(() => Salon, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_id' })
  salon?: Salon;

  @Index()
  @Column({ name: 'salon_id', nullable: true })
  salonId?: string;

  @ManyToOne(() => Appointment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appointment_id' })
  appointment?: Appointment;

  @Column({ name: 'appointment_id', nullable: true })
  appointmentId?: string;

  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.CUSTOMER_EMPLOYEE,
  })
  type: ConversationType;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @Column({ name: 'last_message_id', nullable: true })
  lastMessageId?: string;

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt?: Date;

  @Column({ name: 'customer_unread_count', default: 0 })
  customerUnreadCount: number;

  @Column({ name: 'employee_unread_count', default: 0 })
  employeeUnreadCount: number;

  @Column({ name: 'is_archived', default: false })
  isArchived: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
