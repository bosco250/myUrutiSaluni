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

  async getAllWallets(
    pagination: { page: number; limit: number },
    search?: string,
  ): Promise<{
    data: Wallet[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    this.logger.debug(
      `getAllWallets called with pagination: ${JSON.stringify(pagination)}, search: ${search}`,
    );

    const qb = this.walletsRepository
      .createQueryBuilder('wallet')
      .leftJoinAndSelect('wallet.user', 'user');

    if (search) {
      qb.where(
        'user.full_name ILIKE :search OR user.email ILIKE :search OR CAST(wallet.id AS VARCHAR) ILIKE :search',
        { search: `%${search}%` },
      );
      this.logger.debug(`Search filter applied: ${search}`);
    }

    const [data, total] = await qb
      .orderBy('wallet.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    this.logger.debug(
      `Found ${total} wallets, returning ${data.length} for page ${page}`,
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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
      // Use pessimistic lock to prevent balance race conditions
      const wallet = await manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      // Block outgoing transactions on inactive wallets; incoming (deposits, commissions, refunds) are still allowed
      const outgoingTypes = [
        WalletTransactionType.WITHDRAWAL,
        WalletTransactionType.TRANSFER,
        WalletTransactionType.FEE,
        WalletTransactionType.LOAN_REPAYMENT,
      ];
      if (!wallet.isActive && outgoingTypes.includes(type)) {
        throw new BadRequestException(
          'Wallet is blocked. Outgoing transactions are not allowed.',
        );
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
        type === WalletTransactionType.REFUND ||
        type === WalletTransactionType.LOAN_DISBURSEMENT
          ? balanceBefore + transactionAmount
          : balanceBefore - transactionAmount;

      if (balanceAfter < 0) {
        throw new BadRequestException('Insufficient balance');
      }

      // Update wallet balance
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

  async getWalletSummary(walletId: string): Promise<{
    totalReceived: number;
    totalSent: number;
    pendingCount: number;
  }> {
    const result = await this.transactionsRepository
      .createQueryBuilder('tx')
      .select(
        "SUM(CASE WHEN tx.transaction_type IN ('deposit', 'commission', 'refund', 'loan_disbursement') AND tx.status = 'completed' THEN CAST(tx.amount AS NUMERIC) ELSE 0 END)",
        'totalReceived',
      )
      .addSelect(
        "SUM(CASE WHEN tx.transaction_type IN ('withdrawal', 'transfer', 'loan_repayment', 'fee') AND tx.status = 'completed' THEN CAST(tx.amount AS NUMERIC) ELSE 0 END)",
        'totalSent',
      )
      .addSelect(
        "COUNT(CASE WHEN tx.status = 'pending' THEN 1 END)",
        'pendingCount',
      )
      .where('tx.wallet_id = :walletId', { walletId })
      .getRawOne();

    return {
      totalReceived: parseFloat(result.totalReceived || '0'),
      totalSent: parseFloat(result.totalSent || '0'),
      pendingCount: parseInt(result.pendingCount || '0', 10),
    };
  }

  async getWalletTransactions(
    walletId: string,
    pagination?: { page: number; limit: number },
  ): Promise<
    | WalletTransaction[]
    | {
        data: WalletTransaction[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }
  > {
    if (!pagination) {
      return this.transactionsRepository.find({
        where: { walletId },
        order: { createdAt: 'DESC' },
      });
    }

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await this.transactionsRepository.findAndCount({
      where: { walletId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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

  async toggleWalletActive(
    walletId: string,
    isActive: boolean,
  ): Promise<Wallet> {
    const wallet = await this.walletsRepository.findOne({
      where: { id: walletId },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    wallet.isActive = isActive;
    return this.walletsRepository.save(wallet);
  }

  async cancelTransaction(transactionId: string): Promise<{
    transaction: WalletTransaction;
    refund?: WalletTransaction;
  }> {
    return this.dataSource.transaction(async (manager) => {
      const transaction = await manager.findOne(WalletTransaction, {
        where: { id: transactionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!transaction) throw new NotFoundException('Transaction not found');
      if (transaction.status !== WalletTransactionStatus.PENDING) {
        throw new BadRequestException(
          'Only pending transactions can be cancelled',
        );
      }

      transaction.status = WalletTransactionStatus.CANCELLED;
      transaction.metadata = {
        ...(transaction.metadata || {}),
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'admin',
      };
      await manager.save(transaction);

      // Compensating transaction: reverse the balance change
      const debitTypes = [
        WalletTransactionType.WITHDRAWAL,
        WalletTransactionType.TRANSFER,
        WalletTransactionType.LOAN_REPAYMENT,
        WalletTransactionType.FEE,
      ];
      const isDebit = debitTypes.includes(transaction.transactionType);

      const wallet = await manager.findOne(Wallet, {
        where: { id: transaction.walletId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const currentBalance =
        typeof wallet.balance === 'string'
          ? parseFloat(wallet.balance) || 0
          : Number(wallet.balance) || 0;

      const amount = Number(transaction.amount) || 0;
      const balanceBefore = currentBalance;

      let balanceAfter: number;
      let compensatingType: WalletTransactionType;
      let compensatingDescription: string;

      if (isDebit) {
        balanceAfter = balanceBefore + amount;
        compensatingType = WalletTransactionType.REFUND;
        compensatingDescription = `Refund for admin-cancelled ${transaction.transactionType} (${transactionId})`;
      } else {
        balanceAfter = balanceBefore - amount;
        if (balanceAfter < 0) {
          throw new BadRequestException(
            'Cannot cancel: wallet balance insufficient to reverse this credit transaction',
          );
        }
        compensatingType = WalletTransactionType.FEE;
        compensatingDescription = `Reversal for admin-cancelled ${transaction.transactionType} (${transactionId})`;
      }

      await manager.update(
        Wallet,
        { id: transaction.walletId },
        { balance: balanceAfter },
      );

      const refund = manager.create(WalletTransaction, {
        walletId: transaction.walletId,
        transactionType: compensatingType,
        amount,
        balanceBefore,
        balanceAfter,
        status: WalletTransactionStatus.COMPLETED,
        description: compensatingDescription,
        referenceType: 'wallet_transaction',
        referenceId: transactionId,
        transactionReference: `CANCEL_${transactionId}`,
        metadata: {
          relatedWalletTransactionId: transactionId,
          reason: 'Admin cancelled pending transaction',
        },
      });

      await manager.save(refund);

      return { transaction, refund };
    });
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

    if (!wallet.isActive) {
      throw new BadRequestException(
        'Your wallet is blocked. Please contact support to unblock it.',
      );
    }

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
