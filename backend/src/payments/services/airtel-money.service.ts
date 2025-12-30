import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * Airtel Money Service
 *
 * MOCK IMPLEMENTATION for development/testing
 * Simulates Airtel Money API responses with realistic behavior
 *
 * TODO: Replace with real Airtel Money API integration in production
 * - Add API credentials to environment variables
 * - Replace mock methods with actual HTTP calls to Airtel Money API
 * - Update error handling for real API responses
 */
@Injectable()
export class AirtelMoneyService {
  private readonly logger = new Logger(AirtelMoneyService.name);

  // Configuration for mock behavior
  private readonly MOCK_CONFIG = {
    successRate: 0.92, // 92% success rate (realistic)
    minProcessingTime: 2000, // 2 seconds minimum
    maxProcessingTime: 5000, // 5 seconds maximum
    cleanupInterval: 3600000, // Clean up old payments after 1 hour
  };

  private pendingPayments: Map<
    string,
    {
      status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
      amount: number;
      phoneNumber: string;
      createdAt: Date;
      completedAt?: Date;
      failureReason?: string;
    }
  > = new Map();

  constructor() {
    // Cleanup old payments periodically
    this.startCleanupTimer();
  }

  /**
   * Request a payment (MOCK)
   * Simulates Airtel Money Request to Pay API
   *
   * @param params Payment request parameters
   * @returns Payment reference ID and initial status
   * @throws BadRequestException if validation fails
   */
  async requestPayment(params: {
    phoneNumber: string;
    amount: number;
    externalId: string;
    payerMessage: string;
  }): Promise<{ referenceId: string; status: 'PENDING' }> {
    // Validate input
    if (!params.phoneNumber || !params.phoneNumber.trim()) {
      throw new BadRequestException('Phone number is required');
    }

    if (!params.amount || params.amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    if (params.amount < 100) {
      throw new BadRequestException('Minimum payment amount is 100 RWF');
    }

    // Validate phone number format
    if (!this.validateRwandanPhoneNumber(params.phoneNumber)) {
      throw new BadRequestException(
        'Invalid Airtel Money phone number. Must be 072X or 073X format',
      );
    }

    const referenceId = uuidv4();
    const formattedPhone = this.formatPhoneNumber(params.phoneNumber);

    this.logger.log(
      `[Airtel Money MOCK] Initiating payment request: ` +
        `Reference=${referenceId}, Phone=${formattedPhone}, Amount=${params.amount} RWF, ExternalId=${params.externalId}`,
    );

    // Store pending payment for later status check
    this.pendingPayments.set(referenceId, {
      status: 'PENDING',
      amount: params.amount,
      phoneNumber: formattedPhone,
      createdAt: new Date(),
    });

    // Simulate realistic processing delay (2-5 seconds)
    const processingTime =
      this.MOCK_CONFIG.minProcessingTime +
      Math.random() *
        (this.MOCK_CONFIG.maxProcessingTime -
          this.MOCK_CONFIG.minProcessingTime);

    setTimeout(() => {
      const payment = this.pendingPayments.get(referenceId);
      if (payment && payment.status === 'PENDING') {
        // Determine success/failure based on configured rate
        const isSuccess = Math.random() < this.MOCK_CONFIG.successRate;

        if (isSuccess) {
          payment.status = 'SUCCESSFUL';
          payment.completedAt = new Date();
          this.logger.log(
            `[Airtel Money MOCK] Payment ${referenceId} completed successfully. ` +
              `Amount: ${payment.amount} RWF, Phone: ${payment.phoneNumber}`,
          );
        } else {
          payment.status = 'FAILED';
          payment.completedAt = new Date();
          // Realistic failure reasons
          const failureReasons = [
            'User cancelled the payment',
            'Insufficient funds in Airtel Money account',
            'Transaction timeout',
            'Invalid PIN entered',
          ];
          payment.failureReason =
            failureReasons[Math.floor(Math.random() * failureReasons.length)];
          this.logger.warn(
            `[Airtel Money MOCK] Payment ${referenceId} failed: ${payment.failureReason}`,
          );
        }
      }
    }, processingTime);

    this.logger.log(
      `[Airtel Money MOCK] Payment request initiated. Reference: ${referenceId}, Processing time: ~${Math.round(processingTime / 1000)}s`,
    );

    return { referenceId, status: 'PENDING' };
  }

  /**
   * Check payment status (MOCK)
   * Simulates Airtel Money payment status check API
   *
   * @param referenceId Payment reference ID
   * @returns Payment status with transaction details
   */
  async checkPaymentStatus(referenceId: string): Promise<{
    status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
    reason?: string;
    financialTransactionId?: string;
  }> {
    if (!referenceId || !referenceId.trim()) {
      throw new BadRequestException('Reference ID is required');
    }

    const payment = this.pendingPayments.get(referenceId);

    if (!payment) {
      this.logger.warn(
        `[Airtel Money MOCK] Payment status check failed: Reference ${referenceId} not found`,
      );
      return {
        status: 'FAILED',
        reason: 'Payment reference not found',
      };
    }

    // Return current status
    if (payment.status === 'SUCCESSFUL') {
      const financialTransactionId = `AIRTEL_FT${Date.now()}_${referenceId.slice(0, 8)}`;
      this.logger.debug(
        `[Airtel Money MOCK] Payment ${referenceId} status: SUCCESSFUL. Transaction ID: ${financialTransactionId}`,
      );
      return {
        status: 'SUCCESSFUL',
        financialTransactionId,
      };
    }

    if (payment.status === 'FAILED') {
      this.logger.debug(
        `[Airtel Money MOCK] Payment ${referenceId} status: FAILED. Reason: ${payment.failureReason}`,
      );
      return {
        status: 'FAILED',
        reason: payment.failureReason || 'Payment failed',
      };
    }

    // Still pending
    const elapsed = Date.now() - payment.createdAt.getTime();
    this.logger.debug(
      `[Airtel Money MOCK] Payment ${referenceId} status: PENDING (elapsed: ${Math.round(elapsed / 1000)}s)`,
    );
    return { status: 'PENDING' };
  }

  /**
   * Request a refund (MOCK)
   * Simulates Airtel Money refund API
   *
   * @param params Refund request parameters
   * @returns Refund reference ID and status
   */
  async requestRefund(params: {
    originalReferenceId: string;
    amount: number;
    reason: string;
  }): Promise<{ referenceId: string; status: 'PENDING' }> {
    if (!params.originalReferenceId) {
      throw new BadRequestException('Original reference ID is required');
    }

    if (!params.amount || params.amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    const referenceId = uuidv4();

    this.logger.log(
      `[Airtel Money MOCK] Refund requested: ` +
        `RefundRef=${referenceId}, OriginalRef=${params.originalReferenceId}, ` +
        `Amount=${params.amount} RWF, Reason=${params.reason}`,
    );

    // Store refund for tracking
    this.pendingPayments.set(`REFUND_${referenceId}`, {
      status: 'PENDING',
      amount: params.amount,
      phoneNumber: 'REFUND',
      createdAt: new Date(),
    });

    // Auto-approve refund after delay
    setTimeout(() => {
      const refund = this.pendingPayments.get(`REFUND_${referenceId}`);
      if (refund) {
        refund.status = 'SUCCESSFUL';
        refund.completedAt = new Date();
        this.logger.log(
          `[Airtel Money MOCK] Refund ${referenceId} completed successfully`,
        );
      }
    }, 2000);

    return { referenceId, status: 'PENDING' };
  }

  /**
   * Get account balance (MOCK)
   * Simulates Airtel Money account balance API
   *
   * @returns Account balance information
   */
  async getBalance(): Promise<{
    availableBalance: number;
    currency: string;
    accountStatus: string;
  }> {
    this.logger.debug('[Airtel Money MOCK] Fetching account balance');

    return {
      availableBalance: 2000000, // 2M RWF mock balance
      currency: 'RWF',
      accountStatus: 'ACTIVE',
    };
  }

  /**
   * Cleanup old payments from memory
   * Prevents memory leaks in long-running applications
   */
  private startCleanupTimer(): void {
    const cleanupInterval = this.MOCK_CONFIG.cleanupInterval;

    setInterval(() => {
      const now = Date.now();
      const maxAge = cleanupInterval;
      let cleaned = 0;

      for (const [ref, payment] of this.pendingPayments.entries()) {
        const age = now - payment.createdAt.getTime();
        // Clean up payments older than configured interval
        if (age > maxAge) {
          this.pendingPayments.delete(ref);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.debug(
          `[Airtel Money MOCK] Cleaned up ${cleaned} old payment records`,
        );
      }
    }, cleanupInterval);
  }

  /**
   * Validate phone number format for Rwanda Airtel Money
   * Airtel Money numbers: 072X or 073X
   *
   * @param phoneNumber Phone number to validate
   * @returns true if valid Airtel Money number
   */
  validateRwandanPhoneNumber(phoneNumber: string): boolean {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return false;
    }

    const cleanNumber = phoneNumber.replace(/\D/g, '');

    // Airtel Money: 9 digits (72XXXXXXX or 73XXXXXXX) or 10 digits (072XXXXXXX or 073XXXXXXX)
    if (cleanNumber.length === 9) {
      // Format: 72XXXXXXX or 73XXXXXXX (without leading 0)
      return /^(72|73)\d{7}$/.test(cleanNumber);
    }

    if (cleanNumber.length === 10) {
      // Format: 072XXXXXXX or 073XXXXXXX (with leading 0)
      return /^0(72|73)\d{7}$/.test(cleanNumber);
    }

    // Also accept with country code for flexibility
    if (cleanNumber.length === 12) {
      // Format: 25072XXXXXXX or 25073XXXXXXX (with country code)
      return /^250(72|73)\d{7}$/.test(cleanNumber);
    }

    return false;
  }

  /**
   * Format phone number to international format
   * Converts to: 25072XXXXXXX or 25073XXXXXXX (without + prefix for API)
   *
   * @param phoneNumber Phone number to format
   * @returns Formatted phone number in international format
   */
  formatPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) {
      throw new BadRequestException('Phone number is required');
    }

    const cleanNumber = phoneNumber.replace(/\D/g, '');

    if (cleanNumber.length === 0) {
      throw new BadRequestException('Invalid phone number format');
    }

    // Already in international format (250...)
    if (cleanNumber.startsWith('250') && cleanNumber.length === 12) {
      return cleanNumber;
    }

    // Remove leading 0 and add country code (072... or 073...)
    if (cleanNumber.startsWith('0') && cleanNumber.length === 10) {
      return '250' + cleanNumber.substring(1);
    }

    // Add country code if not present (72... or 73...)
    if (cleanNumber.length === 9) {
      return '250' + cleanNumber;
    }

    // Fallback: try to add country code
    if (cleanNumber.length >= 9 && cleanNumber.length <= 10) {
      const withoutLeadingZero = cleanNumber.startsWith('0')
        ? cleanNumber.substring(1)
        : cleanNumber;
      return '250' + withoutLeadingZero;
    }

    throw new BadRequestException(
      `Unable to format phone number: ${phoneNumber}`,
    );
  }

  /**
   * Get payment statistics (for monitoring/debugging)
   */
  getPaymentStats(): {
    totalPending: number;
    totalSuccessful: number;
    totalFailed: number;
  } {
    let pending = 0;
    let successful = 0;
    let failed = 0;

    for (const payment of this.pendingPayments.values()) {
      if (payment.status === 'PENDING') pending++;
      else if (payment.status === 'SUCCESSFUL') successful++;
      else if (payment.status === 'FAILED') failed++;
    }

    return {
      totalPending: pending,
      totalSuccessful: successful,
      totalFailed: failed,
    };
  }
}
