import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import {
  WalletTransaction,
  WalletTransactionType,
  WalletTransactionStatus,
} from './entities/wallet-transaction.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationChannel,
  NotificationType,
} from '../notifications/entities/notification.entity';
import { MockAirtelPayoutService } from './services/mock-airtel-payout.service';

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    @InjectRepository(Wallet)
    private walletsRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private transactionsRepository: Repository<WalletTransaction>,
    private dataSource: DataSource,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    private mockPayout: MockAirtelPayoutService,
  ) {}

  async getOrCreateWallet(userId: string, salonId?: string): Promise<Wallet> {
    let wallet = await this.walletsRepository.findOne({
      where: { userId, salonId: salonId || null },
    });

    if (!wallet) {
      wallet = this.walletsRepository.create({ userId, salonId });
      wallet = await this.walletsRepository.save(wallet);
    }

    return wallet;
  }

  async createTransaction(
    walletId: string,
    type: WalletTransactionType,
    amount: number,
    description?: string,
    referenceType?: string,
    referenceId?: string,
    options?: {
      status?: WalletTransactionStatus;
      transactionReference?: string | null;
      metadata?: Record<string, any>;
    },
  ): Promise<WalletTransaction> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, { where: { id: walletId } });
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      // Ensure proper number conversion (decimal from DB comes as string)
      const currentBalance =
        typeof wallet.balance === 'string'
          ? parseFloat(wallet.balance) || 0
          : Number(wallet.balance) || 0;

      const transactionAmount = Number(amount) || 0;
      const balanceBefore = currentBalance;

      const balanceAfter =
        type === WalletTransactionType.DEPOSIT ||
        type === WalletTransactionType.COMMISSION ||
        type === WalletTransactionType.REFUND
          ? balanceBefore + transactionAmount
          : balanceBefore - transactionAmount;

      if (balanceAfter < 0) {
        throw new Error('Insufficient balance');
      }

      // Update wallet balance with proper number conversion
      await manager.update(Wallet, { id: walletId }, { balance: balanceAfter });

      const transaction = manager.create(WalletTransaction, {
        walletId,
        transactionType: type,
        amount: transactionAmount,
        balanceBefore,
        balanceAfter,
        status: options?.status || WalletTransactionStatus.COMPLETED,
        description,
        referenceType,
        referenceId,
        transactionReference: options?.transactionReference || null,
        metadata: options?.metadata || {},
      });

      return manager.save(transaction);
    });
  }

  async getWalletTransactions(walletId: string): Promise<WalletTransaction[]> {
    return this.transactionsRepository.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });
  }

  async getWalletTransactionById(
    transactionId: string,
  ): Promise<WalletTransaction> {
    const tx = await this.transactionsRepository.findOne({
      where: { id: transactionId },
    });
    if (!tx) throw new NotFoundException('Wallet transaction not found');
    return tx;
  }

  /**
   * Request a wallet withdrawal (mock payout flow).
   *
   * - Creates a WITHDRAWAL wallet transaction with status=PENDING
   * - Deducts balance immediately (reserved), then later marks COMPLETED/FAILED
   * - On FAILED, automatically creates a REFUND transaction to restore funds
   */
  async requestWithdrawal(params: {
    userId: string;
    amount: number;
    phoneNumber: string;
  }): Promise<{ transaction: WalletTransaction }> {
    const amount = Number(params.amount) || 0;
    if (!amount || amount < 1000) {
      throw new BadRequestException('Minimum withdrawal is 1,000 RWF');
    }
    if (!params.phoneNumber) {
      throw new BadRequestException('Phone number is required');
    }

    const wallet = await this.getOrCreateWallet(params.userId);

    const formattedPhone = this.mockPayout.formatPhoneNumber(
      params.phoneNumber,
    );
    if (!this.mockPayout.validateRwandanAirtelNumber(formattedPhone)) {
      throw new BadRequestException('Invalid Airtel Money phone number');
    }

    // Create payout request first to get reference id (so we can store it in transaction metadata)
    const payout = await this.mockPayout.requestPayout({
      phoneNumber: formattedPhone,
      amount,
      externalId: `wallet_withdrawal_${wallet.id}_${Date.now()}`,
      payerMessage: 'URUTI Wallet Withdrawal',
    });

    const tx = await this.createTransaction(
      wallet.id,
      WalletTransactionType.WITHDRAWAL,
      amount,
      `Withdrawal to ${formattedPhone}`,
      'payout',
      payout.referenceId,
      {
        status: WalletTransactionStatus.PENDING,
        transactionReference: payout.referenceId,
        metadata: {
          provider: 'airtel_money_mock',
          payoutReferenceId: payout.referenceId,
          phoneNumber: formattedPhone,
          requestedAt: new Date().toISOString(),
        },
      },
    );

    // async finalize without blocking request
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.finalizeWithdrawalAsync({
      walletId: wallet.id,
      userId: params.userId,
      transactionId: tx.id,
      payoutReferenceId: payout.referenceId,
      amount,
      phoneNumber: formattedPhone,
    });

    return { transaction: tx };
  }

  private async finalizeWithdrawalAsync(params: {
    walletId: string;
    userId: string;
    transactionId: string;
    payoutReferenceId: string;
    amount: number;
    phoneNumber: string;
  }): Promise<void> {
    try {
      // Poll a few times then decide based on mock status
      const maxAttempts = 15;
      const delayMs = 1500;

      let last: Awaited<
        ReturnType<MockAirtelPayoutService['checkPayoutStatus']>
      > | null = null;

      for (let i = 0; i < maxAttempts; i++) {
        // eslint-disable-next-line no-await-in-loop
        last = await this.mockPayout.checkPayoutStatus(
          params.payoutReferenceId,
        );
        if (last.status !== 'PENDING') break;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, delayMs));
      }

      if (!last) return;

      if (last.status === 'SUCCESSFUL') {
        await this.dataSource.transaction(async (manager) => {
          const tx = await manager.findOne(WalletTransaction, {
            where: { id: params.transactionId },
          });
          if (!tx) return;

          tx.status = WalletTransactionStatus.COMPLETED;
          tx.metadata = {
            ...(tx.metadata || {}),
            provider: 'airtel_money_mock',
            payoutReferenceId: params.payoutReferenceId,
            phoneNumber: params.phoneNumber,
            providerTransactionId: last?.providerTransactionId || null,
            completedAt: new Date().toISOString(),
          };

          await manager.save(tx);
        });

        await this.sendWithdrawalNotification({
          userId: params.userId,
          success: true,
          amount: params.amount,
          phoneNumber: params.phoneNumber,
          walletTransactionId: params.transactionId,
        });
        return;
      }

      // FAILED: mark failed + refund
      await this.dataSource.transaction(async (manager) => {
        const original = await manager.findOne(WalletTransaction, {
          where: { id: params.transactionId },
        });
        if (!original) return;

        original.status = WalletTransactionStatus.FAILED;
        original.metadata = {
          ...(original.metadata || {}),
          failureReason: last?.reason || 'Payout failed',
          failedAt: new Date().toISOString(),
        };
        await manager.save(original);

        // Refund back to wallet (audit-friendly)
        // (Note: REFUND will credit wallet back)
        const wallet = await manager.findOne(Wallet, {
          where: { id: params.walletId },
        });
        if (!wallet) return;

        const currentBalance =
          typeof wallet.balance === 'string'
            ? parseFloat(wallet.balance) || 0
            : Number(wallet.balance) || 0;

        const balanceBefore = currentBalance;
        const balanceAfter = balanceBefore + (Number(params.amount) || 0);

        await manager.update(
          Wallet,
          { id: params.walletId },
          { balance: balanceAfter },
        );

        const refundTx = manager.create(WalletTransaction, {
          walletId: params.walletId,
          transactionType: WalletTransactionType.REFUND,
          amount: Number(params.amount) || 0,
          balanceBefore,
          balanceAfter,
          status: WalletTransactionStatus.COMPLETED,
          description: `Refund for failed withdrawal (${params.payoutReferenceId})`,
          referenceType: 'wallet_transaction',
          referenceId: params.transactionId,
          transactionReference: `REFUND_${params.payoutReferenceId}`,
          metadata: {
            relatedWalletTransactionId: params.transactionId,
            reason: last?.reason || 'Payout failed',
          },
        });

        await manager.save(refundTx);
      });

      await this.sendWithdrawalNotification({
        userId: params.userId,
        success: false,
        amount: params.amount,
        phoneNumber: params.phoneNumber,
        walletTransactionId: params.transactionId,
        reason: last?.reason || 'Payout failed',
      });
    } catch (e: any) {
      this.logger.error(
        `Failed to finalize withdrawal ${params.transactionId}: ${e?.message || e}`,
      );
    }
  }

  private async sendWithdrawalNotification(params: {
    userId: string;
    success: boolean;
    amount: number;
    phoneNumber: string;
    walletTransactionId: string;
    reason?: string;
  }): Promise<void> {
    try {
      const title = params.success
        ? 'Withdrawal Successful'
        : 'Withdrawal Failed';
      const body = params.success
        ? `Your withdrawal of ${params.amount} RWF to ${params.phoneNumber} was successful.`
        : `Withdrawal of ${params.amount} RWF failed: ${params.reason || 'Unknown error'}. Funds were returned to your wallet.`;

      const metadata = {
        // This is the payload mobile push routing uses
        type: 'payment',
        paymentType: 'wallet_withdrawal',
        walletTransactionId: params.walletTransactionId,
        amount: params.amount,
        phoneNumber: params.phoneNumber,
        status: params.success ? 'completed' : 'failed',
      };

      // Push
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.notificationsService.sendNotification(
        params.userId,
        undefined,
        undefined,
        NotificationChannel.PUSH,
        params.success
          ? NotificationType.PAYMENT_RECEIVED
          : NotificationType.PAYMENT_FAILED,
        title,
        body,
        undefined,
        metadata,
      );

      // In-app
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.notificationsService.sendNotification(
        params.userId,
        undefined,
        undefined,
        NotificationChannel.IN_APP,
        params.success
          ? NotificationType.PAYMENT_RECEIVED
          : NotificationType.PAYMENT_FAILED,
        title,
        body,
        undefined,
        metadata,
      );
    } catch (e: any) {
      this.logger.warn(
        `Failed to send withdrawal notification: ${e?.message || e}`,
      );
    }
  }
}
