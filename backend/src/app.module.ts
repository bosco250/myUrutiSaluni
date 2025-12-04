import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { SalonsModule } from './salons/salons.module';
import { MembershipsModule } from './memberships/memberships.module';
import { ServicesModule } from './services/services.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { SalesModule } from './sales/sales.module';
import { InventoryModule } from './inventory/inventory.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AccountingModule } from './accounting/accounting.module';
import { LoansModule } from './loans/loans.module';
import { WalletsModule } from './wallets/wallets.module';
import { AirtelModule } from './airtel/airtel.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { CommissionsModule } from './commissions/commissions.module';
import { ServicePackagesModule } from './service-packages/service-packages.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { CommunicationsModule } from './communications/communications.module';
import { InspectionsModule } from './inspections/inspections.module';
import { ResourcesModule } from './resources/resources.module';
import { CommonModule } from './common/common.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    CommonModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    SalonsModule,
    MembershipsModule,
    ServicesModule,
    AppointmentsModule,
    SalesModule,
    InventoryModule,
    AttendanceModule,
    AccountingModule,
    LoansModule,
    WalletsModule,
    AirtelModule,
    DashboardModule,
    NotificationsModule,
    ReportsModule,
    CommissionsModule,
    ServicePackagesModule,
    WaitlistModule,
    CommunicationsModule,
    InspectionsModule,
    ResourcesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

