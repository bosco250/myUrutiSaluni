export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ASSOCIATION_ADMIN = 'association_admin',
  SALON_OWNER = 'salon_owner',
  SALON_MANAGER = 'salon_manager',
  EMPLOYEE = 'employee',
  CUSTOMER = 'customer',
}

export enum MembershipTier {
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
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
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  MOBILE_MONEY = 'mobile_money',
  AIRTEL_MONEY = 'airtel_money',
  BANK_TRANSFER = 'bank_transfer',
}

export * from './employee-permission.enum';
