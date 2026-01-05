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

@ApiTags('Accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // ==================== EXPENSE ENDPOINTS ====================

  @Post('expenses')
  @ApiOperation({ summary: 'Create a new expense' })
  async createExpense(@Body() dto: CreateExpenseDto, @Request() req) {
    return this.accountingService.createExpense(dto, req.user?.id);
  }

  @Get('expenses')
  @ApiOperation({ summary: 'Get expenses for a salon' })
  @ApiQuery({ name: 'salonId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getExpenses(@Query() query: QueryExpensesDto) {
    return this.accountingService.getExpenses(query);
  }

  @Get('expenses/:id')
  @ApiOperation({ summary: 'Get expense by ID' })
  async getExpenseById(@Param('id') id: string) {
    return this.accountingService.getExpenseById(id);
  }

  @Patch('expenses/:id')
  @ApiOperation({ summary: 'Update an expense' })
  async updateExpense(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.accountingService.updateExpense(id, dto);
  }

  @Delete('expenses/:id')
  @ApiOperation({ summary: 'Delete an expense' })
  async deleteExpense(@Param('id') id: string) {
    await this.accountingService.deleteExpense(id);
    return { message: 'Expense deleted successfully' };
  }

  @Get('expense-categories')
  @ApiOperation({ summary: 'Get expense categories for a salon' })
  @ApiQuery({ name: 'salonId', required: true })
  async getExpenseCategories(@Query('salonId') salonId: string) {
    return this.accountingService.getExpenseCategories(salonId);
  }

  @Get('expense-summary')
  @ApiOperation({ summary: 'Get expense summary for a salon' })
  @ApiQuery({ name: 'salonId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getExpenseSummary(
    @Query('salonId') salonId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.accountingService.getExpenseSummary(
      salonId,
      startDate,
      endDate,
    );
  }

  @Get('financial-summary')
  @ApiOperation({
    summary: 'Get financial summary (revenue, expenses, net income)',
  })
  @ApiQuery({ name: 'salonId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getFinancialSummary(
    @Query('salonId') salonId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.accountingService.getFinancialSummary(
      salonId,
      startDate,
      endDate,
    );
  }

  // ==================== EXISTING ENDPOINTS ====================

  @Post('accounts')
  @ApiOperation({ summary: 'Create a chart of account' })
  createAccount(@Body() createAccountDto: CreateAccountDto) {
    return this.accountingService.createAccount(createAccountDto);
  }

  @Post('journal-entries')
  @ApiOperation({ summary: 'Create a journal entry' })
  createJournalEntry(@Body() createEntryDto: CreateJournalEntryDto) {
    return this.accountingService.createJournalEntry(createEntryDto);
  }

  @Post('invoices')
  @ApiOperation({ summary: 'Create an invoice' })
  createInvoice(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.accountingService.createInvoice(createInvoiceDto);
  }
}
