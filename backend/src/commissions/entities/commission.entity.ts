import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { SalonEmployee } from '../../salons/entities/salon-employee.entity';
import { SaleItem } from '../../sales/entities/sale-item.entity';

@Entity('commissions')
export class Commission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SalonEmployee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'salon_employee_id' })
  salonEmployee: SalonEmployee;

  @Index()
  @Column({ name: 'salon_employee_id' })
  salonEmployeeId: string;

  @ManyToOne(() => SaleItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sale_item_id' })
  saleItem: SaleItem;

  @Column({ name: 'sale_item_id', nullable: true })
  saleItemId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2 })
  commissionRate: number;

  @Column({ name: 'sale_amount', type: 'decimal', precision: 14, scale: 2 })
  saleAmount: number;

  @Column({ default: false })
  paid: boolean;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'simple-json', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

