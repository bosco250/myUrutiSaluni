import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { InventoryService } from '../inventory/inventory.service';
import { InventoryMovementType } from '../inventory/entities/inventory-movement.entity';
import { AccountingService } from '../accounting/accounting.service';
import { ChartOfAccount, AccountType } from '../accounting/entities/chart-of-account.entity';
import { JournalEntryStatus } from '../accounting/entities/journal-entry.entity';
import { CommissionsService } from '../commissions/commissions.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private salesRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private saleItemsRepository: Repository<SaleItem>,
    private inventoryService: InventoryService,
    private accountingService: AccountingService,
    private commissionsService: CommissionsService,
  ) {}

  async create(saleData: Partial<Sale>, items: Partial<SaleItem>[]): Promise<Sale> {
    try {
      console.log('[SALE CREATE] Starting sale creation with', items?.length || 0, 'items');
      const sale = this.salesRepository.create(saleData);
      const savedSale = await this.salesRepository.save(sale);
      console.log('[SALE CREATE] Sale saved with ID:', savedSale.id);
      
      let savedItems: any[] = [];
      if (items && items.length > 0) {
      console.log('[SALE ITEMS] Processing', items.length, 'items for sale:', savedSale.id);
      
      // Prepare insert data with explicit lineTotal calculation
      // Use the original items array, not the entities, to calculate lineTotal
      const insertData = items.map((originalItem, index) => {
        // Recalculate lineTotal from unitPrice, quantity, and discountAmount
        // This ensures we have the correct value
        const unitPrice = Number(originalItem.unitPrice) || 0;
        const quantity = Number(originalItem.quantity) || 0;
        const discountAmount = Number(originalItem.discountAmount) || 0;
        const calculatedLineTotal = Math.max(0, (unitPrice * quantity) - discountAmount);
        
        // Use the calculated value
        const lineTotal = calculatedLineTotal;
        
        // Final validation
        if (lineTotal === undefined || lineTotal === null || isNaN(lineTotal)) {
          console.error(`[SALE ITEMS ERROR] Item ${index} has invalid lineTotal:`, {
            originalItem,
            unitPrice,
            quantity,
            discountAmount,
            calculatedLineTotal,
            finalLineTotal: lineTotal,
          });
          throw new Error(`Invalid lineTotal for item ${index}. Calculated: ${calculatedLineTotal}, Final: ${lineTotal}`);
        }
        
        console.log(`[SALE ITEMS] Item ${index} lineTotal calculation:`, {
          unitPrice,
          quantity,
          discountAmount,
          calculated: calculatedLineTotal,
          using: lineTotal,
        });
        
        // Prepare data for raw SQL insert
        const data: any = {
          saleId: savedSale.id,
          unitPrice: unitPrice,
          quantity: quantity,
          discountAmount: discountAmount,
          lineTotal: lineTotal, // This will be used in the SQL INSERT
        };
        
        // Add optional fields from original item
        if (originalItem.serviceId) {
          data.serviceId = originalItem.serviceId;
        }
        if (originalItem.productId) {
          data.productId = originalItem.productId;
        }
        if (originalItem.salonEmployeeId) {
          data.salonEmployeeId = originalItem.salonEmployeeId;
        }
        
        return data;
      });
      
      console.log('[SALE ITEMS] Inserting with data (camelCase):', JSON.stringify(insertData, null, 2));
      
      // Use raw SQL insert directly to bypass TypeORM mapping issues
      // This ensures line_total is explicitly set in the database
      const queryRunner = this.saleItemsRepository.manager.connection.createQueryRunner();
      
      try {
        await queryRunner.connect();
        
        console.log('[SALE ITEMS] Using raw SQL insert for', insertData.length, 'items');
        
        for (let i = 0; i < insertData.length; i++) {
          const data = insertData[i];
          const lineTotal = Number(data.lineTotal);
          
          // Validate lineTotal before insert
          if (lineTotal === undefined || lineTotal === null || isNaN(lineTotal)) {
            console.error(`[SALE ITEMS ERROR] Item ${i} has invalid lineTotal:`, {
              lineTotal,
              data,
              type: typeof lineTotal,
            });
            throw new Error(`Invalid lineTotal for item ${i}: ${lineTotal}, Data: ${JSON.stringify(data)}`);
          }
          
          // Generate UUID for the sale item
          const itemId = uuidv4();
          
          console.log(`[SALE ITEMS] Inserting item ${i + 1}/${insertData.length} with id: ${itemId}, lineTotal: ${lineTotal}`);
          
          const result = await queryRunner.query(
            `INSERT INTO sale_items (id, sale_id, service_id, product_id, salon_employee_id, unit_price, quantity, discount_amount, line_total) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              itemId, // Generate UUID for id
              data.saleId,
              data.serviceId || null,
              data.productId || null,
              data.salonEmployeeId || null,
              Number(data.unitPrice),
              Number(data.quantity),
              Number(data.discountAmount) || 0,
              lineTotal, // CRITICAL: Explicitly set line_total
            ]
          );
          
          console.log(`[SALE ITEMS] Item ${i + 1} inserted successfully, result:`, result);
        }
        
        console.log('[SALE ITEMS] All items inserted successfully using raw SQL');
      } catch (sqlError) {
        console.error('[SALE ITEMS] Raw SQL insert failed:', sqlError);
        console.error('[SALE ITEMS] Error details:', {
          message: sqlError?.message,
          code: sqlError?.code,
          stack: sqlError?.stack,
        });
        throw sqlError; // Re-throw to be caught by outer try-catch
      } finally {
        await queryRunner.release();
      }
      
      // Reload the saved items to get full entity data
      savedItems = await this.saleItemsRepository.find({
        where: { saleId: savedSale.id },
      });
      
      console.log('[SALE ITEMS] Successfully inserted and reloaded', savedItems.length, 'items');
      
      // Verify saved items have lineTotal
      for (let i = 0; i < savedItems.length; i++) {
        const item = savedItems[i];
        if (!item.lineTotal && item.lineTotal !== 0) {
          console.error(`[SALE ITEMS ERROR] Saved item ${i} missing lineTotal:`, item);
        }
      }

      // Create inventory movements for product sales
      for (const item of items) {
        if (item.productId && item.quantity) {
          try {
            await this.inventoryService.createMovement({
              salonId: saleData.salonId,
              productId: item.productId,
              movementType: InventoryMovementType.CONSUMPTION,
              quantity: -Math.abs(item.quantity), // Negative for consumption
              referenceId: savedSale.id,
              performedById: saleData.createdById,
              notes: `Product sold in sale ${savedSale.id}`,
            });
          } catch (error) {
            // Log error but don't fail the sale creation
            console.error(`Failed to create inventory movement for product ${item.productId}:`, error);
          }
        }
      }

      // Create commissions for employees assigned to sale items
      try {
        for (let i = 0; i < savedItems.length; i++) {
          const item = savedItems[i];
          if (item.salonEmployeeId && item.lineTotal) {
            await this.commissionsService.createCommission(
              item.salonEmployeeId,
              item.id,
              Number(item.lineTotal),
            );
          }
        }
      } catch (error) {
        // Log error but don't fail the sale creation
        console.error(`Failed to create commissions for sale ${savedSale.id}:`, error);
      }
    }

      // Create accounting journal entry for the sale
      try {
        await this.createSaleJournalEntry(savedSale, items || []);
      } catch (error) {
        // Log error but don't fail the sale creation
        console.error(`Failed to create journal entry for sale ${savedSale.id}:`, error);
      }
      
      return this.findOne(savedSale.id);
    } catch (error) {
      console.error('[SALE CREATE ERROR] Failed to create sale:', error);
      console.error('[SALE CREATE ERROR] Error details:', {
        message: error?.message,
        stack: error?.stack,
        saleData,
        itemsCount: items?.length,
      });
      throw error; // Re-throw to let the exception filter handle it
    }
  }

  private async getOrCreateAccount(
    salonId: string,
    code: string,
    name: string,
    accountType: AccountType,
  ): Promise<ChartOfAccount> {
    // Try to find existing account
    const existing = await this.accountingService.findAccountByCode(code, salonId);

    if (existing) {
      return existing;
    }

    // Create new account if it doesn't exist
    return this.accountingService.createAccount({
      code,
      name,
      accountType,
      salonId,
      isActive: true,
    });
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
    const totalDiscount = items.reduce((sum, item) => sum + (Number(item.discountAmount) || 0), 0);
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

    // Handle product sales - COGS and Inventory
    // Note: This assumes products have a cost. For now, we'll skip COGS if cost is not available
    // In a real system, you'd track product costs separately
    const productItems = items.filter(item => item.productId);
    if (productItems.length > 0) {
      // For now, we'll create a placeholder COGS entry
      // In production, you'd calculate actual cost based on inventory valuation
      // This is a simplified version - you may want to track product costs separately
      
      // Optional: If you track product costs, uncomment and adjust:
      /*
      const totalCost = productItems.reduce((sum, item) => {
        // Calculate cost based on product cost * quantity
        // This would require product cost tracking
        return sum + (item.unitCost || 0) * (item.quantity || 0);
      }, 0);

      if (totalCost > 0) {
        // Debit: COGS
        lines.push({
          accountId: cogsAccount.id,
          debitAmount: totalCost,
          creditAmount: 0,
          description: `COGS for sale ${sale.id.slice(0, 8)}`,
          referenceType: 'sale',
          referenceId: sale.id,
        });

        // Credit: Inventory
        lines.push({
          accountId: inventoryAccount.id,
          debitAmount: 0,
          creditAmount: totalCost,
          description: `Inventory reduction for sale ${sale.id.slice(0, 8)}`,
          referenceType: 'sale',
          referenceId: sale.id,
        });
      }
      */
    }

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

  async findAll(salonId?: string, page: number = 1, limit: number = 10): Promise<{ data: Sale[]; total: number; page: number; limit: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const where = salonId ? { salonId } : {};
    
    const [data, total] = await this.salesRepository.findAndCount({
      where,
      relations: ['customer', 'createdBy', 'salon', 'items', 'items.salonEmployee', 'items.salonEmployee.user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    
    // Load commissions for all sale items
    // Always fetch items separately to ensure we get all items for all sales
    // Some sales may not have items loaded via relations due to TypeORM issues
    const saleIds = data.map(s => s.id);
    let allItems: SaleItem[] = [];
    
    // Always fetch all items for all sales to ensure completeness
    if (saleIds.length > 0) {
      allItems = await this.saleItemsRepository.find({
        where: { saleId: In(saleIds) },
        relations: ['service', 'product', 'salonEmployee', 'salonEmployee.user'],
      });
      
      console.log('[SALES SERVICE findAll] Item loading:', {
        saleIdsCount: saleIds.length,
        fetchedItemsCount: allItems.length,
        itemsBySale: saleIds.map(id => ({
          saleId: id,
          itemCount: allItems.filter(item => item.saleId === id).length,
        })),
      });
    }
    
    const itemIds = allItems.map(item => item.id);
    // Fetch commissions for these sale items
    const commissions = itemIds.length > 0
      ? await this.commissionsService.findBySaleItemIds(itemIds)
      : [];
    
    // Group commissions by sale item
    const commissionsByItem = new Map<string, any[]>();
    commissions.forEach(commission => {
      if (commission.saleItemId) {
        if (!commissionsByItem.has(commission.saleItemId)) {
          commissionsByItem.set(commission.saleItemId, []);
        }
        commissionsByItem.get(commission.saleItemId).push(commission);
      }
    });
    
    // Attach employee and commission info to each sale
    const salesWithDetails = data.map(sale => {
      // Always use items from allItems (fetched separately) to ensure completeness
      // The relation might not load items properly in some cases
      const saleItems = allItems.filter(item => item.saleId === sale.id);
      
      const employees = new Map<string, { id: string; name: string }>();
      let totalCommission = 0;
      
      console.log('[SALES SERVICE findAll] Processing sale:', {
        saleId: sale.id,
        itemCount: saleItems.length,
        relationItemCount: sale.items?.length || 0,
        items: saleItems.map(item => ({
          id: item.id,
          serviceId: item.serviceId,
          productId: item.productId,
          serviceName: item.service?.name,
          productName: item.product?.name,
          salonEmployeeId: item.salonEmployeeId,
          hasSalonEmployee: !!item.salonEmployee,
          employeeName: item.salonEmployee?.user?.fullName,
        })),
      });
      
      saleItems.forEach(item => {
        if (item.salonEmployee) {
          const empId = item.salonEmployee.id;
          if (!employees.has(empId)) {
            employees.set(empId, {
              id: empId,
              name: item.salonEmployee.user?.fullName || 'Unknown Employee',
            });
          }
        } else if (item.salonEmployeeId) {
          console.warn('[SALES SERVICE findAll] Item has salonEmployeeId but relation not loaded:', {
            itemId: item.id,
            saleId: sale.id,
            salonEmployeeId: item.salonEmployeeId,
          });
        }
        
        // Get commission for this item
        const itemCommissions = commissionsByItem.get(item.id) || [];
        itemCommissions.forEach(comm => {
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
      data: salesWithDetails as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findBySalonIds(salonIds: string[], page: number = 1, limit: number = 10): Promise<{ data: Sale[]; total: number; page: number; limit: number; totalPages: number }> {
    // If no salon IDs, return empty result
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
      relations: ['customer', 'createdBy', 'salon', 'items', 'items.salonEmployee', 'items.salonEmployee.user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    
    // Load commissions for all sale items
    // Always fetch items separately to ensure we get all items for all sales
    // Some sales may not have items loaded via relations due to TypeORM issues
    const saleIds = data.map(s => s.id);
    let allItems: SaleItem[] = [];
    
    // Always fetch all items for all sales to ensure completeness
    if (saleIds.length > 0) {
      console.log('[SALES SERVICE findBySalonIds] Fetching items for sale IDs:', saleIds);
      allItems = await this.saleItemsRepository.find({
        where: { saleId: In(saleIds) },
        relations: ['service', 'product', 'salonEmployee', 'salonEmployee.user'],
      });
      
      console.log('[SALES SERVICE findBySalonIds] Item loading:', {
        saleIdsCount: saleIds.length,
        fetchedItemsCount: allItems.length,
        itemsBySale: saleIds.map(id => {
          const itemsForSale = allItems.filter(item => item.saleId === id);
          return {
            saleId: id,
            itemCount: itemsForSale.length,
            itemIds: itemsForSale.map(i => i.id),
          };
        }),
      });
      
      // Debug: Check if any sales have no items
      const salesWithNoItems = saleIds.filter(id => 
        allItems.filter(item => item.saleId === id).length === 0
      );
      if (salesWithNoItems.length > 0) {
        console.log('[SALES SERVICE findBySalonIds] WARNING: Sales with no items found:', salesWithNoItems);
        // Double-check by querying database directly
        for (const saleId of salesWithNoItems) {
          const directCheck = await this.saleItemsRepository.count({ where: { saleId } });
          console.log(`[SALES SERVICE findBySalonIds] Direct DB check for sale ${saleId}: ${directCheck} items found`);
        }
      }
    }
    
    const itemIds = allItems.map(item => item.id);
    // Fetch commissions for these sale items
    const commissions = itemIds.length > 0
      ? await this.commissionsService.findBySaleItemIds(itemIds)
      : [];
    
    // Group commissions by sale item
    const commissionsByItem = new Map<string, any[]>();
    commissions.forEach(commission => {
      if (commission.saleItemId) {
        if (!commissionsByItem.has(commission.saleItemId)) {
          commissionsByItem.set(commission.saleItemId, []);
        }
        commissionsByItem.get(commission.saleItemId).push(commission);
      }
    });
    
    // Attach employee and commission info to each sale
    const salesWithDetails = data.map(sale => {
      // Always use items from allItems (fetched separately) to ensure completeness
      // The relation might not load items properly in some cases
      const saleItems = allItems.filter(item => item.saleId === sale.id);
      
      const employees = new Map<string, { id: string; name: string }>();
      let totalCommission = 0;
      
      console.log('[SALES SERVICE findBySalonIds] Processing sale:', {
        saleId: sale.id,
        itemCount: saleItems.length,
        relationItemCount: sale.items?.length || 0,
        items: saleItems.map(item => ({
          id: item.id,
          serviceId: item.serviceId,
          productId: item.productId,
          serviceName: item.service?.name,
          productName: item.product?.name,
          salonEmployeeId: item.salonEmployeeId,
          hasSalonEmployee: !!item.salonEmployee,
          employeeName: item.salonEmployee?.user?.fullName,
        })),
      });
      
      saleItems.forEach(item => {
        if (item.salonEmployee) {
          const empId = item.salonEmployee.id;
          if (!employees.has(empId)) {
            employees.set(empId, {
              id: empId,
              name: item.salonEmployee.user?.fullName || 'Unknown Employee',
            });
          }
        } else if (item.salonEmployeeId) {
          console.warn('[SALES SERVICE findBySalonIds] Item has salonEmployeeId but relation not loaded:', {
            itemId: item.id,
            saleId: sale.id,
            salonEmployeeId: item.salonEmployeeId,
          });
        }
        
        // Get commission for this item
        const itemCommissions = commissionsByItem.get(item.id) || [];
        itemCommissions.forEach(comm => {
          totalCommission += Number(comm.amount) || 0;
        });
      });
      
      return {
        ...sale,
        employees: Array.from(employees.values()),
        totalCommission,
      };
    });
    
    const result = {
      data: salesWithDetails as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
    
    console.log('[SALES SERVICE findBySalonIds] Returning result:', {
      dataLength: result.data.length,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      isArray: Array.isArray(result),
      hasData: 'data' in result,
    });
    
    return result;
  }

  async findByCustomerId(customerId: string, page: number = 1, limit: number = 10): Promise<{ data: Sale[]; total: number; page: number; limit: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    
    const [data, total] = await this.salesRepository.findAndCount({
      where: { customerId },
      relations: ['customer', 'createdBy', 'salon', 'items', 'items.service', 'items.product', 'items.salonEmployee', 'items.salonEmployee.user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    
    // Load commissions for all sale items
    // Always fetch items separately to ensure we get all items for all sales
    const saleIds = data.map(s => s.id);
    let allItems: SaleItem[] = [];
    
    // Always fetch all items for all sales to ensure completeness
    if (saleIds.length > 0) {
      allItems = await this.saleItemsRepository.find({
        where: { saleId: In(saleIds) },
        relations: ['service', 'product', 'salonEmployee', 'salonEmployee.user'],
      });
    }
    
    const itemIds = allItems.map(item => item.id);
    // Fetch commissions for these sale items
    const commissions = itemIds.length > 0
      ? await this.commissionsService.findBySaleItemIds(itemIds)
      : [];
    
    // Group commissions by sale item
    const commissionsByItem = new Map<string, any[]>();
    commissions.forEach(commission => {
      if (commission.saleItemId) {
        if (!commissionsByItem.has(commission.saleItemId)) {
          commissionsByItem.set(commission.saleItemId, []);
        }
        commissionsByItem.get(commission.saleItemId).push(commission);
      }
    });
    
    // Attach employee and commission info to each sale
    const salesWithDetails = data.map(sale => {
      // Always use items from allItems (fetched separately) to ensure completeness
      const saleItems = allItems.filter(item => item.saleId === sale.id);
      
      const employees = new Map<string, { id: string; name: string }>();
      let totalCommission = 0;
      
      saleItems.forEach(item => {
        if (item.salonEmployee) {
          const empId = item.salonEmployee.id;
          if (!employees.has(empId)) {
            employees.set(empId, {
              id: empId,
              name: item.salonEmployee.user?.fullName || 'Unknown Employee',
            });
          }
        }
        
        // Get commission for this item
        const itemCommissions = commissionsByItem.get(item.id) || [];
        itemCommissions.forEach(comm => {
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
      data: salesWithDetails as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Sale> {
    console.log('[SALE FINDONE] Fetching sale with ID:', id);
    const sale = await this.salesRepository.findOne({
      where: { id },
      relations: ['customer', 'createdBy', 'salon', 'items', 'items.service', 'items.product', 'items.salonEmployee', 'items.salonEmployee.user'],
    });
    
    if (!sale) {
      console.log('[SALE FINDONE] Sale not found:', id);
      return null;
    }
    
    console.log('[SALE FINDONE] Found sale with', sale.items?.length || 0, 'items');
    if (sale.items && sale.items.length > 0) {
      console.log('[SALE FINDONE] First item sample:', JSON.stringify({
        id: sale.items[0].id,
        serviceId: sale.items[0].serviceId,
        productId: sale.items[0].productId,
        service: sale.items[0].service ? { id: sale.items[0].service.id, name: sale.items[0].service.name } : null,
        product: sale.items[0].product ? { id: sale.items[0].product.id, name: sale.items[0].product.name } : null,
        unitPrice: sale.items[0].unitPrice,
        quantity: sale.items[0].quantity,
        lineTotal: sale.items[0].lineTotal,
      }, null, 2));
    }
    
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
    
    const totalSpent = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    const totalVisits = sales.length;
    const averageOrderValue = totalSpent / totalVisits;
    const lastVisitDate = sales[0]?.createdAt || null;
    
    // Find favorite salon (most visits)
    const salonVisits = new Map<string, { id: string; name: string; visits: number }>();
    sales.forEach(sale => {
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
    
    const favoriteSalon = Array.from(salonVisits.values())
      .sort((a, b) => b.visits - a.visits)[0] || null;
    
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
    let salesResult: { data: Sale[]; total: number; page: number; limit: number; totalPages: number } | Sale[];

    if (salonIds && salonIds.length > 0) {
      salesResult = await this.findBySalonIds(salonIds, 1, 10000); // Get all sales with high limit
    } else {
      salesResult = await this.findAll(undefined, 1, 10000); // Get all sales with high limit
    }

    // Extract the sales array from paginated result
    let sales: Sale[] = Array.isArray(salesResult) ? salesResult : salesResult.data;

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
    const saleIds = sales.map(s => s.id);
    const allItems = saleIds.length > 0
      ? await this.saleItemsRepository.find({
          where: saleIds.map(id => ({ saleId: id })),
          relations: ['service', 'product', 'salonEmployee', 'salonEmployee.user'],
        })
      : [];

    // Calculate totals
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalSales = sales.length;
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Payment method breakdown
    const paymentMethods = sales.reduce((acc, sale) => {
      const method = sale.paymentMethod || 'unknown';
      acc[method] = (acc[method] || 0) + Number(sale.totalAmount);
      return acc;
    }, {} as Record<string, number>);

    // Daily revenue (last 30 days)
    const dailyRevenue: Record<string, number> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    sales
      .filter(s => new Date(s.createdAt) >= thirtyDaysAgo)
      .forEach((sale) => {
        const date = new Date(sale.createdAt).toISOString().split('T')[0];
        dailyRevenue[date] = (dailyRevenue[date] || 0) + Number(sale.totalAmount);
      });

    const dailyRevenueArray = Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top services
    const serviceSales: Record<string, { name: string; count: number; revenue: number }> = {};
    allItems
      .filter(item => item.serviceId)
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
    const productSales: Record<string, { name: string; count: number; revenue: number }> = {};
    allItems
      .filter(item => item.productId)
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
    const employeeSales: Record<string, { name: string; sales: number; revenue: number }> = {};
    allItems
      .filter(item => item.salonEmployeeId)
      .forEach((item) => {
        const empId = item.salonEmployeeId!;
        if (!employeeSales[empId]) {
          const employee = item.salonEmployee as any;
          employeeSales[empId] = {
            name: employee?.user?.fullName || employee?.roleTitle || 'Unknown Employee',
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
      .filter(s => new Date(s.createdAt) >= twelveMonthsAgo)
      .forEach((sale) => {
        const date = new Date(sale.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + Number(sale.totalAmount);
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

