import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { User, UserRole } from '../src/users/entities/user.entity';
import { Salon } from '../src/salons/entities/salon.entity';

config();
const configService = new ConfigService();
const dbType = configService.get('DB_TYPE', 'postgres');

async function checkSeeds() {
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

    const userRepository = dataSource.getRepository(User);
    const salonRepository = dataSource.getRepository(Salon);

    const allUsers = await userRepository.count();
    const salonOwners = await userRepository.count({
      where: { role: UserRole.SALON_OWNER },
    });
    const salons = await salonRepository.count();

    console.log('\n📊 Database Statistics:');
    console.log('=======================');
    console.log(`Total Users: ${allUsers}`);
    console.log(`Salon Owners: ${salonOwners}`);
    console.log(`Salons: ${salons}`);

    if (salons > 0) {
      console.log('\n✅ Seed data exists!');

      // Show sample salon data
      const sampleSalons = await salonRepository.find({
        take: 5,
        select: ['name', 'city', 'district'],
      });
      console.log('\n📍 Sample Salons:');
      sampleSalons.forEach((salon, i) => {
        console.log(`   ${i + 1}. ${salon.name} (${salon.city}, ${salon.district})`);
      });
    } else {
      console.log('\n⚠️  No seed data found. Run: npm run seed');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

checkSeeds()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

