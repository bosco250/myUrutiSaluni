/**
 * Script to create a super admin user
 * Run with: npm run ts-node scripts/create-admin.ts
 * Or: npx ts-node scripts/create-admin.ts
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../src/users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

// Admin credentials
const ADMIN_EMAIL = 'admin@salonassociation.com';
const ADMIN_PASSWORD = 'Admin@1234';
const ADMIN_NAME = 'Super Admin';
const ADMIN_PHONE = '+250788123456';
const ADMIN_ROLE = UserRole.SUPER_ADMIN;

async function createAdmin() {
  // Create DataSource with the same config as the app
  const dataSource = new DataSource({
    type: 'better-sqlite3',
    database: './database/salon_association.db',
    entities: [User],
    synchronize: false, // Don't sync, just connect
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const userRepository = dataSource.getRepository(User);

    // Check if admin already exists
    const existingAdmin = await userRepository.findOne({
      where: [{ email: ADMIN_EMAIL }, { role: ADMIN_ROLE }],
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

