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
import { ReportsService } from '../reports/reports.service';
import { SalonsService } from '../salons/salons.service'; // Needed for salon name fetch

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
    private reportsService: ReportsService,
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
    categoryId?: string,
  ): Promise<{
    totalExpenses: number;
    expenseCount: number;
    byCategory: { categoryName: string; total: number }[];
    byPaymentMethod: { method: string; total: number }[];
  }> {
    // 1. Manual Expenses
    const qb = this.expensesRepository
      .createQueryBuilder('expense')
      .leftJoin('expense.category', 'category')
      .where('expense.salonId = :salonId', { salonId })
      .andWhere('expense.status = :status', { status: ExpenseStatus.APPROVED });

    if (categoryId) {
      qb.andWhere('expense.categoryId = :categoryId', { categoryId });
    }

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

    // Group by category (Manual)
    const categoryMap = new Map<string, number>();
    const methodMap = new Map<string, number>();
    let manualExpenseTotal = 0;

    expenses.forEach((e) => {
      const amount = parseFloat(e.expense_amount || 0);
      manualExpenseTotal += amount;
      
      const catName = e.category_name || 'Uncategorized';
      categoryMap.set(catName, (categoryMap.get(catName) || 0) + amount);

      const method = e.expense_paymentMethod || 'other';
      methodMap.set(method, (methodMap.get(method) || 0) + amount);
    });

    // 2. Commissions (Automatic Expenses)
    // 2. Commissions (Automatic Expenses)
    let commissionsTotal = 0;
    let commissionsCount = 0;
    let journalTotal = 0;
    let journalCount = 0;
    let payrollTotal = 0;
    let payrollCount = 0;
    let feeTotal = 0;
    let feeCount = 0;
    let journalExpenseLines: any[] = [];

    if (!categoryId) {
        const commissionTotalQb = this.dataSource
          .createQueryBuilder()
          .select('SUM(CAST(comm.amount AS NUMERIC))', 'total')
          .addSelect('COUNT(*)', 'count')
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
    commissionsTotal = parseFloat(commissionResult?.total || '0');
    commissionsCount = parseInt(commissionResult?.count || '0', 10);

    if (commissionsTotal > 0) {
      categoryMap.set(
        'Commissions',
        (categoryMap.get('Commissions') || 0) + commissionsTotal,
      );
      methodMap.set(
        'system_accrual',
        (methodMap.get('system_accrual') || 0) + commissionsTotal,
      );
    }
  }

    // 3. Journal Expenses (Other)
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
    if (categoryId) {
      journalExpenseQb.andWhere('account.id = :categoryId', { categoryId });
    }

    journalExpenseLines = await journalExpenseQb
      .select(['line.debitAmount', 'account.name'])
      .getRawMany();

    journalTotal = journalExpenseLines.reduce((sum, l) => {
      const amount = parseFloat(l.line_debitAmount || 0);
      const catName = l.account_name || 'Journal Adjustment';
      categoryMap.set(catName, (categoryMap.get(catName) || 0) + amount);
      methodMap.set(
        'journal_entry',
        (methodMap.get('journal_entry') || 0) + amount,
      );
      return sum + amount;
    }, 0);

    // 4. Payroll (Paid)
    if (!categoryId) {
      const payrollQb = this.dataSource
        .createQueryBuilder()
        .select('SUM(run.total_amount)', 'total')
        .addSelect('COUNT(*)', 'count')
        .from('payroll_runs', 'run')
        .where('run.salon_id = :salonId', { salonId })
        .andWhere("run.status = 'paid'");

      if (startDate) {
        payrollQb.andWhere('run.created_at >= :startDate', {
          startDate: new Date(startDate),
        });
      }
      if (endDate) {
        payrollQb.andWhere('run.created_at <= :endDate', {
          endDate: new Date(endDate),
        });
      }

      const payrollRes = await payrollQb.getRawOne();
      payrollTotal = parseFloat(payrollRes?.total || '0');
      payrollCount = parseInt(payrollRes?.count || '0', 10);

      if (payrollTotal > 0) {
        categoryMap.set(
          'Payroll',
          (categoryMap.get('Payroll') || 0) + payrollTotal,
        );
        methodMap.set(
          'wage_payment',
          (methodMap.get('wage_payment') || 0) + payrollTotal,
        );
      }
    }

    // 5. Wallet Fees
    if (!categoryId) {
      const feeQb = this.dataSource
        .createQueryBuilder()
        .select('SUM(tx.amount)', 'total')
        .addSelect('COUNT(*)', 'count')
        .from('wallet_transactions', 'tx')
        .innerJoin('wallets', 'w', 'w.id = tx.wallet_id')
        .where('w.salon_id = :salonId', { salonId })
        .andWhere("tx.transaction_type = 'fee'");

      if (startDate) {
        feeQb.andWhere('tx.created_at >= :startDate', {
          startDate: new Date(startDate),
        });
      }
      if (endDate) {
        feeQb.andWhere('tx.created_at <= :endDate', {
          endDate: new Date(endDate),
        });
      }

      const feeRes = await feeQb.getRawOne();
      feeTotal = parseFloat(feeRes?.total || '0');
      feeCount = parseInt(feeRes?.count || '0', 10);

      if (feeTotal > 0) {
        categoryMap.set(
          'System Fees',
          (categoryMap.get('System Fees') || 0) + feeTotal,
        );
        methodMap.set(
          'system_fee',
          (methodMap.get('system_fee') || 0) + feeTotal,
        );
      }
    }

    // Final Totals
    const totalExpenses = manualExpenseTotal + commissionsTotal + journalTotal + payrollTotal + feeTotal;
    const expenseCount = expenses.length + commissionsCount + journalExpenseLines.length + payrollCount + feeCount;

    const byCategory = Array.from(categoryMap.entries())
      .map(([categoryName, total]) => ({ categoryName, total }))
      .sort((a, b) => b.total - a.total);

    const byPaymentMethod = Array.from(methodMap.entries())
      .map(([method, total]) => ({ method, total }))
      .sort((a, b) => b.total - a.total);

    return { totalExpenses, expenseCount, byCategory, byPaymentMethod };
  }

  async getFinancialSummary(
    salonId: string,
    startDate?: string,
    endDate?: string,
    type?: 'income' | 'expense',
    categoryId?: string,
  ): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    salesCount: number;
    expenseCount: number;
  }> {
    const includeIncome = (!type || type === 'income') && !categoryId;
    const includeExpense = (!type || type === 'expense');

    // 1. Get Revenue (Source of Truth for Sales)
    let totalSalesRevenue = 0;
    let salesCount = 0;
    let otherRevenue = 0;

    if (includeIncome) {
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
        totalSalesRevenue = parseFloat(salesResult?.total || '0');
        salesCount = parseInt(salesResult?.count || '0', 10);

        // 2. Other Revenue
        const revenueEntriesQb = this.journalEntryLinesRepository
          .createQueryBuilder('line')
          .innerJoin('line.journalEntry', 'entry')
          .innerJoin('line.account', 'account')
          .where('entry.salonId = :salonId', { salonId })
          .andWhere('account.accountType = :type', { type: 'revenue' })
          .andWhere('line.referenceType != :refType', { refType: 'sale' });

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
          
        otherRevenue = otherRevenueLines.reduce((sum, l) => {
          const credit = parseFloat(l.line_creditAmount || 0);
          const debit = parseFloat(l.line_debitAmount || 0);
          return sum + (credit - debit);
        }, 0);
    }

    const totalRevenue = totalSalesRevenue + otherRevenue;

    // 3. Get All Expenses (Manual + Commissions + Journals) via centralized method
    let totalCalculatedExpenses = 0;
    let expenseCount = 0;

    if (includeExpense) {
        const expenseSummary = await this.getExpenseSummary(
          salonId,
          startDate,
          endDate,
          categoryId,
        );
        totalCalculatedExpenses = expenseSummary.totalExpenses;
        expenseCount = expenseSummary.expenseCount;
    }
    
    const netIncome = totalRevenue - totalCalculatedExpenses;

    return {
      totalRevenue,
      totalExpenses: totalCalculatedExpenses,
      netIncome,
      salesCount,
      expenseCount,
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

  async getDailyFinancials(
    salonId: string,
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    // Ensure date range covers the full days (00:00 to 23:59)
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const toDateKey = (date: any) => {
      if (!date) return null;
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().split('T')[0];
    };

    const dailyMap = new Map<
      string,
      { date: string; revenue: number; expenses: number; netIncome: number }
    >();

    const getEntry = (dateKey: string) => {
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          revenue: 0,
          expenses: 0,
          netIncome: 0,
        });
      }
      return dailyMap.get(dateKey);
    };

    // 1. Revenue (Sales)
    const sales = await this.dataSource
      .createQueryBuilder()
      .select('CAST(sale.total_amount AS NUMERIC)', 'amount')
      .addSelect('sale.created_at', 'date')
      .from('sales', 'sale')
      .where('sale.salon_id = :salonId', { salonId })
      .andWhere("sale.status = 'completed'")
      .andWhere('sale.created_at >= :start', { start })
      .andWhere('sale.created_at <= :end', { end })
      .getRawMany();

    sales.forEach((s) => {
      const key = toDateKey(s.date);
      if (key) getEntry(key).revenue += parseFloat(s.amount || 0);
    });

    // 2. Other Revenue (Journals)
    const otherRevenue = await this.journalEntryLinesRepository
      .createQueryBuilder('line')
      .innerJoin('line.journalEntry', 'entry')
      .innerJoin('line.account', 'account')
      .select('CAST(line.creditAmount AS NUMERIC) - CAST(line.debitAmount AS NUMERIC)', 'amount')
      .addSelect('entry.entryDate', 'date')
      .where('entry.salonId = :salonId', { salonId })
      .andWhere('account.accountType = :type', { type: 'revenue' })
      .andWhere('line.referenceType != :refType', { refType: 'sale' })
      .andWhere('entry.entryDate >= :start', { start })
      .andWhere('entry.entryDate <= :end', { end })
      .getRawMany();

    otherRevenue.forEach((r) => {
      const key = toDateKey(r.date);
      if (key) getEntry(key).revenue += parseFloat(r.amount || 0);
    });

    // 3. Manual Expenses
    const manualExpenses = await this.expensesRepository
      .createQueryBuilder('expense')
      .select('CAST(expense.amount AS NUMERIC)', 'amount')
      .addSelect('expense.expenseDate', 'date')
      .where('expense.salonId = :salonId', { salonId })
      .andWhere('expense.status = :status', { status: ExpenseStatus.APPROVED })
      .andWhere('expense.expenseDate >= :start', { start })
      .andWhere('expense.expenseDate <= :end', { end })
      .getRawMany();

    manualExpenses.forEach((e) => {
      const key = toDateKey(e.date);
      if (key) getEntry(key).expenses += parseFloat(e.amount || 0);
    });

    // 4. Commissions
    const commissions = await this.dataSource
      .createQueryBuilder()
      .select('CAST(comm.amount AS NUMERIC)', 'amount')
      .addSelect('comm.created_at', 'date')
      .from('commissions', 'comm')
      .innerJoin('salon_employees', 'emp', 'emp.id = comm.salon_employee_id')
      .where('emp.salon_id = :salonId', { salonId })
      .andWhere('comm.created_at >= :start', { start })
      .andWhere('comm.created_at <= :end', { end })
      .getRawMany();

    commissions.forEach((c) => {
      const key = toDateKey(c.date);
      if (key) getEntry(key).expenses += parseFloat(c.amount || 0);
    });

    // 5. Journal Expenses
    const journalExpenses = await this.journalEntryLinesRepository
      .createQueryBuilder('line')
      .innerJoin('line.journalEntry', 'entry')
      .innerJoin('line.account', 'account')
      .select('CAST(line.debitAmount AS NUMERIC)', 'amount')
      .addSelect('entry.entryDate', 'date')
      .where('entry.salonId = :salonId', { salonId })
      .andWhere('account.accountType = :type', { type: 'expense' })
      .andWhere('entry.entryDate >= :start', { start })
      .andWhere('entry.entryDate <= :end', { end })
      .getRawMany();

    journalExpenses.forEach((je) => {
      const key = toDateKey(je.date);
      if (key) getEntry(key).expenses += parseFloat(je.amount || 0);
    });

    // 6. Payroll (Paid)
    const payrolls = await this.dataSource
      .createQueryBuilder()
      .select('CAST(run.total_amount AS NUMERIC)', 'amount')
      .addSelect('run.created_at', 'date')
      .from('payroll_runs', 'run')
      .where('run.salon_id = :salonId', { salonId })
      .andWhere("run.status = 'paid'")
      .andWhere('run.created_at >= :start', { start })
      .andWhere('run.created_at <= :end', { end })
      .getRawMany();

    payrolls.forEach((p) => {
      const key = toDateKey(p.date);
      if (key) getEntry(key).expenses += parseFloat(p.amount || 0);
    });

    // 7. Wallet Fees
    const walletFees = await this.dataSource
      .createQueryBuilder()
      .select('CAST(tx.amount AS NUMERIC)', 'amount')
      .addSelect('tx.created_at', 'date')
      .from('wallet_transactions', 'tx')
      .innerJoin('wallets', 'w', 'w.id = tx.wallet_id')
      .where('w.salon_id = :salonId', { salonId })
      .andWhere("tx.transaction_type = 'fee'")
      .andWhere('tx.created_at >= :start', { start })
      .andWhere('tx.created_at <= :end', { end })
      .getRawMany();

    walletFees.forEach((f) => {
      const key = toDateKey(f.date);
      if (key) getEntry(key).expenses += parseFloat(f.amount || 0);
    });

    // Calculate Net Income
    dailyMap.forEach((entry) => {
      entry.netIncome = entry.revenue - entry.expenses;
    });

    return Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  async getAccountingLedger(
    salonId: string,
    startDate: string,
    endDate: string,
    type?: 'income' | 'expense',
    categoryId?: string,
  ): Promise<any[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const ledger: any[] = [];
    
    // Logic: If filtering by 'income', skip expenses. If 'expense', skip sales.
    const includeIncome = !type || type === 'income';
    const includeExpense = !type || type === 'expense';

    // 1. Sales
    if (includeIncome && !categoryId) { // Sales don't have categoryId usually, or we treat them as 'Sale'
       const sales = await this.dataSource
         .createQueryBuilder()
         .select('s.id', 'id')
         .addSelect('s.created_at', 'date')
         .addSelect('CAST(s.total_amount AS NUMERIC)', 'amount')
         .from('sales', 's')
         .where('s.salon_id = :salonId', { salonId })
         .andWhere("s.status = 'completed'")
         .andWhere('s.created_at BETWEEN :start AND :end', { start, end })
         .getRawMany();

       sales.forEach((s) =>
         ledger.push({
           date: s.date,
           type: 'Income',
           category: 'Sale',
           description: `Sale #${s.id.slice(0, 8)}`,
           amount: parseFloat(s.amount || 0),
           isOutflow: false,
         }),
       );
    }

    if (includeExpense) {
        // 2. Expenses (Manual)
        const expenseQuery = this.expensesRepository
          .createQueryBuilder('e')
          .leftJoinAndSelect('e.category', 'cat')
          .where('e.salonId = :salonId', { salonId })
          .andWhere("e.status = 'approved'")
          .andWhere('e.expenseDate BETWEEN :start AND :end', { start, end });
        
        if (categoryId) {
            expenseQuery.andWhere('e.categoryId = :categoryId', { categoryId });
        }

        const expenses = await expenseQuery.getMany();

        expenses.forEach((e) =>
          ledger.push({
            date: e.expenseDate,
            type: 'Expense',
            category: e.category?.name || 'General',
            description: e.description || 'Manual Expense',
            amount: parseFloat(String(e.amount || 0)),
            isOutflow: true,
          }),
        );
        
        if (!categoryId) {
            // 3. Commissions
            const commissions = await this.dataSource
              .createQueryBuilder()
              .select('c.id', 'id')
              .addSelect('c.created_at', 'date')
              .addSelect('CAST(c.amount AS NUMERIC)', 'amount')
              .from('commissions', 'c')
              .innerJoin('salon_employees', 'emp', 'emp.id = c.salon_employee_id')
              .where('emp.salon_id = :salonId', { salonId })
              .andWhere('c.created_at BETWEEN :start AND :end', { start, end })
              .getRawMany();

            commissions.forEach((c) =>
              ledger.push({
                date: c.date,
                type: 'Expense',
                category: 'Commission',
                description: `Staff Commission Payout`,
                amount: parseFloat(c.amount || 0),
                isOutflow: true,
              }),
            );

            // 4. Payroll
            const payrolls = await this.dataSource
              .createQueryBuilder()
              .select('p.id', 'id')
              .addSelect('p.created_at', 'date')
              .addSelect('CAST(p.total_amount AS NUMERIC)', 'amount')
              .from('payroll_runs', 'p')
              .where('p.salon_id = :salonId', { salonId })
              .andWhere("p.status = 'paid'")
              .andWhere('p.created_at BETWEEN :start AND :end', { start, end })
              .getRawMany();

            payrolls.forEach((p) =>
              ledger.push({
                date: p.date,
                type: 'Expense',
                category: 'Payroll',
                description: `Payroll Run Payout`,
                amount: parseFloat(p.amount || 0),
                isOutflow: true,
              }),
            );

            // 5. Wallet Fees
            const fees = await this.dataSource
              .createQueryBuilder()
              .select('tx.id', 'id')
              .addSelect('tx.created_at', 'date')
              .addSelect('CAST(tx.amount AS NUMERIC)', 'amount')
              .addSelect('tx.description', 'description')
              .from('wallet_transactions', 'tx')
              .innerJoin('wallets', 'w', 'w.id = tx.wallet_id')
              .where('w.salon_id = :salonId', { salonId })
              .andWhere("tx.transaction_type = 'fee'")
              .andWhere('tx.created_at BETWEEN :start AND :end', { start, end })
              .getRawMany();

            fees.forEach((f) =>
              ledger.push({
                date: f.date,
                type: 'Expense',
                category: 'System Fees',
                description: f.description || 'Transaction Fee',
                amount: parseFloat(f.amount || 0),
                isOutflow: true,
              }),
            );
        }
    }

    return ledger.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async exportAccountingToCsv(
    salonId: string,
    startDate: string,
    endDate: string,
    type?: 'income' | 'expense',
    categoryId?: string,
  ): Promise<string> {
    const ledger = await this.getAccountingLedger(salonId, startDate, endDate, type, categoryId);

    const header =
      'Date,Type,Category,Description,Inflow (RWF),Outflow (RWF),Net (RWF)\n';
    const rows = ledger
      .map((item) => {
        const dateStr = new Date(item.date).toLocaleDateString('en-GB');
        const inflow = !item.isOutflow ? item.amount : 0;
        const outflow = item.isOutflow ? item.amount : 0;
        const net = inflow - outflow;
        const cleanDesc = (item.description || '').replace(/"/g, '""');
        return `${dateStr},"${item.type}","${item.category}","${cleanDesc}",${inflow},${outflow},${net}`;
      })
      .join('\n');

    return header + rows;
  }

  async exportAccountingToPdf(
    salonId: string,
    startDate: string,
    endDate: string,
  ): Promise<Buffer> {
    // 1. Get Salon Name
    const salonRes = await this.dataSource.query(
      'SELECT name FROM salons WHERE id = $1',
      [salonId],
    );
    const salonName = salonRes[0]?.name || 'Uruti Salon';

    // 2. Get Data - PDF usually shows ALL, but strictly speaking if user filtered UI, maybe they want filtered PDF? 
    // Standard P&L is always Total. I'll leave PDF as Summary for now.
    const expenseSummary = await this.getExpenseSummary(
      salonId,
      startDate,
      endDate,
    );
    const financialSummary = await this.getFinancialSummary(
      salonId,
      startDate,
      endDate,
    );

    // 3. Format Data
    const reportData = {
      salonName,
      startDate: new Date(startDate).toLocaleDateString(),
      endDate: new Date(endDate).toLocaleDateString(),
      totalRevenue: new Intl.NumberFormat('en-RW', {
        style: 'currency',
        currency: 'RWF',
      }).format(financialSummary.totalRevenue),
      totalExpenses: new Intl.NumberFormat('en-RW', {
        style: 'currency',
        currency: 'RWF',
      }).format(financialSummary.totalExpenses),
      netIncome: new Intl.NumberFormat('en-RW', {
        style: 'currency',
        currency: 'RWF',
      }).format(financialSummary.netIncome),
      netIncomeRaw: financialSummary.netIncome,
      expensesByCategory: expenseSummary.byCategory.map((c) => ({
        name: c.categoryName,
        amount: new Intl.NumberFormat('en-RW', {
          style: 'currency',
          currency: 'RWF',
        }).format(c.total),
      })),
    };

    // 4. Generate
    return this.reportsService.generatePnlReport(reportData);
  }
}
