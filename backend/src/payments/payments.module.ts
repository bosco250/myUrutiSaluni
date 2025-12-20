import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './entities/payment.entity';
import { MtnMomoService } from './services/mtn-momo.service';
import { CustomersModule } from '../customers/customers.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    forwardRef(() => CustomersModule),
    NotificationsModule,
    WalletsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, MtnMomoService],
  exports: [PaymentsService, MtnMomoService],
})
export class PaymentsModule {}
