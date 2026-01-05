/**
 * Script to create an association admin user
 * Run with: npm run ts-node scripts/create-association-admin.ts
 * Or: npx ts-node scripts/create-association-admin.ts
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { User, UserRole } from '../src/users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

config();

// Association Admin credentials - EDIT THESE BEFORE RUNNING
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = '123456';
const ADMIN_NAME = 'Association Admin';
const ADMIN_PHONE = '+250788123456';
const ADMIN_ROLE = UserRole.ASSOCIATION_ADMIN;

async function createAssociationAdmin() {
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
          ssl:
            configService.get('DB_SSL') === 'true'
              ? { rejectUnauthorized: false }
              : false,
        },
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
      console.log('\n⚠️  Association Admin user already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      console.log(
        '\nIf you want to reset the password, delete the user first or update it manually.',
      );
      await dataSource.destroy();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Create association admin user
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

    console.log('\n✅ Association Admin user created successfully!');
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
    console.error('❌ Error creating association admin:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

// Run the script
createAssociationAdmin()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create association admin:', error);
    process.exit(1);
  });
