import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
  PaymentType,
} from './entities/payment.entity';
import { InitiatePaymentDto } from './dto/payment.dto';
import { MtnMomoService } from './services/mtn-momo.service';
import { CustomersService } from '../customers/customers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WalletsService } from '../wallets/wallets.service';
import { WalletTransactionType } from '../wallets/entities/wallet-transaction.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    private mtnMomoService: MtnMomoService,
    private customersService: CustomersService,
    private notificationsService: NotificationsService,
    private walletsService: WalletsService,
  ) {}

  async initiatePayment(dto: InitiatePaymentDto, user: User): Promise<Payment> {
    // For wallet top-up, any user can top up their wallet (not just customers)
    // For other payment types, we still require a customer profile
    let customerId: string | null = null;

    if (dto.type === PaymentType.WALLET_TOPUP) {
      // Wallet top-up: Use user ID directly, don't require customer profile
      // We'll store user.id in a way that handleWalletUpdate can find it
      const customer = await this.customersService.findByUserId(user.id);
      customerId = customer?.id || null;

      // If no customer profile exists, we'll handle this in handleWalletUpdate
      // by using the userId from the payment metadata
    } else {
      // Other payment types require a customer profile
      const customer = await this.customersService.findByUserId(user.id);
      if (!customer) {
        throw new BadRequestException('Customer profile not found');
      }
      customerId = customer.id;
    }

    // Validate phone number for mobile money
    if (dto.method === PaymentMethod.MTN_MOMO && dto.phoneNumber) {
      if (!this.mtnMomoService.validateRwandanPhoneNumber(dto.phoneNumber)) {
        throw new BadRequestException('Invalid MTN Rwanda phone number');
      }
    }

    // Create payment record
    const payment = this.paymentsRepository.create({
      ...dto,
      customerId: customerId || undefined,
      userId: user.id, // Always store userId for wallet updates
      status: PaymentStatus.PENDING,
      phoneNumber: dto.phoneNumber
        ? this.mtnMomoService.formatPhoneNumber(dto.phoneNumber)
        : undefined,
      // Store userId in metadata as backup
      metadata:
        dto.type === PaymentType.WALLET_TOPUP ? { userId: user.id } : undefined,
    });

    const savedPayment = await this.paymentsRepository.save(payment);

    // Initiate payment with provider
    if (dto.method === PaymentMethod.MTN_MOMO) {
      try {
        const result = await this.mtnMomoService.requestPayment({
          phoneNumber: savedPayment.phoneNumber!,
          amount: dto.amount,
          externalId: savedPayment.id,
          payerMessage: dto.description || 'URUTI Salon Payment',
        });

        savedPayment.externalReference = result.referenceId;
        savedPayment.status = PaymentStatus.PROCESSING;
        await this.paymentsRepository.save(savedPayment);

        // Start polling for status
        this.pollPaymentStatus(savedPayment.id, result.referenceId);
      } catch (error) {
        savedPayment.status = PaymentStatus.FAILED;
        savedPayment.failureReason = 'Failed to initiate payment';
        await this.paymentsRepository.save(savedPayment);
        throw new BadRequestException(
          'Failed to initiate payment with MTN MoMo',
        );
      }
    } else if (dto.method === PaymentMethod.WALLET) {
      // Handle wallet payment - for top-ups, this shouldn't be used
      // For payments from wallet, deduct from wallet
      savedPayment.status = PaymentStatus.COMPLETED;
      savedPayment.completedAt = new Date();
      await this.paymentsRepository.save(savedPayment);

      // Handle wallet update (for top-ups or deductions)
      await this.handleWalletUpdate(savedPayment);
    }

    return savedPayment;
  }

  private async pollPaymentStatus(
    paymentId: string,
    referenceId: string,
  ): Promise<void> {
    const maxAttempts = 20; // 60 seconds total (3s intervals)
    let attempts = 0;

    const poll = async () => {
      attempts++;

      try {
        const result =
          await this.mtnMomoService.checkPaymentStatus(referenceId);
        const payment = await this.paymentsRepository.findOne({
          where: { id: paymentId },
        });

        if (!payment) return;

        if (result.status === 'SUCCESSFUL') {
          payment.status = PaymentStatus.COMPLETED;
          payment.completedAt = new Date();
          payment.metadata = {
            ...payment.metadata,
            financialTransactionId: result.financialTransactionId,
          };
          await this.paymentsRepository.save(payment);

          // Update wallet balance for top-up payments
          await this.handleWalletUpdate(payment);

          // Send success notification
          try {
            await this.notificationsService.sendNotification(
              payment.customer?.user?.id,
              payment.customerId,
              undefined,
              'in_app' as any,
              'payment' as any,
              'Payment Successful',
              `Your payment of ${payment.amount} RWF was successful`,
            );
          } catch (notifError) {
            this.logger.warn('Failed to send payment success notification');
          }

          this.logger.log(`Payment ${paymentId} completed successfully`);
          return;
        }

        if (result.status === 'FAILED') {
          payment.status = PaymentStatus.FAILED;
          payment.failureReason = result.reason;
          await this.paymentsRepository.save(payment);

          // Send failure notification
          try {
            await this.notificationsService.sendNotification(
              payment.customer?.user?.id,
              payment.customerId,
              undefined,
              'in_app' as any,
              'payment' as any,
              'Payment Failed',
              `Your payment of ${payment.amount} RWF failed: ${result.reason}`,
            );
          } catch (notifError) {
            this.logger.warn('Failed to send payment failed notification');
          }

          this.logger.log(`Payment ${paymentId} failed: ${result.reason}`);
          return;
        }

        // Still pending, continue polling
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          // Timeout - mark as failed
          payment.status = PaymentStatus.FAILED;
          payment.failureReason = 'Payment timeout';
          await this.paymentsRepository.save(payment);
        }
      } catch (error) {
        this.logger.error(`Error polling payment status: ${error.message}`);
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        }
      }
    };

    // Start polling after initial delay
    setTimeout(poll, 3000);
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['customer', 'customer.user', 'appointment'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async findByCustomer(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ payments: Payment[]; total: number }> {
    const customer = await this.customersService.findByUserId(userId);

    // Build where conditions - include both customer payments and direct user payments
    const whereConditions: any[] = [];

    // If user has a customer profile, get payments by customerId
    if (customer) {
      whereConditions.push({ customerId: customer.id });
    }

    // Also get payments by userId (for wallet top-ups by non-customer users)
    whereConditions.push({ userId: userId });

    if (whereConditions.length === 0) {
      return { payments: [], total: 0 };
    }

    const [payments, total] = await this.paymentsRepository.findAndCount({
      where: whereConditions,
      relations: ['appointment'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { payments, total };
  }

  async checkStatus(id: string): Promise<Payment> {
    const payment = await this.findOne(id);

    // If still processing, check with provider
    if (
      payment.status === PaymentStatus.PROCESSING &&
      payment.externalReference
    ) {
      const result = await this.mtnMomoService.checkPaymentStatus(
        payment.externalReference,
      );

      if (result.status === 'SUCCESSFUL') {
        payment.status = PaymentStatus.COMPLETED;
        payment.completedAt = new Date();
        await this.paymentsRepository.save(payment);
      } else if (result.status === 'FAILED') {
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = result.reason;
        await this.paymentsRepository.save(payment);
      }
    }

    return payment;
  }

  async cancelPayment(id: string, user: User): Promise<Payment> {
    const payment = await this.findOne(id);
    const customer = await this.customersService.findByUserId(user.id);

    if (!customer || payment.customerId !== customer.id) {
      throw new BadRequestException('Not authorized to cancel this payment');
    }

    if (
      payment.status !== PaymentStatus.PENDING &&
      payment.status !== PaymentStatus.PROCESSING
    ) {
      throw new BadRequestException('Cannot cancel this payment');
    }

    payment.status = PaymentStatus.CANCELLED;
    return this.paymentsRepository.save(payment);
  }

  async getPaymentStats(customerId: string): Promise<{
    totalSpent: number;
    totalTransactions: number;
    averageTransaction: number;
  }> {
    const result = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('payment.customerId = :customerId', { customerId })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();

    const total = parseFloat(result?.total) || 0;
    const count = parseInt(result?.count) || 0;

    return {
      totalSpent: total,
      totalTransactions: count,
      averageTransaction: count > 0 ? total / count : 0,
    };
  }

  /**
   * Update wallet balance based on payment type
   */
  private async handleWalletUpdate(payment: Payment): Promise<void> {
    try {
      let userId: string | undefined;

      // Try to get userId from customer profile first
      if (payment.customerId) {
        const customer = await this.customersService.findOne(
          payment.customerId,
        );
        userId = customer?.user?.id;
      }

      // For wallet top-ups, also check userId field or metadata (for non-customer users like salon owners)
      if (!userId && payment.userId) {
        userId = payment.userId;
        this.logger.log(
          `Using userId from payment for wallet top-up: ${userId}`,
        );
      }

      // Fallback to metadata for backward compatibility
      if (
        !userId &&
        payment.type === PaymentType.WALLET_TOPUP &&
        payment.metadata?.userId
      ) {
        userId = payment.metadata.userId as string;
        this.logger.log(
          `Using userId from metadata for wallet top-up: ${userId}`,
        );
      }

      if (!userId) {
        this.logger.warn(
          `Cannot update wallet: no userId found for payment ${payment.id}`,
        );
        return;
      }

      // Get or create wallet for this user
      const wallet = await this.walletsService.getOrCreateWallet(userId);

      if (payment.type === PaymentType.WALLET_TOPUP) {
        // Top-up: Add money to wallet (deposit)
        await this.walletsService.createTransaction(
          wallet.id,
          WalletTransactionType.DEPOSIT,
          payment.amount,
          `Top-up via ${payment.method}`,
        );
        this.logger.log(
          `Wallet topped up: ${payment.amount} RWF for user ${userId}`,
        );
      } else if (payment.type === PaymentType.APPOINTMENT) {
        // Appointment payment from wallet would be a withdrawal
        // But if paid via MoMo, no wallet change needed (payment goes directly to salon)
        if (payment.method === PaymentMethod.WALLET) {
          await this.walletsService.createTransaction(
            wallet.id,
            WalletTransactionType.WITHDRAWAL,
            payment.amount,
            `Payment for appointment ${payment.appointmentId || ''}`,
          );
          this.logger.log(
            `Wallet debited: ${payment.amount} RWF for appointment`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to update wallet for payment ${payment.id}: ${error.message}`,
      );
      // Don't throw - wallet update failure shouldn't fail the payment
    }
  }
}
