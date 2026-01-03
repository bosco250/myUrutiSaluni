import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ChartOfAccount } from './entities/chart-of-account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { Invoice } from './entities/invoice.entity';
import {
  Expense,
  ExpenseStatus,
  PaymentMethod,
} from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';

@Injectable()
export class AccountingService {
  constructor(
    @InjectRepository(ChartOfAccount)
    private chartOfAccountsRepository: Repository<ChartOfAccount>,
    @InjectRepository(JournalEntry)
    private journalEntriesRepository: Repository<JournalEntry>,
    @InjectRepository(JournalEntryLine)
    private journalEntryLinesRepository: Repository<JournalEntryLine>,
    @InjectRepository(Invoice)
    private invoicesRepository: Repository<Invoice>,
    @InjectRepository(Expense)
    private expensesRepository: Repository<Expense>,
    private dataSource: DataSource,
  ) {}

  // ==================== EXPENSE METHODS ====================

  async createExpense(
    dto: CreateExpenseDto,
    createdById?: string,
  ): Promise<Expense> {
    const expense = this.expensesRepository.create({
      salonId: dto.salonId,
      amount: dto.amount,
      description: dto.description,
      expenseDate: new Date(dto.expenseDate),
      categoryId: dto.categoryId,
      paymentMethod: (dto.paymentMethod || 'cash') as PaymentMethod,
      vendorName: dto.vendorName,
      receiptUrl: dto.receiptUrl,
      metadata: dto.metadata || {},
      status: ExpenseStatus.APPROVED,
      createdById,
    });
    const saved = await this.expensesRepository.save(expense);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async getExpenses(
    query: QueryExpensesDto,
  ): Promise<{ data: Expense[]; total: number; page: number; limit: number }> {
    const {
      salonId,
      startDate,
      endDate,
      categoryId,
      status,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.expensesRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.category', 'category')
      .leftJoinAndSelect('expense.createdBy', 'createdBy')
      .where('expense.salonId = :salonId', { salonId });

    if (startDate) {
      qb.andWhere('expense.expenseDate >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      qb.andWhere('expense.expenseDate <= :endDate', {
        endDate: new Date(endDate),
      });
    }
    if (categoryId) {
      qb.andWhere('expense.categoryId = :categoryId', { categoryId });
    }
    if (status) {
      qb.andWhere('expense.status = :status', { status });
    }

    qb.orderBy('expense.expenseDate', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getExpenseById(id: string): Promise<Expense> {
    const expense = await this.expensesRepository.findOne({
      where: { id },
      relations: ['category', 'createdBy', 'approvedBy'],
    });
    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }
    return expense;
  }

  async updateExpense(id: string, dto: UpdateExpenseDto): Promise<Expense> {
    const expense = await this.getExpenseById(id);
    Object.assign(expense, {
      ...dto,
      ...(dto.expenseDate && { expenseDate: new Date(dto.expenseDate) }),
    });
    return this.expensesRepository.save(expense);
  }

  async deleteExpense(id: string): Promise<void> {
    const expense = await this.getExpenseById(id);
    await this.expensesRepository.remove(expense);
  }

  async getExpenseSummary(
    salonId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    totalExpenses: number;
    expenseCount: number;
    byCategory: { categoryName: string; total: number }[];
    byPaymentMethod: { method: string; total: number }[];
  }> {
    const qb = this.expensesRepository
      .createQueryBuilder('expense')
      .leftJoin('expense.category', 'category')
      .where('expense.salonId = :salonId', { salonId })
      .andWhere('expense.status = :status', { status: ExpenseStatus.APPROVED });

    if (startDate) {
      qb.andWhere('expense.expenseDate >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      qb.andWhere('expense.expenseDate <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const expenses = await qb
      .select(['expense.amount', 'expense.paymentMethod', 'category.name'])
      .getRawMany();

    const totalExpenses = expenses.reduce(
      (sum, e) => sum + parseFloat(e.expense_amount || 0),
      0,
    );
    const expenseCount = expenses.length;

    // Group by category
    const categoryMap = new Map<string, number>();
    expenses.forEach((e) => {
      const name = e.category_name || 'Uncategorized';
      categoryMap.set(
        name,
        (categoryMap.get(name) || 0) + parseFloat(e.expense_amount || 0),
      );
    });
    const byCategory = Array.from(categoryMap.entries()).map(
      ([categoryName, total]) => ({ categoryName, total }),
    );

    // Group by payment method
    const methodMap = new Map<string, number>();
    expenses.forEach((e) => {
      const method = e.expense_paymentMethod || 'other';
      methodMap.set(
        method,
        (methodMap.get(method) || 0) + parseFloat(e.expense_amount || 0),
      );
    });
    const byPaymentMethod = Array.from(methodMap.entries()).map(
      ([method, total]) => ({ method, total }),
    );

    return { totalExpenses, expenseCount, byCategory, byPaymentMethod };
  }

  async getFinancialSummary(
    salonId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    salesCount: number;
    expenseCount: number;
  }> {
    // 1. Get Revenue directly from sales table (Source of Truth for Sales)
    const salesTotalQb = this.dataSource
      .createQueryBuilder()
      .select('SUM(CAST(sale.total_amount AS NUMERIC))', 'total')
      .addSelect('COUNT(*)', 'count')
      .from('sales', 'sale')
      .where('sale.salon_id = :salonId', { salonId })
      .andWhere("sale.status = 'completed'");

    if (startDate) {
      salesTotalQb.andWhere('sale.created_at >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      salesTotalQb.andWhere('sale.created_at <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const salesResult = await salesTotalQb.getRawOne();
    const totalSalesRevenue = parseFloat(salesResult?.total || '0');
    const salesCount = parseInt(salesResult?.count || '0', 10);

    // 2. Get Revenue from journal entries (for other revenue sources that aren't direct salon sales)
    const revenueEntriesQb = this.journalEntryLinesRepository
      .createQueryBuilder('line')
      .innerJoin('line.journalEntry', 'entry')
      .innerJoin('line.account', 'account')
      .where('entry.salonId = :salonId', { salonId })
      .andWhere('account.accountType = :type', { type: 'revenue' })
      .andWhere('line.referenceType != :refType', { refType: 'sale' }); // Exclude sales to avoid double counting

    if (startDate) {
      revenueEntriesQb.andWhere('entry.entryDate >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      revenueEntriesQb.andWhere('entry.entryDate <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const otherRevenueLines = await revenueEntriesQb
      .select(['line.creditAmount', 'line.debitAmount'])
      .getRawMany();
    const otherRevenue = otherRevenueLines.reduce((sum, l) => {
      const credit = parseFloat(l.line_creditAmount || 0);
      const debit = parseFloat(l.line_debitAmount || 0);
      return sum + (credit - debit);
    }, 0);

    const totalRevenue = totalSalesRevenue + otherRevenue;

    // 3. Get Manual Expenses
    const expenseSummary = await this.getExpenseSummary(
      salonId,
      startDate,
      endDate,
    );

    // 4. Get Commissions from commissions table (Source of Truth for Commissions)
    // We need to join with employees to filter by salonId
    const commissionTotalQb = this.dataSource
      .createQueryBuilder()
      .select('SUM(CAST(comm.amount AS NUMERIC))', 'total')
      .from('commissions', 'comm')
      .innerJoin('salon_employees', 'emp', 'emp.id = comm.salon_employee_id')
      .where('emp.salon_id = :salonId', { salonId });

    if (startDate) {
      commissionTotalQb.andWhere('comm.created_at >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      commissionTotalQb.andWhere('comm.created_at <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const commissionResult = await commissionTotalQb.getRawOne();
    const totalCommissions = parseFloat(commissionResult?.total || '0');

    // 5. Get other expenses from journal entries (e.g. COGS if tracked, tax, etc.)
    const journalExpenseQb = this.journalEntryLinesRepository
      .createQueryBuilder('line')
      .innerJoin('line.journalEntry', 'entry')
      .innerJoin('line.account', 'account')
      .where('entry.salonId = :salonId', { salonId })
      .andWhere('account.accountType = :type', { type: 'expense' });

    if (startDate) {
      journalExpenseQb.andWhere('entry.entryDate >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      journalExpenseQb.andWhere('entry.entryDate <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const journalExpenseLines = await journalExpenseQb
      .select('line.debitAmount')
      .getRawMany();
    const otherJournalExpenses = journalExpenseLines.reduce(
      (sum, l) => sum + parseFloat(l.line_debitAmount || 0),
      0,
    );

    const totalCalculatedExpenses =
      expenseSummary.totalExpenses + totalCommissions + otherJournalExpenses;
    const netIncome = totalRevenue - totalCalculatedExpenses;

    return {
      totalRevenue,
      totalExpenses: totalCalculatedExpenses,
      netIncome,
      salesCount,
      expenseCount: expenseSummary.expenseCount,
    };
  }

  // ==================== EXISTING METHODS ====================

  async createAccount(
    accountData: Partial<ChartOfAccount>,
  ): Promise<ChartOfAccount> {
    const account = this.chartOfAccountsRepository.create(accountData);
    return this.chartOfAccountsRepository.save(account);
  }

  async findAccountByCode(
    code: string,
    salonId: string,
  ): Promise<ChartOfAccount | null> {
    return this.chartOfAccountsRepository.findOne({
      where: { code, salonId },
    });
  }

  async findJournalEntriesByReference(
    referenceType: string,
    referenceId: string,
  ): Promise<JournalEntry[]> {
    return this.journalEntriesRepository
      .createQueryBuilder('entry')
      .innerJoin('entry.lines', 'line')
      .where('line.referenceType = :referenceType', { referenceType })
      .andWhere('line.referenceId = :referenceId', { referenceId })
      .getMany();
  }

  async createJournalEntry(entryData: any): Promise<JournalEntry> {
    return this.dataSource.transaction(async (manager) => {
      const entry = manager.create(JournalEntry, {
        salonId: entryData.salonId,
        entryNumber: entryData.entryNumber,
        entryDate: entryData.entryDate
          ? new Date(entryData.entryDate)
          : new Date(),
        description: entryData.description,
        status: entryData.status,
        createdById: entryData.createdById,
      });

      const savedEntry = await manager.save(JournalEntry, entry);

      if (entryData.lines && entryData.lines.length > 0) {
        const lines = entryData.lines.map((line: any) =>
          manager.create(JournalEntryLine, {
            journalEntryId: savedEntry.id,
            accountId: line.accountId,
            debitAmount: line.debitAmount
              ? parseFloat(String(line.debitAmount))
              : 0,
            creditAmount: line.creditAmount
              ? parseFloat(String(line.creditAmount))
              : 0,
            description: line.description,
            referenceType: line.referenceType,
            referenceId: line.referenceId,
          }),
        );
        await manager.save(JournalEntryLine, lines);
      }

      return manager.findOne(JournalEntry, {
        where: { id: savedEntry.id },
        relations: ['lines', 'lines.account'],
      });
    });
  }

  async createInvoice(invoiceData: any): Promise<Invoice> {
    const invoice = this.invoicesRepository.create({
      ...invoiceData,
      issueDate: invoiceData.issueDate
        ? new Date(invoiceData.issueDate)
        : new Date(),
      dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : undefined,
    });
    const saved = await this.invoicesRepository.save(invoice);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async getExpenseCategories(salonId: string): Promise<ChartOfAccount[]> {
    // Check for existing expense categories
    let categories = await this.chartOfAccountsRepository.find({
      where: { salonId, accountType: 'expense' as any, isActive: true },
      order: { name: 'ASC' },
    });

    // Define all default categories
    const defaultCategories = [
      { code: 'EXP-RENT', name: 'Rent' },
      { code: 'EXP-UTIL', name: 'Utilities' },
      { code: 'EXP-SUPP', name: 'Supplies' },
      { code: 'EXP-PROD', name: 'Products' },
      { code: 'EXP-EQUIP', name: 'Equipment' },
      { code: 'EXP-MKTG', name: 'Marketing' },
      { code: 'EXP-WAGES', name: 'Wages' },
      { code: 'EXP-OTHER', name: 'Other' },
    ];

    // Find which categories are missing
    const existingCodes = categories.map((c) => c.code);
    const missingCategories = defaultCategories.filter(
      (dc) => !existingCodes.includes(dc.code),
    );

    // Create missing categories
    if (missingCategories.length > 0) {
      const newCategories = missingCategories.map((cat) =>
        this.chartOfAccountsRepository.create({
          code: cat.code,
          name: cat.name,
          accountType: 'expense' as any,
          salonId,
          isActive: true,
          metadata: {},
        }),
      );

      try {
        await this.chartOfAccountsRepository.save(newCategories);
      } catch (error) {
        // Ignore duplicate key errors (in case of race condition)
        console.log('Some categories may already exist:', error.message);
      }

      // Fetch all categories again
      categories = await this.chartOfAccountsRepository.find({
        where: { salonId, accountType: 'expense' as any, isActive: true },
        order: { name: 'ASC' },
      });
    }

    return categories;
  }
}
