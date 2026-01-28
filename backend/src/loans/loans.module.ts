import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';
import { Loan } from './entities/loan.entity';
import { LoanProduct } from './entities/loan-product.entity';
import { LoanRepayment } from './entities/loan-repayment.entity';
import { CreditScore } from './entities/credit-score.entity';
import { AppointmentsModule } from '../appointments/appointments.module';
import { SalonsModule } from '../salons/salons.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Loan, LoanProduct, LoanRepayment, CreditScore]),
    AppointmentsModule,
    SalonsModule,
    SalesModule,
  ],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
