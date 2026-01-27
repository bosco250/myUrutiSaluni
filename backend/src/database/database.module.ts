import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Salon } from '../salons/entities/salon.entity';
import { SalonEmployee } from '../salons/entities/salon-employee.entity';
import { EmployeePermissionEntity } from '../salons/entities/employee-permission.entity';
import { SalonDocument } from '../salons/entities/salon-document.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Membership } from '../memberships/entities/membership.entity';
import { MembershipApplication } from '../memberships/entities/membership-application.entity';
import { MembershipPayment } from '../memberships/entities/membership-payment.entity';
import { Service } from '../services/entities/service.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { EmployeeWorkingHours } from '../appointments/entities/employee-working-hours.entity';
import { EmployeeAvailabilityRules } from '../appointments/entities/employee-availability-rules.entity';
import { ServicePackage } from '../service-packages/entities/service-package.entity';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { Product } from '../inventory/entities/product.entity';
import { InventoryMovement } from '../inventory/entities/inventory-movement.entity';
import { AttendanceLog } from '../attendance/entities/attendance-log.entity';
import { ChartOfAccount } from '../accounting/entities/chart-of-account.entity';
import { Expense } from '../accounting/entities/expense.entity';
import { JournalEntry } from '../accounting/entities/journal-entry.entity';
import { JournalEntryLine } from '../accounting/entities/journal-entry-line.entity';
import { Invoice } from '../accounting/entities/invoice.entity';
import { Loan } from '../loans/entities/loan.entity';
import { LoanProduct } from '../loans/entities/loan-product.entity';
import { LoanRepayment } from '../loans/entities/loan-repayment.entity';
import { CreditScore } from '../loans/entities/credit-score.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { WalletTransaction } from '../wallets/entities/wallet-transaction.entity';
import { AirtelAgent } from '../airtel/entities/airtel-agent.entity';
import { AirtelTransaction } from '../airtel/entities/airtel-transaction.entity';
import { Commission } from '../commissions/entities/commission.entity';
import { CustomerStyleReference } from '../customers/entities/customer-style-reference.entity';
import { SalonCustomer } from '../customers/entities/salon-customer.entity';
import { CustomerCommunication } from '../customers/entities/customer-communication.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationPreference } from '../notifications/entities/notification-preference.entity';
import { Communication } from '../communications/entities/communication.entity';
import { Inspection } from '../inspections/entities/inspection.entity';
import { Resource } from '../resources/entities/resource.entity';
import { PayrollRun } from '../payroll/entities/payroll-run.entity';
import { PayrollItem } from '../payroll/entities/payroll-item.entity';
import { LoyaltyPointTransaction } from '../customers/entities/loyalty-point-transaction.entity';
import { SalonRewardsConfig } from '../customers/entities/rewards-config.entity';
import { Conversation } from '../chat/entities/conversation.entity';
import { Message } from '../chat/entities/message.entity';
import { Review } from '../reviews/entities/review.entity';
import { Payment } from '../payments/entities/payment.entity';
import { CustomerFavorite } from '../customers/entities/customer-favorite.entity';
import { WaitlistEntry } from '../waitlist/entities/waitlist-entry.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get('DB_TYPE', 'postgres');
        const nodeEnv = configService.get('NODE_ENV', 'development');
        const isDevelopment = nodeEnv !== 'production';

        const entities = [
          User,
          Salon,
          SalonEmployee,
          EmployeePermissionEntity,
          SalonDocument,
          Customer,
          Membership,
          MembershipApplication,
          MembershipPayment,
          Service,
          Appointment,
          EmployeeWorkingHours,
          EmployeeAvailabilityRules,
          ServicePackage,
          Sale,
          SaleItem,
          Product,
          InventoryMovement,
          AttendanceLog,
          ChartOfAccount,
          JournalEntry,
          JournalEntryLine,
          Invoice,
          Loan,
          LoanProduct,
          LoanRepayment,
          CreditScore,
          Wallet,
          WalletTransaction,
          AirtelAgent,
          AirtelTransaction,
          Commission,
          CustomerStyleReference,
          SalonCustomer,
          CustomerCommunication,
          Notification,
          NotificationPreference,
          Communication,
          Inspection,
          Resource,
          PayrollRun,
          PayrollItem,
          LoyaltyPointTransaction,
          SalonRewardsConfig,
          Conversation,
          Message,
          Review,
          Payment,
          CustomerFavorite,
          Expense,
          WaitlistEntry,
        ];

        // Use PostgreSQL by default, SQLite only if explicitly set
        if (dbType === 'sqlite') {
          const dbPath = configService.get(
            'DB_DATABASE',
            'database/salon_association.db',
          );
          return {
            type: 'better-sqlite3',
            database: dbPath,
            entities,
            synchronize: isDevelopment, // Auto-create tables in development
            logging: isDevelopment
              ? ['error', 'warn', 'schema', 'migration']
              : ['error'],
            migrations: ['dist/migrations/*.js'],
          };
        } else {
          // PostgreSQL configuration (default)
          return {
            type: 'postgres',
            host: configService.get('DB_HOST', 'localhost'),
            port: configService.get<number>('DB_PORT', 5432),
            username: configService.get('DB_USERNAME', 'postgres'),
            password: configService.get('DB_PASSWORD', ''),
            database: configService.get('DB_DATABASE', 'salon_association'),
            entities,
            synchronize: isDevelopment, // Auto-create tables in development
            logging: isDevelopment ? ['error', 'warn', 'migration'] : ['error'],
            migrations: ['dist/migrations/*.js'],
            migrationsRun: false,
            ssl:
              configService.get('DB_SSL') === 'true'
                ? { rejectUnauthorized: false }
                : false,
            extra: {
              // PERFORMANCE: Increased pool for high concurrency
              max: 100, // Maximum connections (was 20)
              min: 10, // Minimum connections to keep ready
              connectionTimeoutMillis: 10000, // Wait up to 10s for connection
              idleTimeoutMillis: 30000, // Close idle connections after 30s
              statement_timeout: 30000, // Query timeout 30s (prevent long-running queries)
            },
          };
        }
      },
      inject: [ConfigService],
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
