import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { Appointment } from './entities/appointment.entity';
import { SalonsModule } from '../salons/salons.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment]), SalonsModule, CustomersModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}

