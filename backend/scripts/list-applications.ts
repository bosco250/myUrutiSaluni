import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { MembershipApplication } from '../src/memberships/entities/membership-application.entity';
import { User } from '../src/users/entities/user.entity';

config();
const configService = new ConfigService();
const dbType = configService.get('DB_TYPE', 'postgres');

async function listApplications() {
  const dataSource = new DataSource(
    dbType === 'sqlite'
      ? {
          type: 'better-sqlite3',
          database: './database/salon_association.db',
          entities: [MembershipApplication, User],
          synchronize: false,
        }
      : {
          type: 'postgres',
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get('DB_USERNAME', 'postgres'),
          password: configService.get('DB_PASSWORD', ''),
          database: configService.get('DB_DATABASE', 'salon_association'),
          entities: [MembershipApplication, User],
          synchronize: false,
          ssl: configService.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        }
  );

  try {
    await dataSource.initialize();
    console.log('\n📋 MEMBERSHIP APPLICATIONS');
    console.log('='.repeat(80));

    const appRepository = dataSource.getRepository(MembershipApplication);
    const userRepository = dataSource.getRepository(User);

    const apps = await appRepository.find({
      relations: ['applicant'],
      order: { createdAt: 'DESC' },
    });

    if (apps.length === 0) {
      console.log('\n⚠️  No applications found. Run: npm run seed');
    } else {
      const pending = apps.filter((a) => a.status === 'pending').length;
      const approved = apps.filter((a) => a.status === 'approved').length;
      const rejected = apps.filter((a) => a.status === 'rejected').length;

      console.log(`\n📊 Status Summary: ${apps.length} total`);
      console.log(`   ⏳ Pending: ${pending}`);
      console.log(`   ✅ Approved: ${approved}`);
      console.log(`   ❌ Rejected: ${rejected}`);
      console.log('\n' + '-'.repeat(80));

      apps.forEach((app, i) => {
        const statusIcon =
          app.status === 'pending' ? '⏳' : app.status === 'approved' ? '✅' : '❌';
        console.log(`\n${i + 1}. ${app.businessName}`);
        console.log(`   ${statusIcon} Status: ${app.status.toUpperCase()}`);
        console.log(`   📍 Location: ${app.city}, ${app.district}`);
        console.log(`   📧 Email: ${app.email}`);
        console.log(`   📱 Phone: ${app.phone}`);
        console.log(
          `   👤 Applicant: ${app.applicant ? app.applicant.fullName : 'N/A'}`,
        );
        console.log(`   📅 Applied: ${app.createdAt.toLocaleString()}`);
      });

      console.log('\n' + '='.repeat(80));
      console.log('\n💡 View in frontend: http://localhost:3001/membership/applications');
      console.log('💡 API endpoint: http://localhost:3000/api/memberships/applications\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

listApplications()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

