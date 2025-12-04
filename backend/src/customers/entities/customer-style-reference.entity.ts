import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { User } from '../../users/entities/user.entity';

@Entity('customer_style_references')
export class CustomerStyleReference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Customer, (customer) => customer.styleReferences, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Appointment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appointment_id' })
  appointment?: Appointment;

  @Column({ name: 'appointment_id', nullable: true })
  appointmentId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy?: User;

  @Column({ name: 'created_by', nullable: true })
  createdById?: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'image_url', type: 'text' })
  imageUrl: string;

  @Column({ type: 'simple-json', nullable: true })
  tags?: string[];

  @Column({ name: 'shared_with_employees', default: true })
  sharedWithEmployees: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


