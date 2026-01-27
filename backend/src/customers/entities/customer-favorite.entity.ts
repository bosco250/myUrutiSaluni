import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('customer_favorites')
export class CustomerFavorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customerId: string;

  @Column({ type: 'uuid', nullable: true })
  salonEmployeeId: string;

  @Column({ type: 'uuid', nullable: true })
  salonId: string;

  @Column({ type: 'varchar', default: 'employee' })
  type: string; // 'salon' or 'employee'

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;
}
