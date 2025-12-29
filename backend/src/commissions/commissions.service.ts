import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Commission } from './entities/commission.entity';
import { SalonEmployee } from '../salons/entities/salon-employee.entity';
import { NotificationOrchestratorService } from '../notifications/services/notification-orchestrator.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { WalletsService } from '../wallets/wallets.service';
import {
  WalletTransactionType,
  WalletTransactionStatus,
} from '../wallets/entities/wallet-transaction.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { WalletTransaction } from '../wallets/entities/wallet-transaction.entity';

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);

  constructor(
    @InjectRepository(Commission)
    private commissionsRepository: Repository<Commission>,
    @InjectRepository(SalonEmployee)
    private salonEmployeesRepository: Repository<SalonEmployee>,
    @Inject(forwardRef(() => NotificationOrchestratorService))
    private notificationOrchestrator: NotificationOrchestratorService,
    private walletsService: WalletsService,
    private dataSource: DataSource,
  ) {}

  async createCommission(
    salonEmployeeId: string,
    saleItemId: string | null,
    saleAmount: number,
    metadata?: Record<string, any>,
  ): Promise<Commission> {
    // Get employee to get commission rate
    const employee = await this.salonEmployeesRepository.findOne({
      where: { id: salonEmployeeId },
      relations: ['user'],
    });

    if (!employee) {
      throw new Error(`Employee ${salonEmployeeId} not found`);
    }

    const employeeName =
      employee.user?.fullName || employee.roleTitle || 'Unknown';
    const commissionRate = Number(employee.commissionRate) || 0;
    const saleAmountNum = Number(saleAmount) || 0;
    const commissionAmount = (saleAmountNum * commissionRate) / 100;

    // Warn if commission rate is 0
    if (commissionRate === 0) {
      this.logger.warn(
        `⚠️ Creating commission with 0% rate for employee ${employeeName} (${salonEmployeeId}). Sale amount: RWF ${saleAmountNum}, Commission: RWF 0. Please set a commission rate for this employee.`,
      );
    }

    const commission = this.commissionsRepository.create({
      salonEmployeeId,
      saleItemId,
      amount: commissionAmount,
      commissionRate,
      saleAmount: saleAmountNum,
      paid: false,
      metadata: metadata || {},
    });

    const savedCommission = await this.commissionsRepository.save(commission);

    // Send notification for commission earned
    if (commissionAmount > 0 && employee.user?.id) {
      try {
        await this.notificationOrchestrator.notify(
          NotificationType.COMMISSION_EARNED,
          {
            userId: employee.user.id,
            recipientEmail: employee.user.email,
            commissionId: savedCommission.id,
            commissionAmount: `RWF ${commissionAmount.toLocaleString()}`,
          },
        );
      } catch (error) {
        this.logger.warn(
          `Failed to send commission earned notification: ${error.message}`,
        );
      }
    }

    return savedCommission;
  }

  async findByIds(ids: string[]): Promise<Commission[]> {
    return this.commissionsRepository.find({
      where: ids.map((id) => ({ id })),
      relations: ['salonEmployee', 'salonEmployee.user', 'salonEmployee.salon'],
    });
  }

  async findAll(filters?: {
    salonEmployeeId?: string;
    salonEmployeeIds?: string[];
    salonId?: string;
    salonIds?: string[];
    paid?: boolean;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Commission[]> {
    const query = this.commissionsRepository
      .createQueryBuilder('commission')
      .leftJoinAndSelect('commission.salonEmployee', 'employee')
      .leftJoinAndSelect('employee.user', 'user')
      .leftJoinAndSelect('employee.salon', 'salon')
      .leftJoinAndSelect('commission.saleItem', 'saleItem')
      .leftJoinAndSelect('saleItem.sale', 'sale');

    // Support multiple employee IDs (for employees working at multiple salons)
    if (filters?.salonEmployeeIds && filters.salonEmployeeIds.length > 0) {
      query.andWhere('commission.salonEmployeeId IN (:...salonEmployeeIds)', {
        salonEmployeeIds: filters.salonEmployeeIds,
      });
    } else if (filters?.salonEmployeeId) {
      query.andWhere('commission.salonEmployeeId = :salonEmployeeId', {
        salonEmployeeId: filters.salonEmployeeId,
      });
    }

    // Support multiple salon IDs (for salon owners with multiple salons)
    if (filters?.salonIds && filters.salonIds.length > 0) {
      query.andWhere('salon.id IN (:...salonIds)', {
        salonIds: filters.salonIds,
      });
    } else if (filters?.salonId && !filters?.salonEmployeeIds) {
      // Only apply salonId filter if not using multiple employee IDs
      // (when using multiple employee IDs, the salon filter is implicit via employee records)
      query.andWhere('salon.id = :salonId', { salonId: filters.salonId });
    }

    if (filters?.paid !== undefined) {
      query.andWhere('commission.paid = :paid', { paid: filters.paid });
    }

    if (filters?.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setUTCHours(0, 0, 0, 0);
      query.andWhere('commission.createdAt >= :startDate', { startDate });
    }

    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setUTCHours(23, 59, 59, 999);
      query.andWhere('commission.createdAt <= :endDate', { endDate });
    }

    return query.orderBy('commission.createdAt', 'DESC').getMany();
  }

  async findBySaleItemIds(saleItemIds: string[]): Promise<Commission[]> {
    if (!saleItemIds || saleItemIds.length === 0) {
      return [];
    }

    return this.commissionsRepository.find({
      where: { saleItemId: In(saleItemIds) },
      relations: ['salonEmployee', 'salonEmployee.user', 'saleItem'],
    });
  }

  /**
   * Mark a commission as paid and automatically add the amount to employee's wallet
   *
   * Flow:
   * 1. Load commission with employee and user relations
   * 2. Check if already paid (prevent duplicate wallet deposits)
   * 3. Mark commission as paid in database
   * 4. Get or create employee's wallet
   * 5. Add commission amount to wallet balance
   * 6. Create wallet transaction record linked to commission
   * 7. Send notification to employee
   *
   * @param commissionId - ID of the commission to mark as paid
   * @param paymentDetails - Optional payment details (method, reference, etc.)
   * @returns Updated commission record
   */
  async markAsPaid(
    commissionId: string,
    paymentDetails?: {
      paymentMethod?: 'cash' | 'bank_transfer' | 'mobile_money' | 'payroll';
      paymentReference?: string;
      paidById?: string;
      payrollItemId?: string;
    },
  ): Promise<Commission> {
    const commission = await this.commissionsRepository.findOne({
      where: { id: commissionId },
      relations: ['salonEmployee', 'salonEmployee.user', 'salonEmployee.salon'],
    });

    if (!commission) {
      throw new Error('Commission not found');
    }

    // Check if already paid to avoid duplicate wallet deposits
    if (commission.paid) {
      this.logger.warn(
        `Commission ${commissionId} is already marked as paid. Skipping wallet deposit.`,
      );
      return commission;
    }

    commission.paid = true;
    commission.paidAt = new Date();

    if (paymentDetails) {
      if (paymentDetails.paymentMethod) {
        commission.paymentMethod = paymentDetails.paymentMethod;
      }
      if (paymentDetails.paymentReference) {
        commission.paymentReference = paymentDetails.paymentReference;
      }
      if (paymentDetails.paidById) {
        commission.paidById = paymentDetails.paidById;
      }
      if (paymentDetails.payrollItemId) {
        commission.payrollItemId = paymentDetails.payrollItemId;
      }
    }

    // Get salon owner ID for wallet deduction
    const salonOwnerId = commission.salonEmployee?.salon?.ownerId;
    const commissionAmount = Number(commission.amount);
    const employeeUserId = commission.salonEmployee?.user?.id;

    // Validate payment prerequisites
    if (!salonOwnerId) {
      throw new BadRequestException(
        'Cannot process payment: Salon owner not found for this commission',
      );
    }

    if (!employeeUserId) {
      throw new BadRequestException(
        'Cannot process payment: Employee user not found for this commission',
      );
    }

    if (commissionAmount <= 0) {
      throw new BadRequestException(
        'Cannot process payment: Commission amount must be greater than zero',
      );
    }

    this.logger.log(
      `[COMMISSION PAYMENT] Processing commission ${commissionId}: ` +
        `Owner ${salonOwnerId} → Employee ${employeeUserId} (Amount: RWF ${commissionAmount.toLocaleString()})`,
    );

    // Use database transaction to ensure atomicity - prevent race conditions and data loss
    return this.dataSource.transaction(async (manager) => {
      // Get or create wallets WITHIN transaction (ensures consistency)
      let ownerWallet = await manager.findOne(Wallet, {
        where: { userId: salonOwnerId },
      });

      if (!ownerWallet) {
        ownerWallet = manager.create(Wallet, {
          userId: salonOwnerId,
          balance: 0,
          currency: 'RWF',
        });
        ownerWallet = await manager.save(ownerWallet);
      }

      // Check balance WITHIN transaction using pessimistic lock to prevent race conditions
      const ownerBalance = Number(ownerWallet.balance);

      if (ownerBalance < commissionAmount) {
        throw new BadRequestException(
          `Insufficient wallet balance. Current balance: RWF ${ownerBalance.toLocaleString()}, Required: RWF ${commissionAmount.toLocaleString()}`,
        );
      }

      // Get or create employee wallet
      let employeeWallet = await manager.findOne(Wallet, {
        where: { userId: employeeUserId },
      });

      if (!employeeWallet) {
        employeeWallet = manager.create(Wallet, {
          userId: employeeUserId,
          balance: 0,
          currency: 'RWF',
        });
        employeeWallet = await manager.save(employeeWallet);
      }

      const employeeBalanceBefore = Number(employeeWallet.balance);

      // Step 1: Deduct from salon owner's wallet (atomic within transaction)
      const ownerBalanceAfter = ownerBalance - commissionAmount;
      await manager.update(
        Wallet,
        { id: ownerWallet.id },
        { balance: ownerBalanceAfter },
      );

      // Create owner transaction record with status
      const ownerTransaction = manager.create(WalletTransaction, {
        walletId: ownerWallet.id,
        transactionType: WalletTransactionType.TRANSFER,
        amount: commissionAmount,
        balanceBefore: ownerBalance,
        balanceAfter: ownerBalanceAfter,
        status: WalletTransactionStatus.COMPLETED, // Explicitly set status
        description: `Commission payment to employee - Commission ID: ${commissionId}${commission.saleItemId ? `, Sale Item: ${commission.saleItemId}` : ''}`,
        referenceType: 'commission_payment',
        referenceId: commissionId,
        metadata: {
          commissionId: commissionId,
          employeeUserId: employeeUserId,
          paymentMethod: paymentDetails?.paymentMethod || null,
          paymentReference: paymentDetails?.paymentReference || null,
          paidById: paymentDetails?.paidById || null,
        },
      });
      const savedOwnerTransaction = await manager.save(ownerTransaction);

      this.logger.log(
        `[COMMISSION PAYMENT] Owner transaction created: ID=${savedOwnerTransaction.id}, Status=${savedOwnerTransaction.status}, Amount=RWF ${commissionAmount.toLocaleString()}`,
      );

      // Step 2: Add to employee's wallet (atomic within transaction)
      const employeeBalanceAfter = employeeBalanceBefore + commissionAmount;
      await manager.update(
        Wallet,
        { id: employeeWallet.id },
        { balance: employeeBalanceAfter },
      );

      // Create employee transaction record with status
      const employeeTransaction = manager.create(WalletTransaction, {
        walletId: employeeWallet.id,
        transactionType: WalletTransactionType.COMMISSION,
        amount: commissionAmount,
        balanceBefore: employeeBalanceBefore,
        balanceAfter: employeeBalanceAfter,
        status: WalletTransactionStatus.COMPLETED, // Explicitly set status
        description: `Commission payment - Commission ID: ${commissionId}${commission.saleItemId ? `, Sale Item: ${commission.saleItemId}` : ''}`,
        referenceType: 'commission',
        referenceId: commissionId,
        metadata: {
          commissionId: commissionId,
          salonOwnerId: salonOwnerId,
          paymentMethod: paymentDetails?.paymentMethod || null,
          paymentReference: paymentDetails?.paymentReference || null,
          paidById: paymentDetails?.paidById || null,
        },
      });
      const savedEmployeeTransaction = await manager.save(employeeTransaction);

      this.logger.log(
        `[COMMISSION PAYMENT] Employee transaction created: ID=${savedEmployeeTransaction.id}, Status=${savedEmployeeTransaction.status}, Amount=RWF ${commissionAmount.toLocaleString()}`,
      );

      // Step 3: Mark commission as paid (atomic within transaction)
      commission.paid = true;
      commission.paidAt = new Date();

      if (paymentDetails) {
        if (paymentDetails.paymentMethod) {
          commission.paymentMethod = paymentDetails.paymentMethod;
        }
        if (paymentDetails.paymentReference) {
          commission.paymentReference = paymentDetails.paymentReference;
        }
        if (paymentDetails.paidById) {
          commission.paidById = paymentDetails.paidById;
        }
        if (paymentDetails.payrollItemId) {
          commission.payrollItemId = paymentDetails.payrollItemId;
        }
      }

      const savedCommission = await manager.save(commission);

      this.logger.log(
        `[COMMISSION PAYMENT] ✅ SUCCESS - Commission ${commissionId} (RWF ${commissionAmount.toLocaleString()}) processed atomically. ` +
          `Owner: RWF ${ownerBalance.toLocaleString()} → RWF ${ownerBalanceAfter.toLocaleString()}. ` +
          `Employee: RWF ${employeeBalanceBefore.toLocaleString()} → RWF ${employeeBalanceAfter.toLocaleString()}. ` +
          `Owner Transaction: ${savedOwnerTransaction.id} (Status: ${savedOwnerTransaction.status}), ` +
          `Employee Transaction: ${savedEmployeeTransaction.id} (Status: ${savedEmployeeTransaction.status})`,
      );

      // Send notification for commission paid (outside transaction for performance)
      if (commission.salonEmployee?.user?.id) {
        // Don't await - send notification asynchronously to not block transaction
        this.notificationOrchestrator
          .notify(NotificationType.COMMISSION_PAID, {
            userId: commission.salonEmployee.user.id,
            recipientEmail: commission.salonEmployee.user.email,
            commissionId: savedCommission.id,
            commissionAmount: `RWF ${savedCommission.amount.toLocaleString()}`,
          })
          .catch((error) => {
            this.logger.warn(
              `Failed to send commission paid notification: ${error.message}`,
            );
          });
      }

      return savedCommission;
    });
  }

  async markMultipleAsPaid(
    commissionIds: string[],
    paymentDetails?: {
      paymentMethod?: 'cash' | 'bank_transfer' | 'mobile_money' | 'payroll';
      paymentReference?: string;
      paidById?: string;
      payrollItemId?: string;
    },
  ): Promise<Commission[]> {
    const commissions = await this.findByIds(commissionIds);

    // Track which commissions are being marked as paid (not already paid)
    const commissionsToPay = commissions.filter((c) => !c.paid);

    // Calculate total amount needed and validate all commissions
    let totalAmount = 0;
    const salonOwnerIds = new Set<string>();

    for (const commission of commissionsToPay) {
      const salonOwnerId = commission.salonEmployee?.salon?.ownerId;
      const employeeUserId = commission.salonEmployee?.user?.id;
      const commissionAmount = Number(commission.amount);

      if (!salonOwnerId) {
        throw new BadRequestException(
          `Cannot process payment: Salon owner not found for commission ${commission.id}`,
        );
      }

      if (!employeeUserId) {
        throw new BadRequestException(
          `Cannot process payment: Employee user not found for commission ${commission.id}`,
        );
      }

      if (commissionAmount <= 0) {
        throw new BadRequestException(
          `Cannot process payment: Commission ${commission.id} has invalid amount`,
        );
      }

      salonOwnerIds.add(salonOwnerId);
      totalAmount += commissionAmount;
    }

    // Check if all commissions belong to the same salon owner (for batch payment)
    if (salonOwnerIds.size > 1) {
      throw new BadRequestException(
        'Cannot process batch payment: Commissions belong to different salon owners',
      );
    }

    const salonOwnerId = Array.from(salonOwnerIds)[0];

    // Check salon owner's wallet balance BEFORE processing
    const ownerWallet =
      await this.walletsService.getOrCreateWallet(salonOwnerId);
    const ownerBalance = Number(ownerWallet.balance);

    if (ownerBalance < totalAmount) {
      throw new BadRequestException(
        `Insufficient wallet balance. Current balance: RWF ${ownerBalance.toLocaleString()}, Required: RWF ${totalAmount.toLocaleString()}`,
      );
    }

    this.logger.log(
      `[BATCH COMMISSION PAYMENT] Processing ${commissionsToPay.length} commissions (Total: RWF ${totalAmount.toLocaleString()}) ` +
        `from owner ${salonOwnerId} (Balance: RWF ${ownerBalance.toLocaleString()})`,
    );

    // Use database transaction to ensure atomicity - prevent race conditions and data loss
    return this.dataSource.transaction(async (manager) => {
      // Get or create owner wallet WITHIN transaction
      let ownerWallet = await manager.findOne(Wallet, {
        where: { userId: salonOwnerId },
      });

      if (!ownerWallet) {
        ownerWallet = manager.create(Wallet, {
          userId: salonOwnerId,
          balance: 0,
          currency: 'RWF',
        });
        ownerWallet = await manager.save(ownerWallet);
      }

      // Check balance WITHIN transaction to prevent race conditions
      const ownerBalanceInTx = Number(ownerWallet.balance);

      if (ownerBalanceInTx < totalAmount) {
        throw new BadRequestException(
          `Insufficient wallet balance. Current balance: RWF ${ownerBalanceInTx.toLocaleString()}, Required: RWF ${totalAmount.toLocaleString()}`,
        );
      }

      const savedCommissions: Commission[] = [];
      let runningOwnerBalance = ownerBalanceInTx;

      // Process each commission atomically
      for (const commission of commissionsToPay) {
        const employeeUserId = commission.salonEmployee!.user!.id;
        const commissionAmount = Number(commission.amount);

        // Get or create employee wallet
        let employeeWallet = await manager.findOne(Wallet, {
          where: { userId: employeeUserId },
        });

        if (!employeeWallet) {
          employeeWallet = manager.create(Wallet, {
            userId: employeeUserId,
            balance: 0,
            currency: 'RWF',
          });
          employeeWallet = await manager.save(employeeWallet);
        }

        const employeeBalanceBefore = Number(employeeWallet.balance);

        // Deduct from owner's wallet
        runningOwnerBalance -= commissionAmount;
        await manager.update(
          Wallet,
          { id: ownerWallet.id },
          { balance: runningOwnerBalance },
        );

        // Create owner transaction record with status
        const ownerTransaction = manager.create(WalletTransaction, {
          walletId: ownerWallet.id,
          transactionType: WalletTransactionType.TRANSFER,
          amount: commissionAmount,
          balanceBefore: runningOwnerBalance + commissionAmount,
          balanceAfter: runningOwnerBalance,
          status: WalletTransactionStatus.COMPLETED, // Explicitly set status
          description: `Batch commission payment to employee - Commission ID: ${commission.id}`,
          referenceType: 'commission_payment',
          referenceId: commission.id,
          metadata: {
            commissionId: commission.id,
            employeeUserId: employeeUserId,
            paymentMethod: paymentDetails?.paymentMethod || null,
            paymentReference: paymentDetails?.paymentReference || null,
            paidById: paymentDetails?.paidById || null,
            batchPayment: true,
          },
        });
        const savedOwnerTransaction = await manager.save(ownerTransaction);

        // Add to employee's wallet
        const employeeBalanceAfter = employeeBalanceBefore + commissionAmount;
        await manager.update(
          Wallet,
          { id: employeeWallet.id },
          { balance: employeeBalanceAfter },
        );

        // Create employee transaction record with status
        const employeeTransaction = manager.create(WalletTransaction, {
          walletId: employeeWallet.id,
          transactionType: WalletTransactionType.COMMISSION,
          amount: commissionAmount,
          balanceBefore: employeeBalanceBefore,
          balanceAfter: employeeBalanceAfter,
          status: WalletTransactionStatus.COMPLETED, // Explicitly set status
          description: `Commission payment - Commission ID: ${commission.id}${commission.saleItemId ? `, Sale Item: ${commission.saleItemId}` : ''}`,
          referenceType: 'commission',
          referenceId: commission.id,
          metadata: {
            commissionId: commission.id,
            salonOwnerId: salonOwnerId,
            paymentMethod: paymentDetails?.paymentMethod || null,
            paymentReference: paymentDetails?.paymentReference || null,
            paidById: paymentDetails?.paidById || null,
            batchPayment: true,
          },
        });
        const savedEmployeeTransaction =
          await manager.save(employeeTransaction);

        this.logger.log(
          `[BATCH COMMISSION PAYMENT] Transaction created: Owner=${savedOwnerTransaction.id} (Status: ${savedOwnerTransaction.status}), Employee=${savedEmployeeTransaction.id} (Status: ${savedEmployeeTransaction.status})`,
        );

        // Mark commission as paid
        commission.paid = true;
        commission.paidAt = new Date();

        if (paymentDetails) {
          if (paymentDetails.paymentMethod) {
            commission.paymentMethod = paymentDetails.paymentMethod;
          }
          if (paymentDetails.paymentReference) {
            commission.paymentReference = paymentDetails.paymentReference;
          }
          if (paymentDetails.paidById) {
            commission.paidById = paymentDetails.paidById;
          }
          if (paymentDetails.payrollItemId) {
            commission.payrollItemId = paymentDetails.payrollItemId;
          }
        }

        const savedCommission = await manager.save(commission);
        savedCommissions.push(savedCommission);

        this.logger.log(
          `[BATCH COMMISSION PAYMENT] ✅ Processed commission ${commission.id} (RWF ${commissionAmount.toLocaleString()})`,
        );
      }

      this.logger.log(
        `[BATCH COMMISSION PAYMENT] ✅ SUCCESS - All ${commissionsToPay.length} commissions processed atomically. ` +
          `Owner balance: RWF ${ownerBalanceInTx.toLocaleString()} → RWF ${runningOwnerBalance.toLocaleString()}`,
      );

      // Send notifications asynchronously (outside transaction)
      for (const commission of savedCommissions) {
        if (commission.salonEmployee?.user?.id) {
          this.notificationOrchestrator
            .notify(NotificationType.COMMISSION_PAID, {
              userId: commission.salonEmployee.user.id,
              recipientEmail: commission.salonEmployee.user.email,
              commissionId: commission.id,
              commissionAmount: `RWF ${commission.amount.toLocaleString()}`,
            })
            .catch((error) => {
              this.logger.warn(
                `Failed to send commission paid notification for ${commission.id}: ${error.message}`,
              );
            });
        }
      }

      return savedCommissions;
    });
  }

  async getEmployeeCommissionSummary(
    salonEmployeeId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalCommissions: number;
    paidCommissions: number;
    unpaidCommissions: number;
    totalSales: number;
    count: number;
  }> {
    const query = this.commissionsRepository
      .createQueryBuilder('commission')
      .where('commission.salonEmployeeId = :salonEmployeeId', {
        salonEmployeeId,
      });

    if (startDate) {
      query.andWhere('commission.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('commission.createdAt <= :endDate', { endDate });
    }

    const commissions = await query.getMany();

    const totalCommissions = commissions.reduce(
      (sum, c) => sum + Number(c.amount),
      0,
    );
    const paidCommissions = commissions
      .filter((c) => c.paid)
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const unpaidCommissions = totalCommissions - paidCommissions;
    const totalSales = commissions.reduce(
      (sum, c) => sum + Number(c.saleAmount),
      0,
    );

    return {
      totalCommissions,
      paidCommissions,
      unpaidCommissions,
      totalSales,
      count: commissions.length,
    };
  }
}
