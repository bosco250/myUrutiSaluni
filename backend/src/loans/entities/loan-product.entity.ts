import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LoanProductType {
  WORKING_CAPITAL = 'working_capital',
  EQUIPMENT = 'equipment',
  EXPANSION = 'expansion',
  EMERGENCY = 'emergency',
}

@Entity('loan_products')
export class LoanProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ unique: true, length: 64 })
  code: string;

  @Column({
    name: 'product_type',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  productType: LoanProductType;

  @Column({ name: 'min_amount', type: 'decimal', precision: 14, scale: 2 })
  minAmount: number;

  @Column({ name: 'max_amount', type: 'decimal', precision: 14, scale: 2 })
  maxAmount: number;

  @Column({ name: 'interest_rate', type: 'decimal', precision: 5, scale: 2 })
  interestRate: number;

  @Column({ name: 'min_term_months' })
  minTermMonths: number;

  @Column({ name: 'max_term_months' })
  maxTermMonths: number;

  @Column({ name: 'requires_guarantor', default: false })
  requiresGuarantor: boolean;

  @Column({ name: 'eligibility_criteria', type: 'simple-json', default: '{}' })
  eligibilityCriteria: Record<string, any>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
