import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { seedSalons } from './seed-salons';
import { seedMembershipApplications } from './seed-membership-applications';
import { seedAppointments } from './seed-appointments';
import { User } from '../../users/entities/user.entity';
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

// Load environment variables
config();

const configService = new ConfigService();

async function runSeeds() {
  console.log('🌱 Starting database seeding...\n');

  const dbType = configService.get('DB_TYPE', 'sqlite');
  const isDevelopment = configService.get('NODE_ENV') !== 'production';

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
  ];

  try {
    if (dbType === 'sqlite' || (isDevelopment && !configService.get('DB_HOST'))) {
      const dbPath = configService.get('DB_DATABASE', 'database/salon_association.db');
      console.log(`📂 Using SQLite database: ${dbPath}\n`);
      
      dataSource = new DataSource({
        type: 'better-sqlite3',
        database: dbPath,
        entities,
        synchronize: false,
        logging: false,
      });
    } else {
      console.log(`📂 Using PostgreSQL database\n`);
      
      dataSource = new DataSource({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'salon_association'),
        entities,
        synchronize: false,
        logging: false,
        ssl: configService.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      });
    }

    await dataSource.initialize();
    console.log('✓ Database connection established\n');

    // Run seed functions
    await seedSalons(dataSource);
    await seedMembershipApplications(dataSource);
    await seedAppointments(dataSource);

    console.log('\n✅ All seeds completed successfully!');
    console.log('\n📚 Summary:');
    console.log('   - 12 salon owners created');
    console.log('   - 12 salons created across different districts');
    console.log('   - 8 membership applications created (various statuses)');
    console.log('   - ~50 appointments created (past, present, and future)');
    console.log('   - All salon owners have the password: Password123!');
    console.log('\n🎯 You can now:');
    console.log('   - Login with any salon owner account');
    console.log('   - Review membership applications at /membership/applications');
    console.log('   - View appointments at /appointments');
    console.log('   - Approve/reject pending applications');
    
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
