import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SalonsModule } from '../salons/salons.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AccountingModule } from '../accounting/accounting.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { CustomersModule } from '../customers/customers.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem]),
    forwardRef(() => SalonsModule),
    InventoryModule,
    forwardRef(() => AccountingModule),
    forwardRef(() => CommissionsModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => AppointmentsModule),
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
