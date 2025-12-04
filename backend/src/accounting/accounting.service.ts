import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ChartOfAccount } from './entities/chart-of-account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { Invoice } from './entities/invoice.entity';

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
    private dataSource: DataSource,
  ) {}

  async createAccount(accountData: Partial<ChartOfAccount>): Promise<ChartOfAccount> {
    const account = this.chartOfAccountsRepository.create(accountData);
    return this.chartOfAccountsRepository.save(account);
  }

  async findAccountByCode(code: string, salonId: string): Promise<ChartOfAccount | null> {
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
        entryDate: entryData.entryDate ? new Date(entryData.entryDate) : new Date(),
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
            debitAmount: line.debitAmount ? parseFloat(String(line.debitAmount)) : 0,
            creditAmount: line.creditAmount ? parseFloat(String(line.creditAmount)) : 0,
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
      issueDate: invoiceData.issueDate ? new Date(invoiceData.issueDate) : new Date(),
      dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : undefined,
    });
    const saved = await this.invoicesRepository.save(invoice);
    return Array.isArray(saved) ? saved[0] : saved;
  }
}

