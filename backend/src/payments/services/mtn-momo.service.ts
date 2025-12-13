import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mock MTN MoMo Service for development/testing
 * Simulates MTN Mobile Money API responses
 */
@Injectable()
export class MtnMomoService {
  private readonly logger = new Logger(MtnMomoService.name);
  private pendingPayments: Map<string, {
    status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
    amount: number;
    phoneNumber: string;
    createdAt: Date;
  }> = new Map();

  /**
   * Request a payment (MOCK)
   * Simulates MTN MoMo Request to Pay API
   */
  async requestPayment(params: {
    phoneNumber: string;
    amount: number;
    externalId: string;
    payerMessage: string;
  }): Promise<{ referenceId: string; status: 'PENDING' }> {
    const referenceId = uuidv4();
    
    this.logger.log(`[MOCK] Requesting payment from ${params.phoneNumber} for ${params.amount} RWF`);
    
    // Store pending payment for later status check
    this.pendingPayments.set(referenceId, {
      status: 'PENDING',
      amount: params.amount,
      phoneNumber: params.phoneNumber,
      createdAt: new Date(),
    });

    // Simulate processing delay, then auto-approve
    setTimeout(() => {
      const payment = this.pendingPayments.get(referenceId);
      if (payment) {
        // 90% success rate in mock
        payment.status = Math.random() > 0.1 ? 'SUCCESSFUL' : 'FAILED';
        this.logger.log(`[MOCK] Payment ${referenceId} completed with status: ${payment.status}`);
      }
    }, 3000); // Simulate 3 second processing time

    return { referenceId, status: 'PENDING' };
  }

  /**
   * Check payment status (MOCK)
   */
  async checkPaymentStatus(referenceId: string): Promise<{
    status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
    reason?: string;
    financialTransactionId?: string;
  }> {
    const payment = this.pendingPayments.get(referenceId);
    
    if (!payment) {
      return { status: 'FAILED', reason: 'Payment not found' };
    }

    if (payment.status === 'SUCCESSFUL') {
      return {
        status: 'SUCCESSFUL',
        financialTransactionId: `FT${Date.now()}`,
      };
    }

    if (payment.status === 'FAILED') {
      return {
        status: 'FAILED',
        reason: 'User cancelled or insufficient funds',
      };
    }

    return { status: 'PENDING' };
  }

  /**
   * Request a refund (MOCK)
   */
  async requestRefund(params: {
    originalReferenceId: string;
    amount: number;
    reason: string;
  }): Promise<{ referenceId: string; status: 'PENDING' }> {
    const referenceId = uuidv4();
    
    this.logger.log(`[MOCK] Refund requested for ${params.originalReferenceId}, amount: ${params.amount}`);

    // Auto-approve refund
    setTimeout(() => {
      this.logger.log(`[MOCK] Refund ${referenceId} completed`);
    }, 2000);

    return { referenceId, status: 'PENDING' };
  }

  /**
   * Get account balance (MOCK)
   */
  async getBalance(): Promise<{ availableBalance: number; currency: string }> {
    return {
      availableBalance: 1500000, // 1.5M RWF mock balance
      currency: 'RWF',
    };
  }

  /**
   * Validate phone number format for Rwanda (lenient for mock testing)
   */
  validateRwandanPhoneNumber(phoneNumber: string): boolean {
    if (!phoneNumber) return false;
    
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // For mock testing, accept any number with at least 7 digits
    if (cleanNumber.length < 7) return false;
    
    // Accept any reasonable phone number format for testing
    // Real validation would be stricter for production
    return cleanNumber.length >= 7 && cleanNumber.length <= 15;
  }

  /**
   * Format phone number to international format
   */
  formatPhoneNumber(phoneNumber: string): string {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    if (cleanNumber.startsWith('250')) {
      return cleanNumber;
    }
    
    if (cleanNumber.startsWith('0')) {
      return '250' + cleanNumber.substring(1);
    }
    
    return '250' + cleanNumber;
  }
}
