import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mock Airtel payout (cash-out) service for development/testing.
 * Simulates sending money to Airtel Money and later completing or failing.
 *
 * NOTE: Replace with real Airtel payout API integration in production.
 */
@Injectable()
export class MockAirtelPayoutService {
  private readonly logger = new Logger(MockAirtelPayoutService.name);

  private readonly MOCK_CONFIG = {
    successRate: 0.9,
    minProcessingMs: 2000,
    maxProcessingMs: 6000,
    cleanupIntervalMs: 10 * 60 * 1000,
  };

  private payouts: Map<
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
    this.startCleanupTimer();
  }

  validateRwandanAirtelNumber(phoneNumber: string): boolean {
    if (!phoneNumber || typeof phoneNumber !== 'string') return false;
    const clean = phoneNumber.replace(/\D/g, '');

    if (clean.length === 9) return /^(72|73)\d{7}$/.test(clean);
    if (clean.length === 10) return /^0(72|73)\d{7}$/.test(clean);
    if (clean.length === 12) return /^250(72|73)\d{7}$/.test(clean);
    return false;
  }

  formatPhoneNumber(phoneNumber: string): string {
    const clean = (phoneNumber || '').replace(/\D/g, '');
    if (!clean) throw new BadRequestException('Invalid phone number');

    if (clean.startsWith('250') && clean.length === 12) return clean;
    if (clean.startsWith('0') && clean.length === 10)
      return `250${clean.slice(1)}`;
    if (clean.length === 9) return `250${clean}`;

    throw new BadRequestException('Invalid Airtel Money phone number');
  }

  async requestPayout(params: {
    phoneNumber: string;
    amount: number;
    externalId: string;
    payerMessage?: string;
  }): Promise<{ referenceId: string; status: 'PENDING' }> {
    const referenceId = uuidv4();

    const formattedPhone = this.formatPhoneNumber(params.phoneNumber);
    if (!this.validateRwandanAirtelNumber(formattedPhone)) {
      throw new BadRequestException('Invalid Airtel Money phone number');
    }
    const amount = Number(params.amount) || 0;
    if (amount <= 0)
      throw new BadRequestException('Amount must be greater than zero');

    // deterministic failure scenarios for testing
    let failureReason: string | undefined;
    const local9 = formattedPhone.startsWith('250')
      ? formattedPhone.slice(3)
      : formattedPhone;
    if (local9 === '720000000') failureReason = 'User account blocked';
    if (local9 === '721111111') failureReason = 'Payout limit exceeded';
    if (local9 === '722222222') failureReason = 'Invalid recipient';
    if (amount > 500000) failureReason = 'Amount exceeds payout limit';

    this.payouts.set(referenceId, {
      status: 'PENDING',
      amount,
      phoneNumber: formattedPhone,
      createdAt: new Date(),
      failureReason,
    });

    const delay =
      Math.floor(
        Math.random() *
          (this.MOCK_CONFIG.maxProcessingMs - this.MOCK_CONFIG.minProcessingMs),
      ) + this.MOCK_CONFIG.minProcessingMs;

    this.logger.log(
      `[Airtel Payout MOCK] Requested payout ${amount} RWF to ${formattedPhone} (ref=${referenceId}, ext=${params.externalId})`,
    );

    setTimeout(() => {
      const payout = this.payouts.get(referenceId);
      if (!payout || payout.status !== 'PENDING') return;

      // forced fail scenarios take precedence
      if (payout.failureReason) {
        payout.status = 'FAILED';
        payout.completedAt = new Date();
        this.logger.warn(
          `[Airtel Payout MOCK] Payout ${referenceId} FAILED: ${payout.failureReason}`,
        );
        return;
      }

      const ok = Math.random() < this.MOCK_CONFIG.successRate;
      payout.status = ok ? 'SUCCESSFUL' : 'FAILED';
      payout.completedAt = new Date();
      if (!ok) {
        const reasons = [
          'Network timeout',
          'Insufficient float',
          'Recipient unreachable',
          'Provider error',
        ];
        payout.failureReason =
          reasons[Math.floor(Math.random() * reasons.length)];
        this.logger.warn(
          `[Airtel Payout MOCK] Payout ${referenceId} FAILED: ${payout.failureReason}`,
        );
      } else {
        this.logger.log(
          `[Airtel Payout MOCK] Payout ${referenceId} SUCCESSFUL`,
        );
      }
    }, delay);

    return { referenceId, status: 'PENDING' };
  }

  async checkPayoutStatus(referenceId: string): Promise<{
    status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
    reason?: string;
    providerTransactionId?: string;
  }> {
    if (!referenceId || !referenceId.trim()) {
      throw new BadRequestException('Reference ID is required');
    }
    const payout = this.payouts.get(referenceId);
    if (!payout) {
      return { status: 'FAILED', reason: 'Payout reference not found' };
    }

    if (payout.status === 'SUCCESSFUL') {
      return {
        status: 'SUCCESSFUL',
        providerTransactionId: `AIRTEL_PO${Date.now()}_${referenceId.slice(0, 8)}`,
      };
    }
    if (payout.status === 'FAILED') {
      return {
        status: 'FAILED',
        reason: payout.failureReason || 'Payout failed',
      };
    }
    return { status: 'PENDING' };
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      const maxAge = this.MOCK_CONFIG.cleanupIntervalMs;
      let cleaned = 0;
      for (const [ref, p] of this.payouts.entries()) {
        if (p.completedAt && p.completedAt.getTime() < now - maxAge) {
          this.payouts.delete(ref);
          cleaned++;
        }
      }
      if (cleaned > 0) {
        this.logger.debug(
          `[Airtel Payout MOCK] Cleaned ${cleaned} old payouts`,
        );
      }
    }, this.MOCK_CONFIG.cleanupIntervalMs);
  }
}
