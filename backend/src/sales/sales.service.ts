import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, QueryFailedError } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { InventoryService } from '../inventory/inventory.service';
import { InventoryMovementType } from '../inventory/entities/inventory-movement.entity';
import { AccountingService } from '../accounting/accounting.service';
import {
  ChartOfAccount,
  AccountType,
} from '../accounting/entities/chart-of-account.entity';
import { JournalEntryStatus } from '../accounting/entities/journal-entry.entity';
import { CommissionsService } from '../commissions/commissions.service';
import { SalonCustomerService } from '../customers/salon-customer.service';
import { LoyaltyPointsService } from '../customers/loyalty-points.service';
import { LoyaltyPointSourceType } from '../customers/entities/loyalty-point-transaction.entity';
import { RewardsConfigService } from '../customers/rewards-config.service';
import { NotificationOrchestratorService } from '../notifications/services/notification-orchestrator.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import { AppointmentStatus } from '../appointments/entities/appointment.entity';

export interface SaleWithDetails extends Sale {
  employees?: { id: string; name: string }[];
  totalCommission?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectRepository(Sale)
    private salesRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private saleItemsRepository: Repository<SaleItem>,
    private inventoryService: InventoryService,
    private accountingService: AccountingService,
    private commissionsService: CommissionsService,
    @Inject(forwardRef(() => SalonCustomerService))
    private salonCustomerService: SalonCustomerService,
    @Inject(forwardRef(() => LoyaltyPointsService))
    private loyaltyPointsService: LoyaltyPointsService,
    @Inject(forwardRef(() => RewardsConfigService))
    private rewardsConfigService: RewardsConfigService,
    @Inject(forwardRef(() => NotificationOrchestratorService))
    private notificationOrchestrator: NotificationOrchestratorService,
    @Inject(forwardRef(() => AppointmentsService))
    private appointmentsService: AppointmentsService,
  ) {}

  async create(
    saleData: Partial<Sale>,
    items: Partial<SaleItem>[],
  ): Promise<Sale> {
    try {
      const sale = this.salesRepository.create(saleData);
      const savedSale = await this.salesRepository.save(sale);

      if (items && items.length > 0) {
        await this.createSaleItems(savedSale.id, items);
        await this.processInventoryMovements(savedSale, items, saleData);
        await this.processCommissions(savedSale.id);
      }

      await this.createSaleJournalEntry(savedSale, items || []);

      // Update appointment status if this sale is linked to an appointment
      if ((saleData as any).appointmentId) {
        try {
          await this.appointmentsService.update((saleData as any).appointmentId, {
            status: AppointmentStatus.COMPLETED,
            skipSaleCreation: true,
          });
          this.logger.log(
            `Updated appointment ${(saleData as any).appointmentId} status to COMPLETED`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to update appointment status: ${error.message}`,
          );
        }
      }

      // Record customer visit if customer is associated
      if (savedSale.customerId && savedSale.salonId) {
        try {
          const saleAmount = Number(savedSale.totalAmount) || 0;
          const saleDate = savedSale.createdAt || new Date();
          await this.salonCustomerService.recordVisit(
            savedSale.salonId,
            savedSale.customerId,
            saleAmount,
            saleDate,
          );
          this.logger.debug(
            `Recorded sale visit for customer ${savedSale.customerId} at salon ${savedSale.salonId}`,
          );
        } catch (error) {
          // Log but don't fail sale creation if visit tracking fails
          this.logger.warn(
            `Failed to record customer visit: ${error.message}`,
            error.stack,
          );
        }

        // Award loyalty points for sale
        try {
          const saleAmount = Number(savedSale.totalAmount) || 0;
          if (saleAmount > 0 && savedSale.salonId && savedSale.customerId) {
            // Get rewards config for the salon (defaults to 0.01 if not configured)
            const rewardsConfig = await this.rewardsConfigService.getOrCreate(
              savedSale.salonId,
            );
            const pointsEarned =
              this.loyaltyPointsService.calculatePointsEarned(
                saleAmount,
                Number(rewardsConfig.pointsPerCurrencyUnit),
              );
            if (pointsEarned > 0) {
              await this.loyaltyPointsService.addPoints(
                savedSale.customerId,
                pointsEarned,
                {
                  sourceType: LoyaltyPointSourceType.SALE,
                  sourceId: savedSale.id,
                  description: `Points earned from sale ${savedSale.id.slice(0, 8)} - Amount: RWF ${saleAmount.toLocaleString()}`,
                },
              );
              this.logger.log(
                `Awarded ${pointsEarned} loyalty points to customer ${savedSale.customerId} for sale ${savedSale.id}`,
              );

              // Send notification for points earned
              try {
                const sale = await this.findOne(savedSale.id);
                await this.notificationOrchestrator.notify(
                  NotificationType.POINTS_EARNED,
                  {
                    customerId: savedSale.customerId,
                    saleId: savedSale.id,
                    recipientEmail: sale.customer?.email,
                    customerName: sale.customer?.fullName,
                    salonName: sale.salon?.name,
                    pointsEarned,
                    pointsBalance: sale.customer?.loyaltyPoints || 0,
                  },
                );
              } catch (error) {
                this.logger.warn(
                  `Failed to send points earned notification: ${error.message}`,
                );
              }
            }
          }
        } catch (error) {
          // Log but don't fail sale creation if points awarding fails
          this.logger.warn(
            `Failed to award loyalty points for sale: ${error.message}`,
            error.stack,
          );
        }

        // Send sale completed notification
        try {
          const sale = await this.findOne(savedSale.id);
          const notificationSaleAmount = Number(savedSale.totalAmount) || 0;
          const notificationRewardsConfig =
            await this.rewardsConfigService.getOrCreate(savedSale.salonId);
          const notificationPointsEarned =
            this.loyaltyPointsService.calculatePointsEarned(
              notificationSaleAmount,
              Number(notificationRewardsConfig.pointsPerCurrencyUnit),
            );

          // Notify customer
          await this.notificationOrchestrator.notify(
            NotificationType.SALE_COMPLETED,
            {
              customerId: savedSale.customerId,
              saleId: savedSale.id,
              recipientEmail: sale.customer?.email,
              customerName: sale.customer?.fullName,
              salonName: sale.salon?.name,
              saleAmount: `RWF ${notificationSaleAmount.toLocaleString()}`,
              paymentMethod: savedSale.paymentMethod || 'Unknown',
              pointsEarned: notificationPointsEarned || 0,
              saleItems: sale.items?.map((item) => ({
                name:
                  item.product?.name || item.service?.name || 'Unknown Item',
                quantity: item.quantity,
                price: `RWF ${Number(item.unitPrice).toLocaleString()}`,
              })),
            },
          );

          // Notify salon owner
          if (sale.salon?.ownerId) {
            await this.notificationOrchestrator.notify(
              NotificationType.SALE_COMPLETED,
              {
                userId: sale.salon.ownerId,
                recipientEmail: sale.salon.owner?.email,
                customerId: savedSale.customerId,
                saleId: savedSale.id,
                customerName: sale.customer?.fullName,
                salonName: sale.salon?.name,
                saleAmount: `RWF ${notificationSaleAmount.toLocaleString()}`,
                paymentMethod: savedSale.paymentMethod || 'Unknown',
                pointsEarned: notificationPointsEarned || 0,
                saleItems: sale.items?.map((item) => ({
                  name:
                    item.product?.name || item.service?.name || 'Unknown Item',
                  quantity: item.quantity,
                  price: `RWF ${Number(item.unitPrice).toLocaleString()}`,
                })),
              },
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to send sale completed notification: ${error.message}`,
          );
        }
      }

      return this.findOne(savedSale.id);
    } catch (error) {
      this.logger.error(`Failed to create sale: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async createSaleItems(
    saleId: string,
    items: Partial<SaleItem>[],
  ): Promise<SaleItem[]> {
    const insertData = items.map((item, index) => {
      const unitPrice = Number(item.unitPrice) || 0;
      const quantity = Number(item.quantity) || 0;
      const discountAmount = Number(item.discountAmount) || 0;
      const lineTotal = Math.max(0, unitPrice * quantity - discountAmount);

      if (isNaN(lineTotal)) {
        throw new Error(`Invalid lineTotal for item ${index}`);
      }

      const saleItemData = {
        saleId,
        serviceId: item.serviceId || null,
        productId: item.productId || null,
        salonEmployeeId: item.salonEmployeeId || null,
        unitPrice,
        quantity,
        discountAmount,
        lineTotal,
      };

      return saleItemData;
    });

    const queryRunner =
      this.saleItemsRepository.manager.connection.createQueryRunner();

    try {
      await queryRunner.connect();

      for (const data of insertData) {
        const itemId = uuidv4();
        await queryRunner.query(
          `INSERT INTO sale_items (id, sale_id, service_id, product_id, salon_employee_id, unit_price, quantity, discount_amount, line_total) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            itemId,
            data.saleId,
            data.serviceId,
            data.productId,
            data.salonEmployeeId,
            data.unitPrice,
            data.quantity,
            data.discountAmount,
            data.lineTotal,
          ],
        );
      }
    } finally {
      await queryRunner.release();
    }

    return this.saleItemsRepository.find({ where: { saleId } });
  }

  private async processInventoryMovements(
    sale: Sale,
    items: Partial<SaleItem>[],
    saleData: Partial<Sale>,
  ): Promise<void> {
    for (const item of items) {
      // Only process products, not services
      // Services should never affect stock
      if (item.serviceId) {
        // Service sold - skip inventory processing
        this.logger.debug(
          `Skipping inventory movement for service ${item.serviceId} - services do not affect stock`,
        );
        continue;
      }

      // Only process products that are inventory items
      if (item.productId && item.quantity) {
        try {
          // Check if product is an inventory item
          const product = await this.inventoryService
            .findOneProduct(item.productId)
            .catch(() => null);

          if (!product) {
            this.logger.warn(
              `Product ${item.productId} not found - skipping inventory movement`,
            );
            continue;
          }

          // Only create inventory movement if product is marked as inventory item
          if (!product.isInventoryItem) {
            this.logger.debug(
              `Skipping inventory movement for product ${item.productId} (${product.name}) - product is not an inventory item (isInventoryItem = false)`,
            );
            continue;
          }

          const quantity = Math.abs(Number(item.quantity));
          await this.inventoryService.createMovement({
            salonId: saleData.salonId,
            productId: item.productId,
            movementType: InventoryMovementType.CONSUMPTION,
            quantity: quantity,
            referenceId: sale.id,
            performedById: saleData.createdById,
            notes: `Product sold in sale ${sale.id}`,
          });

          this.logger.debug(
            `Created inventory movement for product ${item.productId} (${product.name}) - quantity: ${quantity}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to create inventory movement for product ${item.productId}: ${error.message}`,
            error.stack,
          );
        }
      }
    }
  }

  private async processCommissions(saleId: string): Promise<void> {
    try {
      const items = await this.saleItemsRepository.find({
        where: { saleId },
        relations: [
          'salonEmployee',
          'salonEmployee.user',
          'service',
          'product',
        ],
      });

      let commissionsCreated = 0;
      let commissionsSkipped = 0;

      this.logger.debug(
        `Processing commissions for sale ${saleId} with ${items.length} items`,
      );

      for (const item of items) {
        const itemName = item.service?.name || item.product?.name || 'Unknown';
        const employeeName =
          item.salonEmployee?.user?.fullName ||
          item.salonEmployee?.roleTitle ||
          'Unknown';

        if (!item.salonEmployeeId) {
          this.logger.debug(
            `Skipping commission for sale item ${item.id} (${itemName}): No employee assigned`,
          );
          commissionsSkipped++;
          continue;
        }

        if (!item.lineTotal || Number(item.lineTotal) <= 0) {
          this.logger.warn(
            `Skipping commission for sale item ${item.id} (${itemName}) assigned to ${employeeName}: Line total is ${item.lineTotal} (must be > 0)`,
          );
          commissionsSkipped++;
          continue;
        }

        try {
          const lineTotal = Number(item.lineTotal);

          const commission = await this.commissionsService.createCommission(
            item.salonEmployeeId,
            item.id,
            lineTotal,
            {
              saleId: saleId,
              source: 'sale',
              serviceId: item.serviceId || null,
              productId: item.productId || null,
            },
          );

          if (commission.amount > 0) {
            this.logger.log(
              `✅ Created commission for employee ${employeeName} (${item.salonEmployeeId}) from sale item ${item.id} (${itemName}) - Sale Amount: RWF ${lineTotal}, Commission Rate: ${commission.commissionRate}%, Commission: RWF ${commission.amount}`,
            );
            commissionsCreated++;
          } else {
            this.logger.warn(
              `⚠️ Commission created but amount is 0 for sale item ${item.id} (${itemName}) assigned to ${employeeName} - Employee has ${commission.commissionRate}% commission rate. Commission record created but will show as RWF 0.`,
            );
            commissionsCreated++; // Still count as created even if amount is 0
          }
        } catch (commissionError) {
          this.logger.error(
            `❌ Failed to create commission for sale item ${item.id} (${itemName}) assigned to ${employeeName} (${item.salonEmployeeId}): ${commissionError.message}`,
            commissionError.stack,
          );
          commissionsSkipped++;
        }
      }

      this.logger.log(
        `Commission processing completed for sale ${saleId}: ${commissionsCreated} created, ${commissionsSkipped} skipped`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process commissions for sale ${saleId}: ${error.message}`,
        error.stack,
      );
    }
  }

  private async getOrCreateAccount(
    salonId: string,
    code: string,
    name: string,
    accountType: AccountType,
  ): Promise<ChartOfAccount> {
    // Try to find existing account
    const existing = await this.accountingService.findAccountByCode(
      code,
      salonId,
    );

    if (existing) {
      return existing;
    }

    // Create new account if it doesn't exist
    // Handle race condition: if another request creates the account between
    // the check and create, catch the duplicate key error and fetch it
    try {
      return await this.accountingService.createAccount({
        code,
        name,
        accountType,
        salonId,
        isActive: true,
      });
    } catch (error) {
      // If duplicate key error, account was created by another request
      if (
        error instanceof QueryFailedError &&
        error.message.includes('duplicate key')
      ) {
        const account = await this.accountingService.findAccountByCode(
          code,
          salonId,
        );
        if (account) {
          return account;
        }
      }
      // Re-throw if it's a different error or account still not found
      throw error;
    }
  }

  private async createSaleJournalEntry(
    sale: Sale,
    items: Partial<SaleItem>[],
  ): Promise<void> {
    const salonId = sale.salonId;
    const entryDate = new Date(sale.createdAt);
    const entryNumber = `SALE-${sale.id.slice(0, 8).toUpperCase()}-${Date.now()}`;

    // Get or create default accounts
    const cashAccount = await this.getOrCreateAccount(
      salonId,
      '1010',
      'Cash',
      AccountType.ASSET,
    );

    await this.getOrCreateAccount(
      salonId,
      '1020',
      'Accounts Receivable',
      AccountType.ASSET,
    );

    const salesRevenueAccount = await this.getOrCreateAccount(
      salonId,
      '4000',
      'Sales Revenue',
      AccountType.REVENUE,
    );

    await this.getOrCreateAccount(
      salonId,
      '5000',
      'Cost of Goods Sold',
      AccountType.EXPENSE,
    );

    await this.getOrCreateAccount(
      salonId,
      '1200',
      'Inventory',
      AccountType.ASSET,
    );

    const discountAccount = await this.getOrCreateAccount(
      salonId,
      '4100',
      'Sales Discounts',
      AccountType.REVENUE,
    );

    // Calculate totals
    const totalAmount = Number(sale.totalAmount);
    const totalDiscount = items.reduce(
      (sum, item) => sum + (Number(item.discountAmount) || 0),
      0,
    );
    const netRevenue = totalAmount + totalDiscount; // Total before discount

    // Determine payment method account
    // For cash, card, mobile_money, bank_transfer - use Cash account
    // All current payment methods use Cash account
    const paymentAccount = cashAccount;

    // Build journal entry lines
    const lines: any[] = [];

    // Debit: Cash/Accounts Receivable (total amount received)
    lines.push({
      accountId: paymentAccount.id,
      debitAmount: totalAmount,
      creditAmount: 0,
      description: `Sale ${sale.id.slice(0, 8)} - ${sale.paymentMethod || 'cash'}`,
      referenceType: 'sale',
      referenceId: sale.id,
    });

    // Credit: Sales Revenue (net revenue after discount)
    lines.push({
      accountId: salesRevenueAccount.id,
      debitAmount: 0,
      creditAmount: netRevenue,
      description: `Sales revenue from sale ${sale.id.slice(0, 8)}`,
      referenceType: 'sale',
      referenceId: sale.id,
    });

    // If there's a discount, debit Sales Discounts
    if (totalDiscount > 0) {
      lines.push({
        accountId: discountAccount.id,
        debitAmount: totalDiscount,
        creditAmount: 0,
        description: `Sales discount for sale ${sale.id.slice(0, 8)}`,
        referenceType: 'sale',
        referenceId: sale.id,
      });
    }

    // Note: COGS and Inventory entries are skipped as product costs are not tracked
    // To implement: track product costs and create COGS/Inventory journal entries

    // Create the journal entry
    await this.accountingService.createJournalEntry({
      salonId,
      entryNumber,
      entryDate,
      description: `Sale transaction ${sale.id.slice(0, 8)} - Customer: ${sale.customerId ? 'Yes' : 'Walk-in'}`,
      status: JournalEntryStatus.POSTED, // Auto-post sales entries
      createdById: sale.createdById,
      lines,
    });
  }

  async findAll(
    salonId?: string,
    page: number = 1,
    limit: number = 10,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PaginatedResult<SaleWithDetails>> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.salesRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.customer', 'customer')
      .leftJoinAndSelect('sale.createdBy', 'createdBy')
      .leftJoinAndSelect('sale.salon', 'salon')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('items.service', 'service')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.salonEmployee', 'salonEmployee')
      .leftJoinAndSelect('salonEmployee.user', 'employeeUser');

    if (salonId) {
      queryBuilder.andWhere('sale.salonId = :salonId', { salonId });
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      queryBuilder.andWhere('sale.createdAt >= :startDate', {
        startDate: start,
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      queryBuilder.andWhere('sale.createdAt <= :endDate', { endDate: end });
    }

    queryBuilder.orderBy('sale.createdAt', 'DESC');
    queryBuilder.skip(skip);
    queryBuilder.take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return this.enrichSalesWithDetails(data, total, page, limit);
  }

  async findBySalonIds(
    salonIds: string[],
    page: number = 1,
    limit: number = 10,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PaginatedResult<SaleWithDetails>> {
    if (!salonIds || salonIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const skip = (page - 1) * limit;

    // Build query with date filters
    const queryBuilder = this.salesRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.customer', 'customer')
      .leftJoinAndSelect('sale.createdBy', 'createdBy')
      .leftJoinAndSelect('sale.salon', 'salon')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('items.service', 'service')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.salonEmployee', 'salonEmployee')
      .leftJoinAndSelect('salonEmployee.user', 'employeeUser');

    queryBuilder.andWhere('sale.salonId IN (:...salonIds)', { salonIds });

    if (startDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      queryBuilder.andWhere('sale.createdAt >= :startDate', {
        startDate: start,
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      queryBuilder.andWhere('sale.createdAt <= :endDate', { endDate: end });
    }

    queryBuilder.orderBy('sale.createdAt', 'DESC');
    queryBuilder.skip(skip);
    queryBuilder.take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return this.enrichSalesWithDetails(data, total, page, limit);
  }

  async findByCustomerId(
    customerId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResult<SaleWithDetails>> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.salesRepository.findAndCount({
      where: { customerId },
      relations: [
        'customer',
        'createdBy',
        'salon',
        'items',
        'items.service',
        'items.product',
        'items.salonEmployee',
        'items.salonEmployee.user',
      ],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return this.enrichSalesWithDetails(data, total, page, limit);
  }

  async findByEmployeeId(
    employeeId: string,
    page: number = 1,
    limit: number = 10,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PaginatedResult<SaleWithDetails>> {
    const skip = (page - 1) * limit;

    // Query sales where at least one item is assigned to this employee
    const queryBuilder = this.salesRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.customer', 'customer')
      .leftJoinAndSelect('sale.createdBy', 'createdBy')
      .leftJoinAndSelect('sale.salon', 'salon')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('items.service', 'service')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.salonEmployee', 'salonEmployee')
      .leftJoinAndSelect('salonEmployee.user', 'employeeUser')
      .where('items.salonEmployeeId = :employeeId', { employeeId });

    if (startDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      queryBuilder.andWhere('sale.createdAt >= :startDate', {
        startDate: start,
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      queryBuilder.andWhere('sale.createdAt <= :endDate', { endDate: end });
    }

    queryBuilder.orderBy('sale.createdAt', 'DESC');
    queryBuilder.skip(skip);
    queryBuilder.take(limit);

    // Use distinct to avoid duplicate sales when employee has multiple items
    queryBuilder.distinct(true);

    const [data, total] = await queryBuilder.getManyAndCount();

    return this.enrichSalesWithDetails(data, total, page, limit);
  }

  private async enrichSalesWithDetails(
    sales: Sale[],
    total: number,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<SaleWithDetails>> {
    if (sales.length === 0) {
      return {
        data: [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const saleIds = sales.map((s) => s.id);
    const allItems = await this.saleItemsRepository.find({
      where: { saleId: In(saleIds) },
      relations: ['service', 'product', 'salonEmployee', 'salonEmployee.user'],
    });

    const itemIds = allItems.map((item) => item.id);
    const commissions =
      itemIds.length > 0
        ? await this.commissionsService.findBySaleItemIds(itemIds)
        : [];

    const commissionsByItem = new Map<string, any[]>();
    commissions.forEach((commission) => {
      if (commission.saleItemId) {
        if (!commissionsByItem.has(commission.saleItemId)) {
          commissionsByItem.set(commission.saleItemId, []);
        }
        commissionsByItem.get(commission.saleItemId).push(commission);
      }
    });

    const salesWithDetails: SaleWithDetails[] = sales.map((sale) => {
      const saleItems = allItems.filter((item) => item.saleId === sale.id);
      const employees = new Map<string, { id: string; name: string }>();
      let totalCommission = 0;

      saleItems.forEach((item) => {
        if (item.salonEmployee) {
          const empId = item.salonEmployee.id;
          if (!employees.has(empId)) {
            employees.set(empId, {
              id: empId,
              name: item.salonEmployee.user?.fullName || 'Unknown Employee',
            });
          }
        }

        const itemCommissions = commissionsByItem.get(item.id) || [];
        itemCommissions.forEach((comm) => {
          totalCommission += Number(comm.amount) || 0;
        });
      });

      return {
        ...sale,
        employees: Array.from(employees.values()),
        totalCommission,
      };
    });

    return {
      data: salesWithDetails,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Sale | null> {
    const sale = await this.salesRepository.findOne({
      where: { id },
      relations: [
        'customer',
        'createdBy',
        'salon',
        'salon.owner',
        'items',
        'items.service',
        'items.product',
        'items.salonEmployee',
        'items.salonEmployee.user',
      ],
    });

    return sale;
  }

  async diagnoseCommissionIssues(saleId: string): Promise<{
    saleId: string;
    saleFound: boolean;
    items: Array<{
      itemId: string;
      itemName: string;
      serviceId?: string;
      productId?: string;
      lineTotal: number;
      salonEmployeeId?: string;
      employeeName?: string;
      employeeCommissionRate?: number;
      hasCommission: boolean;
      commissionAmount?: number;
      issue?: string;
    }>;
    summary: {
      totalItems: number;
      itemsWithEmployee: number;
      itemsWithCommissions: number;
      itemsWithoutCommissions: number;
      issues: string[];
    };
  }> {
    const sale = await this.findOne(saleId);

    if (!sale) {
      return {
        saleId,
        saleFound: false,
        items: [],
        summary: {
          totalItems: 0,
          itemsWithEmployee: 0,
          itemsWithCommissions: 0,
          itemsWithoutCommissions: 0,
          issues: ['Sale not found'],
        },
      };
    }

    const items = await this.saleItemsRepository.find({
      where: { saleId },
      relations: ['salonEmployee', 'salonEmployee.user', 'service', 'product'],
    });

    const itemIds = items.map((item) => item.id);
    const existingCommissions =
      itemIds.length > 0
        ? await this.commissionsService.findBySaleItemIds(itemIds)
        : [];

    const commissionsByItem = new Map<string, any[]>();
    existingCommissions.forEach((commission) => {
      if (commission.saleItemId) {
        if (!commissionsByItem.has(commission.saleItemId)) {
          commissionsByItem.set(commission.saleItemId, []);
        }
        commissionsByItem.get(commission.saleItemId)!.push(commission);
      }
    });

    const diagnosticItems = items.map((item) => {
      const itemName = item.service?.name || item.product?.name || 'Unknown';
      const employeeName =
        item.salonEmployee?.user?.fullName || item.salonEmployee?.roleTitle;
      const commissionRate = item.salonEmployee?.commissionRate;
      const lineTotal = Number(item.lineTotal) || 0;
      const hasCommission = commissionsByItem.has(item.id);
      const commissions = commissionsByItem.get(item.id) || [];
      const commissionAmount = commissions.reduce(
        (sum, c) => sum + Number(c.amount),
        0,
      );

      let issue: string | undefined;
      if (!item.salonEmployeeId) {
        issue = 'No employee assigned to this sale item';
      } else if (lineTotal <= 0) {
        issue = `Line total is ${lineTotal} (must be > 0)`;
      } else if (
        commissionRate === 0 ||
        commissionRate === null ||
        commissionRate === undefined
      ) {
        issue = `Employee has ${commissionRate}% commission rate (must be > 0)`;
      } else if (!hasCommission) {
        issue = 'Commission was not created (check backend logs for errors)';
      } else if (commissionAmount === 0) {
        issue = `Commission created but amount is 0 (employee has ${commissionRate}% rate)`;
      }

      return {
        itemId: item.id,
        itemName,
        serviceId: item.serviceId || undefined,
        productId: item.productId || undefined,
        lineTotal,
        salonEmployeeId: item.salonEmployeeId || undefined,
        employeeName: employeeName || undefined,
        employeeCommissionRate:
          commissionRate !== undefined ? Number(commissionRate) : undefined,
        hasCommission,
        commissionAmount: hasCommission ? commissionAmount : undefined,
        issue,
      };
    });

    const itemsWithEmployee = diagnosticItems.filter(
      (item) => item.salonEmployeeId,
    ).length;
    const itemsWithCommissions = diagnosticItems.filter(
      (item) => item.hasCommission,
    ).length;
    const itemsWithoutCommissions = diagnosticItems.filter(
      (item) => !item.hasCommission && item.salonEmployeeId,
    ).length;
    const issues = diagnosticItems
      .filter((item) => item.issue)
      .map((item) => `${item.itemName}: ${item.issue}`);

    return {
      saleId,
      saleFound: true,
      items: diagnosticItems,
      summary: {
        totalItems: items.length,
        itemsWithEmployee,
        itemsWithCommissions,
        itemsWithoutCommissions,
        issues,
      },
    };
  }

  async reprocessCommissions(saleId: string): Promise<{
    success: boolean;
    commissionsCreated: number;
    commissionsSkipped: number;
    message: string;
  }> {
    try {
      // Check if commissions already exist
      const items = await this.saleItemsRepository.find({
        where: { saleId },
        relations: ['salonEmployee', 'service', 'product'],
      });

      const itemIds = items.map((item) => item.id);
      const existingCommissions =
        itemIds.length > 0
          ? await this.commissionsService.findBySaleItemIds(itemIds)
          : [];

      // Only process items that don't have commissions yet
      const itemsWithoutCommissions = items.filter((item) => {
        return !existingCommissions.some((comm) => comm.saleItemId === item.id);
      });

      let commissionsCreated = 0;
      let commissionsSkipped = 0;

      for (const item of itemsWithoutCommissions) {
        if (
          item.salonEmployeeId &&
          item.lineTotal &&
          Number(item.lineTotal) > 0
        ) {
          try {
            const commission = await this.commissionsService.createCommission(
              item.salonEmployeeId,
              item.id,
              Number(item.lineTotal),
              {
                saleId: saleId,
                source: 'sale',
                serviceId: item.serviceId || null,
                productId: item.productId || null,
              },
            );
            commissionsCreated++;
            this.logger.log(
              `✅ Retroactively created commission for sale ${saleId}, item ${item.id}: RWF ${commission.amount}`,
            );
          } catch (error) {
            commissionsSkipped++;
            this.logger.error(
              `Failed to retroactively create commission for sale ${saleId}, item ${item.id}: ${error.message}`,
            );
          }
        } else {
          commissionsSkipped++;
        }
      }

      return {
        success: true,
        commissionsCreated,
        commissionsSkipped,
        message: `Processed ${itemsWithoutCommissions.length} items: ${commissionsCreated} commissions created, ${commissionsSkipped} skipped`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to reprocess commissions for sale ${saleId}: ${error.message}`,
      );
      return {
        success: false,
        commissionsCreated: 0,
        commissionsSkipped: 0,
        message: `Error: ${error.message}`,
      };
    }
  }

  async getCustomerStatistics(customerId: string): Promise<{
    totalSpent: number;
    totalVisits: number;
    averageOrderValue: number;
    lastVisitDate: Date | null;
    favoriteSalon: { id: string; name: string; visits: number } | null;
  }> {
    const sales = await this.salesRepository.find({
      where: { customerId },
      relations: ['salon'],
      order: { createdAt: 'DESC' },
    });

    if (sales.length === 0) {
      return {
        totalSpent: 0,
        totalVisits: 0,
        averageOrderValue: 0,
        lastVisitDate: null,
        favoriteSalon: null,
      };
    }

    const totalSpent = sales.reduce(
      (sum, sale) => sum + Number(sale.totalAmount),
      0,
    );
    const totalVisits = sales.length;
    const averageOrderValue = totalSpent / totalVisits;
    const lastVisitDate = sales[0]?.createdAt || null;

    // Find favorite salon (most visits)
    const salonVisits = new Map<
      string,
      { id: string; name: string; visits: number }
    >();
    sales.forEach((sale) => {
      if (sale.salon) {
        const salonId = sale.salon.id;
        if (!salonVisits.has(salonId)) {
          salonVisits.set(salonId, {
            id: salonId,
            name: sale.salon.name,
            visits: 0,
          });
        }
        salonVisits.get(salonId).visits++;
      }
    });

    const favoriteSalon =
      Array.from(salonVisits.values()).sort((a, b) => b.visits - a.visits)[0] ||
      null;

    return {
      totalSpent,
      totalVisits,
      averageOrderValue,
      lastVisitDate,
      favoriteSalon,
    };
  }

  async getAnalyticsSummary(
    salonIds?: string[],
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    let salesResult:
      | {
          data: Sale[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }
      | Sale[];

    if (salonIds && salonIds.length > 0) {
      salesResult = await this.findBySalonIds(salonIds, 1, 10000); // Get all sales with high limit
    } else {
      salesResult = await this.findAll(undefined, 1, 10000); // Get all sales with high limit
    }

    // Extract the sales array from paginated result
    let sales: Sale[] = Array.isArray(salesResult)
      ? salesResult
      : salesResult.data;

    // Filter by date range if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      sales = sales.filter((sale) => {
        const saleDate = new Date(sale.createdAt);
        if (start && saleDate < start) return false;
        if (end && saleDate > end) return false;
        return true;
      });
    }

    // Get sale items for detailed analytics
    const saleIds = sales.map((s) => s.id);
    const allItems =
      saleIds.length > 0
        ? await this.saleItemsRepository.find({
            where: saleIds.map((id) => ({ saleId: id })),
            relations: [
              'service',
              'product',
              'salonEmployee',
              'salonEmployee.user',
            ],
          })
        : [];

    // Calculate totals
    const totalRevenue = sales.reduce(
      (sum, s) => sum + Number(s.totalAmount),
      0,
    );
    const totalSales = sales.length;
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Payment method breakdown
    const paymentMethods = sales.reduce(
      (acc, sale) => {
        const method = sale.paymentMethod || 'unknown';
        acc[method] = (acc[method] || 0) + Number(sale.totalAmount);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Daily revenue (last 30 days)
    const dailyRevenue: Record<string, number> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    sales
      .filter((s) => new Date(s.createdAt) >= thirtyDaysAgo)
      .forEach((sale) => {
        const date = new Date(sale.createdAt).toISOString().split('T')[0];
        dailyRevenue[date] =
          (dailyRevenue[date] || 0) + Number(sale.totalAmount);
      });

    const dailyRevenueArray = Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top services
    const serviceSales: Record<
      string,
      { name: string; count: number; revenue: number }
    > = {};
    allItems
      .filter((item) => item.serviceId)
      .forEach((item) => {
        const serviceId = item.serviceId!;
        if (!serviceSales[serviceId]) {
          serviceSales[serviceId] = {
            name: (item.service as any)?.name || 'Unknown Service',
            count: 0,
            revenue: 0,
          };
        }
        serviceSales[serviceId].count += Number(item.quantity);
        serviceSales[serviceId].revenue += Number(item.lineTotal);
      });

    const topServices = Object.values(serviceSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Top products
    const productSales: Record<
      string,
      { name: string; count: number; revenue: number }
    > = {};
    allItems
      .filter((item) => item.productId)
      .forEach((item) => {
        const productId = item.productId!;
        if (!productSales[productId]) {
          productSales[productId] = {
            name: (item.product as any)?.name || 'Unknown Product',
            count: 0,
            revenue: 0,
          };
        }
        productSales[productId].count += Number(item.quantity);
        productSales[productId].revenue += Number(item.lineTotal);
      });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Employee performance
    const employeeSales: Record<
      string,
      { name: string; sales: number; revenue: number }
    > = {};
    allItems
      .filter((item) => item.salonEmployeeId)
      .forEach((item) => {
        const empId = item.salonEmployeeId!;
        if (!employeeSales[empId]) {
          const employee = item.salonEmployee as any;
          employeeSales[empId] = {
            name:
              employee?.user?.fullName ||
              employee?.roleTitle ||
              'Unknown Employee',
            sales: 0,
            revenue: 0,
          };
        }
        employeeSales[empId].sales += 1;
        employeeSales[empId].revenue += Number(item.lineTotal);
      });

    const topEmployees = Object.values(employeeSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Monthly revenue (last 12 months)
    const monthlyRevenue: Record<string, number> = {};
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    sales
      .filter((s) => new Date(s.createdAt) >= twelveMonthsAgo)
      .forEach((sale) => {
        const date = new Date(sale.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyRevenue[monthKey] =
          (monthlyRevenue[monthKey] || 0) + Number(sale.totalAmount);
      });

    const monthlyRevenueArray = Object.entries(monthlyRevenue)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      summary: {
        totalRevenue,
        totalSales,
        averageSale,
      },
      paymentMethods,
      dailyRevenue: dailyRevenueArray,
      monthlyRevenue: monthlyRevenueArray,
      topServices,
      topProducts,
      topEmployees,
    };
  }
}
