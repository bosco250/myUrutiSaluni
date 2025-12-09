import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import {
  WalletTransaction,
  WalletTransactionType,
  WalletTransactionStatus,
} from './entities/wallet-transaction.entity';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletsRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private transactionsRepository: Repository<WalletTransaction>,
    private dataSource: DataSource,
  ) {}

  async getOrCreateWallet(userId: string, salonId?: string): Promise<Wallet> {
    let wallet = await this.walletsRepository.findOne({
      where: { userId, salonId: salonId || null },
    });

    if (!wallet) {
      wallet = this.walletsRepository.create({ userId, salonId });
      wallet = await this.walletsRepository.save(wallet);
    }

    return wallet;
  }

  async createTransaction(
    walletId: string,
    type: WalletTransactionType,
    amount: number,
    description?: string,
  ): Promise<WalletTransaction> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, { where: { id: walletId } });
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const balanceBefore = Number(wallet.balance);
      const balanceAfter =
        type === WalletTransactionType.DEPOSIT ||
        type === WalletTransactionType.COMMISSION ||
        type === WalletTransactionType.REFUND
          ? balanceBefore + amount
          : balanceBefore - amount;

      if (balanceAfter < 0) {
        throw new Error('Insufficient balance');
      }

      await manager.update(Wallet, { id: walletId }, { balance: balanceAfter });

      const transaction = manager.create(WalletTransaction, {
        walletId,
        transactionType: type,
        amount,
        balanceBefore,
        balanceAfter,
        status: WalletTransactionStatus.COMPLETED,
        description,
      });

      return manager.save(transaction);
    });
  }

  async getWalletTransactions(walletId: string): Promise<WalletTransaction[]> {
    return this.transactionsRepository.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });
  }
}
