import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@ApiTags('Accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

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

