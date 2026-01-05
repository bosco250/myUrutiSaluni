import { DataSource } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

export async function seedAdmin(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);

  console.log('🌱 Seeding super admin...');

  const adminEmail = 'admin@uruti.rw';
  const adminPassword = 'Admin@123!';

  // Check if admin already exists
  const existingAdmin = await userRepository.findOne({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('  → Super admin already exists');
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = userRepository.create({
    fullName: 'Super Admin',
    email: adminEmail,
    passwordHash: hashedPassword,
    role: UserRole.SUPER_ADMIN,
    isActive: true,
    phone: '+250780000000', // Dummy phone
    metadata: {
      notes: 'Default super admin account',
    },
  });

  await userRepository.save(admin);
  console.log('  ✓ Created super admin: admin@uruti.rw');
}
