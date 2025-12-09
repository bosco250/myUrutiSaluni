import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { PayrollRun } from './entities/payroll-run.entity';
import { PayrollItem } from './entities/payroll-item.entity';
import { SalonEmployee } from '../salons/entities/salon-employee.entity';
import { Commission } from '../commissions/entities/commission.entity';
import { CommissionsModule } from '../commissions/commissions.module';
import { SalonsModule } from '../salons/salons.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PayrollRun,
      PayrollItem,
      SalonEmployee,
      Commission,
    ]),
    CommissionsModule,
    SalonsModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
