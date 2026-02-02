import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { seedAdmin } from './seed-admin';
import { User } from '../../users/entities/user.entity';

// Only importa entities needed for connection init
import { Salon } from '../../salons/entities/salon.entity';
import { SalonEmployee } from '../../salons/entities/salon-employee.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Membership } from '../../memberships/entities/membership.entity';
import { MembershipApplication } from '../../memberships/entities/membership-application.entity';
import { MembershipPayment } from '../../memberships/entities/membership-payment.entity';
import { Service } from '../../services/entities/service.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Sale } from '../../sales/entities/sale.entity';
import { SaleItem } from '../../sales/entities/sale-item.entity';
import { Product } from '../../inventory/entities/product.entity';
import { InventoryMovement } from '../../inventory/entities/inventory-movement.entity';
import { AttendanceLog } from '../../attendance/entities/attendance-log.entity';
import { ChartOfAccount } from '../../accounting/entities/chart-of-account.entity';
import { JournalEntry } from '../../accounting/entities/journal-entry.entity';
import { JournalEntryLine } from '../../accounting/entities/journal-entry-line.entity';
import { Invoice } from '../../accounting/entities/invoice.entity';
import { Loan } from '../../loans/entities/loan.entity';
import { LoanProduct } from '../../loans/entities/loan-product.entity';
import { LoanRepayment } from '../../loans/entities/loan-repayment.entity';
import { CreditScore } from '../../loans/entities/credit-score.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { WalletTransaction } from '../../wallets/entities/wallet-transaction.entity';
import { AirtelAgent } from '../../airtel/entities/airtel-agent.entity';
import { AirtelTransaction } from '../../airtel/entities/airtel-transaction.entity';
import { Commission } from '../../commissions/entities/commission.entity';
import { CustomerStyleReference } from '../../customers/entities/customer-style-reference.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { NotificationPreference } from '../../notifications/entities/notification-preference.entity';
import { SalonDocument } from '../../salons/entities/salon-document.entity';

// Load environment variables
config();

const configService = new ConfigService();

async function runSeeds() {
  console.log('🌱 Starting database seeding (ADMIN ONLY)...\n');

  const dbType = configService.get('DB_TYPE', 'postgres');

  let dataSource: DataSource;

  const entities = [
    User,
    Salon,
    SalonEmployee,
    Customer,
    Membership,
    MembershipApplication,
    MembershipPayment,
    Service,
    Appointment,
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
    Notification,
    NotificationPreference,
    SalonDocument,
  ];

  try {
    if (dbType === 'sqlite') {
      const dbPath = configService.get(
        'DB_DATABASE',
        'database/salon_association.db',
      );
      console.log(`📂 Using SQLite database: ${dbPath}\n`);

      dataSource = new DataSource({
        type: 'better-sqlite3',
        database: dbPath,
        entities,
        synchronize: true,
        logging: false,
      });
    } else {
      console.log(`📂 Using PostgreSQL database\n`);

      dataSource = new DataSource({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', ''),
        database: configService.get('DB_DATABASE', 'salon_association'),
        entities,
        synchronize: true, // Keep sync for dev/seed env
        logging: false,
        ssl:
          configService.get('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
      });
    }

    await dataSource.initialize();
    console.log('✓ Database connection established\n');

    // Run ONLY seedAdmin
    await seedAdmin(dataSource);

    console.log('\n✅ Admin seed completed successfully!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  } finally {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('\n✓ Database connection closed');
    }
  }
}

// Run seeds
runSeeds()
  .then(() => {
    console.log('\n🎉 Seeding process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding process failed:', error);
    process.exit(1);
  });
