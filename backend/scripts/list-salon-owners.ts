import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { User, UserRole } from '../src/users/entities/user.entity';
import { Salon } from '../src/salons/entities/salon.entity';

config();
const configService = new ConfigService();
const dbType = configService.get('DB_TYPE', 'postgres');

async function listSalonOwners() {
  const dataSource = new DataSource(
    dbType === 'sqlite'
      ? {
          type: 'better-sqlite3',
          database: './database/salon_association.db',
          entities: [User, Salon],
          synchronize: false,
        }
      : {
          type: 'postgres',
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get('DB_USERNAME', 'postgres'),
          password: configService.get('DB_PASSWORD', ''),
          database: configService.get('DB_DATABASE', 'salon_association'),
          entities: [User, Salon],
          synchronize: false,
          ssl: configService.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        }
  );

  try {
    await dataSource.initialize();
    console.log('\n🎯 SALON OWNERS & THEIR SALONS');
    console.log('='.repeat(80));

    const userRepository = dataSource.getRepository(User);
    const salonRepository = dataSource.getRepository(Salon);

    const salonOwners = await userRepository.find({
      where: { role: UserRole.SALON_OWNER },
      order: { fullName: 'ASC' },
    });

    if (salonOwners.length === 0) {
      console.log('\n⚠️  No salon owners found. Run: npm run seed');
    } else {
      let ownerCount = 0;
      let salonCount = 0;

      for (const owner of salonOwners) {
        ownerCount++;
        const salons = await salonRepository.find({
          where: { ownerId: owner.id },
        });

        console.log(`\n${ownerCount}. ${owner.fullName}`);
        console.log(`   📧 Email: ${owner.email}`);
        console.log(`   📱 Phone: ${owner.phone}`);
        console.log(`   🔑 Password: Password123!`);

        if (salons.length > 0) {
          console.log(`\n   🏢 Salon(s):`);
          for (const salon of salons) {
            salonCount++;
            console.log(`      • ${salon.name}`);
            console.log(`        📍 ${salon.address || 'N/A'}`);
            console.log(`        🏙️  ${salon.city}, ${salon.district}`);
            console.log(`        📋 Reg: ${salon.registrationNumber || 'N/A'}`);
            console.log(`        ⚡ Status: ${salon.status}`);
          }
        }
      }

      console.log('\n' + '='.repeat(80));
      console.log(`\n📊 Summary:`);
      console.log(`   • ${ownerCount} Salon Owners`);
      console.log(`   • ${salonCount} Salons`);
      console.log(`\n💡 Login at: http://localhost:3000/api (Swagger)`);
      console.log(`   Or frontend: http://localhost:3001/login\n`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

listSalonOwners()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

