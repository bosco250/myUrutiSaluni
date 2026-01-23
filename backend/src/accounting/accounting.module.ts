import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { ChartOfAccount } from './entities/chart-of-account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { Invoice } from './entities/invoice.entity';
import { Expense } from './entities/expense.entity';
import { SalesModule } from '../sales/sales.module';
import { SalonsModule } from '../salons/salons.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChartOfAccount,
      JournalEntry,
      JournalEntryLine,
      Invoice,
      Expense,
    ]),
    forwardRef(() => SalonsModule),
    forwardRef(() => SalesModule),
    forwardRef(() => ReportsModule),
  ],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
