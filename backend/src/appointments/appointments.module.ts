import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AvailabilityService } from './services/availability.service';
import { AvailabilityController } from './controllers/availability.controller';
import { EmployeeScheduleController } from './controllers/employee-schedule.controller';
import { EmployeeScheduleService } from './services/employee-schedule.service';
import { Appointment } from './entities/appointment.entity';
import { EmployeeWorkingHours } from './entities/employee-working-hours.entity';
import { EmployeeAvailabilityRules } from './entities/employee-availability-rules.entity';
import { Service } from '../services/entities/service.entity';
import { SalonEmployee } from '../salons/entities/salon-employee.entity';
import { SalonsModule } from '../salons/salons.module';
import { CustomersModule } from '../customers/customers.module';
import { ServicesModule } from '../services/services.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      EmployeeWorkingHours,
      EmployeeAvailabilityRules,
      Service,
      SalonEmployee,
    ]),
    forwardRef(() => SalonsModule),
    CustomersModule,
    ServicesModule,
    CommissionsModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [
    AppointmentsController,
    AvailabilityController,
    EmployeeScheduleController,
  ],
  providers: [
    AppointmentsService,
    AvailabilityService,
    EmployeeScheduleService,
  ],
  exports: [AppointmentsService, AvailabilityService, EmployeeScheduleService],
})
export class AppointmentsModule {}
