import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('system_config')
export class SystemConfig {
  @PrimaryGeneratedColumn()
  id: number;

  // General
  @Column({ name: 'maintenance_mode', default: false })
  maintenanceMode: boolean;

  @Column({ name: 'allow_registrations', default: true })
  allowRegistrations: boolean;

  // Financial
  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2, default: 10.0 })
  commissionRate: number;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, default: 18.0 })
  taxRate: number;

  @Column({ default: 'RWF' })
  currency: string;

  // Loans
  @Column({ name: 'base_interest_rate', type: 'decimal', precision: 5, scale: 2, default: 5.0 })
  baseInterestRate: number;

  @Column({ name: 'penalty_rate', type: 'decimal', precision: 5, scale: 2, default: 2.0 })
  penaltyRate: number;

  @Column({ name: 'max_loan_amount', type: 'bigint', default: 5000000 })
  maxLoanAmount: number;

  // Security
  @Column({ name: 'session_timeout', default: 30 })
  sessionTimeout: number; // in minutes

  @Column({ name: 'max_login_attempts', default: 5 })
  maxLoginAttempts: number;

  @Column({ name: 'password_expiry', default: 90 })
  passwordExpiry: number; // in days

  // Communication
  @Column({ name: 'support_email', default: 'support@uruti.com' })
  supportEmail: string;

  @Column({ name: 'support_phone', default: '+250 788 000 000' })
  supportPhone: string;

  // Features
  @Column({ name: 'enable_loans', default: true })
  enableLoans: boolean;

  @Column({ name: 'enable_payroll', default: true })
  enablePayroll: boolean;

  @Column({ name: 'enable_inventory', default: true })
  enableInventory: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
