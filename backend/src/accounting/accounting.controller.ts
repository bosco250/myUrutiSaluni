import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import {
  RequirePermission,
  RequireAnyPermission,
} from '../auth/decorators/require-employee-permission.decorator';
import { EmployeePermission } from '../common/enums/employee-permission.enum';

@ApiTags('Accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // ==================== EXPENSE ENDPOINTS ====================

  @Post('expenses')
  @RequireAnyPermission(
    EmployeePermission.CREATE_EXPENSES,
    EmployeePermission.MANAGE_EXPENSES,
  )
  @ApiOperation({ summary: 'Create a new expense' })
  async createExpense(@Body() dto: CreateExpenseDto, @Request() req) {
    // For employees, enforce the resolved salon ID to prevent spoofing
    if (req.user?.role === 'salon_employee' && req.resolvedSalonId) {
      dto.salonId = req.resolvedSalonId;
    }
    return this.accountingService.createExpense(dto, req.user?.id);
  }

  @Get('expenses')
  @RequireAnyPermission(
    EmployeePermission.VIEW_EXPENSE_REPORTS,
    EmployeePermission.MANAGE_EXPENSES,
  )
  @ApiOperation({ summary: 'Get expenses for a salon' })
  @ApiQuery({ name: 'salonId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getExpenses(@Query() query: QueryExpensesDto, @Request() req) {
    // For employees, enforce the resolved salon ID
    if (req.user?.role === 'salon_employee' && req.resolvedSalonId) {
      query.salonId = req.resolvedSalonId;
    }
    return this.accountingService.getExpenses(query);
  }

  @Get('expenses/:id')
  @RequireAnyPermission(
    EmployeePermission.VIEW_EXPENSE_REPORTS,
    EmployeePermission.MANAGE_EXPENSES,
  )
  @ApiOperation({ summary: 'Get expense by ID' })
  async getExpenseById(@Param('id') id: string) {
    return this.accountingService.getExpenseById(id);
  }

  @Patch('expenses/:id')
  @RequirePermission(EmployeePermission.MANAGE_EXPENSES)
  @ApiOperation({ summary: 'Update an expense' })
  async updateExpense(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.accountingService.updateExpense(id, dto);
  }

  @Delete('expenses/:id')
  @RequirePermission(EmployeePermission.MANAGE_EXPENSES)
  @ApiOperation({ summary: 'Delete an expense' })
  async deleteExpense(@Param('id') id: string) {
    await this.accountingService.deleteExpense(id);
    return { message: 'Expense deleted successfully' };
  }

  @Get('expense-categories')
  @RequireAnyPermission(
    EmployeePermission.VIEW_EXPENSE_REPORTS,
    EmployeePermission.CREATE_EXPENSES,
    EmployeePermission.MANAGE_EXPENSES,
  )
  @ApiOperation({ summary: 'Get expense categories for a salon' })
  @ApiQuery({ name: 'salonId', required: true })
  async getExpenseCategories(
    @Query('salonId') salonId: string,
    @Request() req,
  ) {
    // For employees, enforce the resolved salon ID
    const effectiveSalonId =
      req.user?.role === 'salon_employee' && req.resolvedSalonId
        ? req.resolvedSalonId
        : salonId;

    return this.accountingService.getExpenseCategories(effectiveSalonId);
  }

  @Get('expense-summary')
  @RequireAnyPermission(
    EmployeePermission.VIEW_EXPENSE_REPORTS,
    EmployeePermission.MANAGE_EXPENSES,
  )
  @ApiOperation({ summary: 'Get expense summary for a salon' })
  @ApiQuery({ name: 'salonId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getExpenseSummary(
    @Query('salonId') salonId: string,
    @Query('startDate') startDate: string | undefined, // Fixed type
    @Query('endDate') endDate: string | undefined, // Fixed type
    @Request() req,
  ) {
    const effectiveSalonId =
      req.user?.role === 'salon_employee' && req.resolvedSalonId
        ? req.resolvedSalonId
        : salonId;

    return this.accountingService.getExpenseSummary(
      effectiveSalonId,
      startDate,
      endDate,
    );
  }

  @Get('financial-summary')
  @RequireAnyPermission(
    EmployeePermission.VIEW_EXPENSE_REPORTS,
    EmployeePermission.MANAGE_EXPENSES,
    EmployeePermission.VIEW_SALES_REPORTS,
  )
  @ApiOperation({
    summary: 'Get financial summary (revenue, expenses, net income)',
  })
  @ApiQuery({ name: 'salonId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['income', 'expense'] })
  @ApiQuery({ name: 'categoryId', required: false })
  async getFinancialSummary(
    @Query('salonId') salonId: string,
    @Query('startDate') startDate: string | undefined, // Fixed type
    @Query('endDate') endDate: string | undefined, // Fixed type
    @Query('type') type: 'income' | 'expense' | undefined,
    @Query('categoryId') categoryId: string | undefined,
    @Request() req,
  ) {
    const effectiveSalonId =
      req.user?.role === 'salon_employee' && req.resolvedSalonId
        ? req.resolvedSalonId
        : salonId;

    return this.accountingService.getFinancialSummary(
      effectiveSalonId,
      startDate,
      endDate,
      type,
      categoryId,
    );
  }

  // ==================== EXISTING ENDPOINTS ====================

  @Post('accounts')
  @RequirePermission(EmployeePermission.MANAGE_EXPENSES) // Assumption: Access to accounts requires managing expenses for now
  @ApiOperation({ summary: 'Create a chart of account' })
  createAccount(@Body() createAccountDto: CreateAccountDto) {
    return this.accountingService.createAccount(createAccountDto);
  }

  @Post('journal-entries')
  @RequirePermission(EmployeePermission.MANAGE_EXPENSES) // Assumption: restricted
  @ApiOperation({ summary: 'Create a journal entry' })
  createJournalEntry(@Body() createEntryDto: CreateJournalEntryDto) {
    return this.accountingService.createJournalEntry(createEntryDto);
  }

  @Post('invoices')
  @RequirePermission(EmployeePermission.MANAGE_EXPENSES) // Assumption: restricted
  @ApiOperation({ summary: 'Create an invoice' })
  createInvoice(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.accountingService.createInvoice(createInvoiceDto);
  }
  @Get('charts/daily')
  @RequireAnyPermission(
    EmployeePermission.VIEW_EXPENSE_REPORTS,
    EmployeePermission.MANAGE_EXPENSES,
    EmployeePermission.VIEW_SALES_REPORTS,
  )
  @ApiOperation({ summary: 'Get daily financial charts data' })
  @ApiQuery({ name: 'salonId', required: true })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getDailyFinancials(
    @Query('salonId') salonId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const effectiveSalonId =
      req.user?.role === 'salon_employee' && req.resolvedSalonId
        ? req.resolvedSalonId
        : salonId;

    return this.accountingService.getDailyFinancials(
      effectiveSalonId,
      startDate,
      endDate,
    );
  }

  @Get('export/csv')
  @RequireAnyPermission(
    EmployeePermission.VIEW_EXPENSE_REPORTS,
    EmployeePermission.VIEW_SALES_REPORTS,
  )
  @ApiOperation({ summary: 'Export accounting ledger to CSV' })
  async exportCsv(
    @Query('salonId') salonId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('type') type: 'income' | 'expense' | undefined,
    @Query('categoryId') categoryId: string | undefined,
    @Request() req,
    @Res() res,
  ) {
    const effectiveSalonId =
      req.user?.role === 'salon_employee' && req.resolvedSalonId
        ? req.resolvedSalonId
        : salonId;

    const csvData = await this.accountingService.exportAccountingToCsv(
      effectiveSalonId,
      startDate,
      endDate,
      type,
      categoryId,
    );

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="accounting_ledger_${startDate}_${endDate}.csv"`,
    });

    return res.send(csvData);
  }

  @Get('export/pdf')
  @RequireAnyPermission(
    EmployeePermission.VIEW_EXPENSE_REPORTS,
    EmployeePermission.VIEW_SALES_REPORTS,
  )
  @ApiOperation({ summary: 'Export Profit & Loss statement to PDF' })
  async exportPdf(
    @Query('salonId') salonId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
    @Res() res,
  ) {
    const effectiveSalonId =
      req.user?.role === 'salon_employee' && req.resolvedSalonId
        ? req.resolvedSalonId
        : salonId;

    const pdfBuffer = await this.accountingService.exportAccountingToPdf(
      effectiveSalonId,
      startDate,
      endDate,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="pnl_statement_${startDate}_${endDate}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    return res.end(pdfBuffer);
  }
}
