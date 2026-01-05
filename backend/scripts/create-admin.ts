/**
 * Script to create a super admin user
 * Run with: npm run ts-node scripts/create-admin.ts
 * Or: npx ts-node scripts/create-admin.ts
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { User, UserRole } from '../src/users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

config();

// Admin credentials
const ADMIN_EMAIL = 'admin@supper.com';
const ADMIN_PASSWORD = '123456';
const ADMIN_NAME = 'Super Admin';
const ADMIN_PHONE = '+250788123456';
const ADMIN_ROLE = UserRole.SUPER_ADMIN;

async function createAdmin() {
  const configService = new ConfigService();
  const dbType = configService.get('DB_TYPE', 'postgres');
  
  // Create DataSource with the same config as the app
  const dataSource = new DataSource(
    dbType === 'sqlite'
      ? {
    type: 'better-sqlite3',
    database: './database/salon_association.db',
    entities: [User],
    synchronize: false, // Don't sync, just connect
        }
      : {
          type: 'postgres',
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get('DB_USERNAME', 'postgres'),
          password: configService.get('DB_PASSWORD', ''),
          database: configService.get('DB_DATABASE', 'salon_association'),
          entities: [User],
          synchronize: false,
          ssl: configService.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        }
  );

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const userRepository = dataSource.getRepository(User);

    // Check if admin already exists
    const existingAdmin = await userRepository.findOne({
      where: { email: ADMIN_EMAIL },
    });

    if (existingAdmin) {
      console.log('\n⚠️  Admin user already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      console.log('\nIf you want to reset the password, delete the user first or update it manually.');
      await dataSource.destroy();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Create admin user
    const adminUser = userRepository.create({
      id: uuidv4(),
      email: ADMIN_EMAIL,
      phone: ADMIN_PHONE,
      passwordHash: hashedPassword,
      fullName: ADMIN_NAME,
      role: ADMIN_ROLE,
      isActive: true,
      metadata: {},
    });

    await userRepository.save(adminUser);

    console.log('\n✅ Super Admin user created successfully!');
    console.log('\n📋 Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:    ', ADMIN_EMAIL);
    console.log('Password: ', ADMIN_PASSWORD);
    console.log('Role:     ', ADMIN_ROLE);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
    console.log('   Change the password after first login.\n');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

// Run the script
createAdmin()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create admin:', error);
    process.exit(1);
  });

