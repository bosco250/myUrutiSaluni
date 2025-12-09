import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Customer } from './entities/customer.entity';
import {
  LoyaltyPointTransaction,
  LoyaltyPointSourceType,
} from './entities/loyalty-point-transaction.entity';

@Injectable()
export class LoyaltyPointsService {
  private readonly logger = new Logger(LoyaltyPointsService.name);

  constructor(
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
    @InjectRepository(LoyaltyPointTransaction)
    private transactionsRepository: Repository<LoyaltyPointTransaction>,
    private dataSource: DataSource,
  ) {}

  /**
   * Add points to a customer's account
   */
  async addPoints(
    customerId: string,
    points: number,
    metadata: {
      sourceType: LoyaltyPointSourceType;
      sourceId?: string;
      description?: string;
      createdById?: string;
    },
  ): Promise<LoyaltyPointTransaction> {
    if (points <= 0) {
      throw new BadRequestException('Points must be greater than 0');
    }

    return this.dataSource.transaction(async (manager) => {
      const customer = await manager.findOne(Customer, {
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      const currentBalance = customer.loyaltyPoints || 0;
      const newBalance = currentBalance + points;

      // Update customer balance
      await manager.update(Customer, customerId, {
        loyaltyPoints: newBalance,
      });

      // Create transaction record
      const transaction = manager.create(LoyaltyPointTransaction, {
        customerId,
        points,
        balanceAfter: newBalance,
        sourceType: metadata.sourceType,
        sourceId: metadata.sourceId || null,
        description: metadata.description || null,
        createdById: metadata.createdById || null,
      });

      const savedTransaction = await manager.save(transaction);

      this.logger.log(
        `Added ${points} points to customer ${customerId}. New balance: ${newBalance}`,
      );

      return savedTransaction;
    });
  }

  /**
   * Deduct points from a customer's account
   */
  async deductPoints(
    customerId: string,
    points: number,
    metadata: {
      sourceType: LoyaltyPointSourceType;
      sourceId?: string;
      description?: string;
      createdById?: string;
    },
  ): Promise<LoyaltyPointTransaction> {
    if (points <= 0) {
      throw new BadRequestException('Points must be greater than 0');
    }

    return this.dataSource.transaction(async (manager) => {
      const customer = await manager.findOne(Customer, {
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      const currentBalance = customer.loyaltyPoints || 0;

      if (currentBalance < points) {
        throw new BadRequestException(
          `Insufficient points. Current balance: ${currentBalance}, requested: ${points}`,
        );
      }

      const newBalance = currentBalance - points;

      // Update customer balance
      await manager.update(Customer, customerId, {
        loyaltyPoints: newBalance,
      });

      // Create transaction record (negative points)
      const transaction = manager.create(LoyaltyPointTransaction, {
        customerId,
        points: -points, // Negative for deduction
        balanceAfter: newBalance,
        sourceType: metadata.sourceType,
        sourceId: metadata.sourceId || null,
        description: metadata.description || null,
        createdById: metadata.createdById || null,
      });

      const savedTransaction = await manager.save(transaction);

      this.logger.log(
        `Deducted ${points} points from customer ${customerId}. New balance: ${newBalance}`,
      );

      return savedTransaction;
    });
  }

  /**
   * Manually adjust customer points to a specific balance
   */
  async adjustPoints(
    customerId: string,
    newBalance: number,
    reason: string,
    createdById: string,
  ): Promise<LoyaltyPointTransaction> {
    if (newBalance < 0) {
      throw new BadRequestException('Points balance cannot be negative');
    }

    return this.dataSource.transaction(async (manager) => {
      const customer = await manager.findOne(Customer, {
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      const currentBalance = customer.loyaltyPoints || 0;
      const pointsDifference = newBalance - currentBalance;

      if (pointsDifference === 0) {
        throw new BadRequestException(
          'New balance is the same as current balance',
        );
      }

      // Update customer balance
      await manager.update(Customer, customerId, {
        loyaltyPoints: newBalance,
      });

      // Create transaction record
      const transaction = manager.create(LoyaltyPointTransaction, {
        customerId,
        points: pointsDifference, // Can be positive or negative
        balanceAfter: newBalance,
        sourceType:
          pointsDifference > 0
            ? LoyaltyPointSourceType.MANUAL
            : LoyaltyPointSourceType.CORRECTION,
        sourceId: null,
        description: reason,
        createdById,
      });

      const savedTransaction = await manager.save(transaction);

      this.logger.log(
        `Adjusted points for customer ${customerId} from ${currentBalance} to ${newBalance}. Reason: ${reason}`,
      );

      return savedTransaction;
    });
  }

  /**
   * Get points transaction history for a customer
   */
  async getPointsHistory(
    customerId: string,
    options?: {
      page?: number;
      limit?: number;
      sourceType?: LoyaltyPointSourceType;
    },
  ): Promise<{
    data: LoyaltyPointTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const query = this.transactionsRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.createdBy', 'createdBy')
      .where('transaction.customerId = :customerId', { customerId })
      .orderBy('transaction.createdAt', 'DESC');

    if (options?.sourceType) {
      query.andWhere('transaction.sourceType = :sourceType', {
        sourceType: options.sourceType,
      });
    }

    const [data, total] = await query.skip(skip).take(limit).getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get current points balance for a customer
   */
  async getCurrentBalance(customerId: string): Promise<number> {
    const customer = await this.customersRepository.findOne({
      where: { id: customerId },
      select: ['id', 'loyaltyPoints'],
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    return customer.loyaltyPoints || 0;
  }

  /**
   * Calculate points to earn based on transaction amount
   * Default: 1 point per RWF 100
   */
  calculatePointsEarned(
    amount: number,
    pointsPerCurrencyUnit: number = 0.01,
  ): number {
    return Math.floor(amount * pointsPerCurrencyUnit);
  }

  /**
   * Calculate discount amount from points
   * Default: 100 points = RWF 10 (0.10 per point)
   */
  calculateDiscountFromPoints(
    points: number,
    redemptionRate: number = 0.1,
  ): number {
    return Math.floor(points * redemptionRate);
  }
}
