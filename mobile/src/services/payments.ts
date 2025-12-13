import { api } from './api';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
export type PaymentMethod = 'mtn_momo' | 'airtel_money' | 'wallet' | 'cash' | 'card';
export type PaymentType = 'appointment' | 'wallet_topup' | 'product_purchase' | 'tip';

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  type: PaymentType;
  externalReference?: string;
  phoneNumber?: string;
  customerId: string;
  appointmentId?: string;
  salonId?: string;
  description?: string;
  failureReason?: string;
  completedAt?: string;
  createdAt: string;
}

export interface InitiatePaymentData {
  amount: number;
  method: PaymentMethod;
  type: PaymentType;
  phoneNumber?: string;
  appointmentId?: string;
  salonId?: string;
  description?: string;
}

class PaymentsService {
  /**
   * Initiate a new payment
   */
  async initiatePayment(data: InitiatePaymentData): Promise<Payment> {
    return api.post<Payment>('/payments/initiate', data);
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(limit = 20, offset = 0): Promise<{ payments: Payment[]; total: number }> {
    return api.get<{ payments: Payment[]; total: number }>(
      `/payments/history?limit=${limit}&offset=${offset}`
    );
  }

  /**
   * Get single payment details
   */
  async getPayment(id: string): Promise<Payment> {
    return api.get<Payment>(`/payments/${id}`);
  }

  /**
   * Check payment status
   */
  async checkStatus(id: string): Promise<Payment> {
    return api.get<Payment>(`/payments/${id}/status`);
  }

  /**
   * Cancel a pending payment
   */
  async cancelPayment(id: string): Promise<Payment> {
    return api.post<Payment>(`/payments/${id}/cancel`, {});
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    // Format: 250 78X XXX XXX
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 12) {
      return `+${clean.slice(0, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
    }
    return phone;
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency = 'RWF'): string {
    return `${amount.toLocaleString()} ${currency}`;
  }

  /**
   * Get status display info
   */
  getStatusDisplay(status: PaymentStatus): { label: string; color: string } {
    switch (status) {
      case 'pending':
        return { label: 'Pending', color: '#FF9500' };
      case 'processing':
        return { label: 'Processing', color: '#5856D6' };
      case 'completed':
        return { label: 'Completed', color: '#34C759' };
      case 'failed':
        return { label: 'Failed', color: '#FF3B30' };
      case 'refunded':
        return { label: 'Refunded', color: '#8E8E93' };
      case 'cancelled':
        return { label: 'Cancelled', color: '#8E8E93' };
      default:
        return { label: 'Unknown', color: '#8E8E93' };
    }
  }

  /**
   * Get method display info
   */
  getMethodDisplay(method: PaymentMethod): { label: string; icon: string } {
    switch (method) {
      case 'mtn_momo':
        return { label: 'MTN MoMo', icon: 'phone-android' };
      case 'airtel_money':
        return { label: 'Airtel Money', icon: 'phone-android' };
      case 'wallet':
        return { label: 'URUTI Wallet', icon: 'account-balance-wallet' };
      case 'cash':
        return { label: 'Cash', icon: 'payments' };
      case 'card':
        return { label: 'Card', icon: 'credit-card' };
      default:
        return { label: 'Unknown', icon: 'payment' };
    }
  }

  /**
   * Poll payment status until complete
   */
  async pollStatus(
    paymentId: string,
    onUpdate: (payment: Payment) => void,
    maxAttempts = 20,
    intervalMs = 3000
  ): Promise<Payment> {
    let attempts = 0;
    
    return new Promise((resolve, reject) => {
      const poll = async () => {
        attempts++;
        try {
          const payment = await this.checkStatus(paymentId);
          onUpdate(payment);

          if (payment.status === 'completed' || payment.status === 'failed' || payment.status === 'cancelled') {
            resolve(payment);
            return;
          }

          if (attempts < maxAttempts) {
            setTimeout(poll, intervalMs);
          } else {
            reject(new Error('Payment timeout'));
          }
        } catch (error) {
          if (attempts < maxAttempts) {
            setTimeout(poll, intervalMs);
          } else {
            reject(error);
          }
        }
      };

      poll();
    });
  }
}

export const paymentsService = new PaymentsService();
