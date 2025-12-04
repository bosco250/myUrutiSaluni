import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Sale } from './sale.entity';
import { Service } from '../../services/entities/service.entity';
import { Product } from '../../inventory/entities/product.entity';
import { SalonEmployee } from '../../salons/entities/salon-employee.entity';

@Entity('sale_items')
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Sale, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @Column({ name: 'sale_id' })
  saleId: string;

  @ManyToOne(() => Service, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @Column({ name: 'service_id', nullable: true })
  serviceId: string;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id', nullable: true })
  productId: string;

  @ManyToOne(() => SalonEmployee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'salon_employee_id' })
  salonEmployee: SalonEmployee;

  @Column({ name: 'salon_employee_id', nullable: true })
  salonEmployeeId: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 1 })
  quantity: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 14, scale: 2 })
  lineTotal: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

