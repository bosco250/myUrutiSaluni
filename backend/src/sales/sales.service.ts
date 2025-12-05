import { Injectable, Logger } from '@nestjs/common';
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
  ) {}

  async create(
    saleData: Partial<Sale>,
    items: Partial<SaleItem>[],
  ): Promise<Sale> {
    try {
      this.logger.debug(`Creating sale with ${items?.length || 0} items`);

      const sale = this.salesRepository.create(saleData);
      const savedSale = await this.salesRepository.save(sale);

      if (items && items.length > 0) {
        await this.createSaleItems(savedSale.id, items);
        await this.processInventoryMovements(savedSale, items, saleData);
        await this.processCommissions(savedSale.id);
      }

      await this.createSaleJournalEntry(savedSale, items || []);

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

      return {
        saleId,
        serviceId: item.serviceId || null,
        productId: item.productId || null,
        salonEmployeeId: item.salonEmployeeId || null,
        unitPrice,
        quantity,
        discountAmount,
        lineTotal,
      };
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
      if (item.productId && item.quantity) {
        try {
          const quantity = Math.abs(Number(item.quantity));
          this.logger.debug(
            `Creating consumption movement: productId=${item.productId}, quantity=${quantity}, saleId=${sale.id}`,
          );

          // For CONSUMPTION, quantity should be positive
          // The stock calculation SQL will negate it: -movement.quantity
          const movement = await this.inventoryService.createMovement({
            salonId: saleData.salonId,
            productId: item.productId,
            movementType: InventoryMovementType.CONSUMPTION,
            quantity: quantity, // Positive quantity for consumption
            referenceId: sale.id,
            performedById: saleData.createdById,
            notes: `Product sold in sale ${sale.id}`,
          });

          this.logger.debug(
            `Inventory movement created: id=${movement.id}, type=${movement.movementType}, quantity=${movement.quantity}`,
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
      const items = await this.saleItemsRepository.find({ where: { saleId } });

      for (const item of items) {
        if (item.salonEmployeeId && item.lineTotal) {
          await this.commissionsService.createCommission(
            item.salonEmployeeId,
            item.id,
            Number(item.lineTotal),
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to create commissions for sale ${saleId}: ${error.message}`,
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
      if (error instanceof QueryFailedError && error.message.includes('duplicate key')) {
        const account = await this.accountingService.findAccountByCode(code, salonId);
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

    const accountsReceivableAccount = await this.getOrCreateAccount(
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

    const cogsAccount = await this.getOrCreateAccount(
      salonId,
      '5000',
      'Cost of Goods Sold',
      AccountType.EXPENSE,
    );

    const inventoryAccount = await this.getOrCreateAccount(
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
  ): Promise<PaginatedResult<SaleWithDetails>> {
    const skip = (page - 1) * limit;
    const where = salonId ? { salonId } : {};

    const [data, total] = await this.salesRepository.findAndCount({
      where,
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

  async findBySalonIds(
    salonIds: string[],
    page: number = 1,
    limit: number = 10,
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

    const [data, total] = await this.salesRepository.findAndCount({
      where: { salonId: In(salonIds) },
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
        'items',
        'items.service',
        'items.product',
        'items.salonEmployee',
        'items.salonEmployee.user',
      ],
    });

    return sale;
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
