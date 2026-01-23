import { Module, forwardRef } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SalesModule } from '../sales/sales.module';
import { SalonsModule } from '../salons/salons.module';
import { UsersModule } from '../users/users.module';
import { MembershipsModule } from '../memberships/memberships.module';

@Module({
  imports: [
    forwardRef(() => SalesModule),
    forwardRef(() => SalonsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => MembershipsModule),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
