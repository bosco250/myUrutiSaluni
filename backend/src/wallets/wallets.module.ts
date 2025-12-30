import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { MockAirtelPayoutService } from './services/mock-airtel-payout.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, WalletTransaction]),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [WalletsController],
  providers: [WalletsService, MockAirtelPayoutService],
  exports: [WalletsService],
})
export class WalletsModule {}
