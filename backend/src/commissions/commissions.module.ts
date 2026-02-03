import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionsService } from './commissions.service';
import { CommissionsController } from './commissions.controller';
import { Commission } from './entities/commission.entity';
import { SalonsModule } from '../salons/salons.module';
import { SalonEmployee } from '../salons/entities/salon-employee.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletsModule } from '../wallets/wallets.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Commission, SalonEmployee]),
    forwardRef(() => SalonsModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => WalletsModule),
    forwardRef(() => AccountingModule),
  ],
  controllers: [CommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
