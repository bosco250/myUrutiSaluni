export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Salon {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  phone: string;
  email?: string;
  registrationNumber?: string;
  tinNumber?: string;
  latitude?: number;
  longitude?: number;
  ownerId: string;
  owner?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  fullName: string;
  email?: string;
  phone: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  loyaltyPoints?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  customer?: Customer;
  salonId: string;
  salon?: Salon;
  serviceId: string;
  service?: Service;
  employeeId?: string;
  employee?: User;
  scheduledAt: string;
  duration: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  salonId: string;
  salon?: Salon;
  category?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category?: string;
  price: number;
  cost?: number;
  stockQuantity: number;
  minStockLevel?: number;
  unit?: string;
  salonId: string;
  salon?: Salon;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  salonId: string;
  salon?: Salon;
  customerId?: string;
  customer?: Customer;
  employeeId?: string;
  employee?: User;
  totalAmount: number;
  discountAmount?: number;
  taxAmount?: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string;
  items?: SaleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId?: string;
  product?: Product;
  serviceId?: string;
  service?: Service;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
}

export interface Membership {
  id: string;
  userId: string;
  user?: User;
  tier: MembershipTier;
  status: MembershipStatus;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipApplication {
  id: string;
  userId: string;
  user?: User;
  salonName: string;
  salonAddress: string;
  salonCity: string;
  salonDistrict: string;
  salonPhone: string;
  salonEmail?: string;
  registrationNumber?: string;
  tinNumber?: string;
  latitude?: number;
  longitude?: number;
  status: ApplicationStatus;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Loan {
  id: string;
  userId: string;
  user?: User;
  salonId?: string;
  salon?: Salon;
  amount: number;
  interestRate: number;
  duration: number;
  monthlyPayment: number;
  remainingBalance: number;
  status: LoanStatus;
  purpose?: string;
  approvedBy?: string;
  approvedAt?: string;
  disbursedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  user?: User;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  reference?: string;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}

// Enums
export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  MOBILE_MONEY = 'mobile_money',
  AIRTEL_MONEY = 'airtel_money',
  BANK_TRANSFER = 'bank_transfer',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum MembershipTier {
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum MembershipStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
}

export enum ApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum LoanStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DISBURSED = 'disbursed',
  ACTIVE = 'active',
  PAID = 'paid',
  DEFAULTED = 'defaulted',
  REJECTED = 'rejected',
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  PAYMENT = 'payment',
  REFUND = 'refund',
  LOAN_DISBURSEMENT = 'loan_disbursement',
  LOAN_REPAYMENT = 'loan_repayment',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
