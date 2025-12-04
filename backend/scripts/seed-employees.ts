import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../src/users/entities/user.entity';
import { Salon } from '../src/salons/entities/salon.entity';
import { SalonEmployee } from '../src/salons/entities/salon-employee.entity';
import { v4 as uuidv4 } from 'uuid';

const EMPLOYEES = [
  { fullName: 'Jean Baptiste', email: 'jean.baptiste@example.com', phone: '+250788111111', password: 'Employee@123', roleTitle: 'Senior Stylist', skills: ['Haircut', 'Coloring', 'Styling'], commissionRate: 15 },
  { fullName: 'Marie Claire', email: 'marie.claire@example.com', phone: '+250788222222', password: 'Employee@123', roleTitle: 'Hair Stylist', skills: ['Haircut', 'Braiding', 'Extensions'], commissionRate: 12 },
  { fullName: 'Paul Mukamana', email: 'paul.mukamana@example.com', phone: '+250788333333', password: 'Employee@123', roleTitle: 'Barber', skills: ['Men\'s Haircut', 'Beard Trim', 'Shaving'], commissionRate: 10 },
  { fullName: 'Grace Uwimana', email: 'grace.uwimana@example.com', phone: '+250788444444', password: 'Employee@123', roleTitle: 'Beauty Therapist', skills: ['Facial', 'Manicure', 'Pedicure'], commissionRate: 12 },
  { fullName: 'David Nkurunziza', email: 'david.nkurunziza@example.com', phone: '+250788555555', password: 'Employee@123', roleTitle: 'Junior Stylist', skills: ['Haircut', 'Washing'], commissionRate: 8 },
  { fullName: 'Annette Mukamana', email: 'annette.mukamana@example.com', phone: '+250788666666', password: 'Employee@123', roleTitle: 'Senior Hair Stylist', skills: ['Haircut', 'Coloring', 'Perm', 'Styling'], commissionRate: 18 },
  { fullName: 'Eric Niyonsaba', email: 'eric.niyonsaba@example.com', phone: '+250788777777', password: 'Employee@123', roleTitle: 'Master Barber', skills: ['Men\'s Haircut', 'Beard Design', 'Hair Design'], commissionRate: 15 },
  { fullName: 'Chantal Uwase', email: 'chantal.uwase@example.com', phone: '+250788888888', password: 'Employee@123', roleTitle: 'Nail Technician', skills: ['Manicure', 'Pedicure', 'Nail Art'], commissionRate: 10 },
];

async function seedEmployees() {
  const dataSource = new DataSource({
    type: 'better-sqlite3',
    database: './database/salon_association.db',
    entities: [User, Salon, SalonEmployee],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const userRepository = dataSource.getRepository(User);
    const salonRepository = dataSource.getRepository(Salon);
    const employeeRepository = dataSource.getRepository(SalonEmployee);

    let salon = await salonRepository.findOne({ where: {} });
    if (!salon) {
      const owner = await userRepository.findOne({ where: {} });
      if (!owner) {
        console.error('❌ No users found. Please create at least one user first.');
        await dataSource.destroy();
        return;
      }
      salon = salonRepository.create({
        id: uuidv4(),
        ownerId: owner.id,
        name: 'Default Salon',
        address: 'Kigali, Rwanda',
        city: 'Kigali',
        district: 'Nyarugenge',
        country: 'Rwanda',
        status: 'active',
        phone: '+250788000000',
        email: 'salon@example.com',
      });
      salon = await salonRepository.save(salon);
      console.log('✅ Created default salon:', salon.name);
    }

    console.log(`\n📋 Seeding ${EMPLOYEES.length} employees for salon: ${salon.name}`);
    let created = 0;
    let skipped = 0;

    for (const empData of EMPLOYEES) {
      const existing = await userRepository.findOne({ where: { email: empData.email } });
      if (existing) {
        console.log(`⏭️  Skipping ${empData.fullName} - user already exists`);
        skipped++;
        continue;
      }

      const hashedPassword = await bcrypt.hash(empData.password, 10);
      const user = userRepository.create({
        id: uuidv4(),
        email: empData.email,
        phone: empData.phone,
        passwordHash: hashedPassword,
        fullName: empData.fullName,
        role: UserRole.SALON_EMPLOYEE,
        isActive: true,
      });
      const savedUser = await userRepository.save(user);

      const employee = employeeRepository.create({
        id: uuidv4(),
        userId: savedUser.id,
        salonId: salon.id,
        roleTitle: empData.roleTitle,
        skills: empData.skills,
        commissionRate: empData.commissionRate,
        hireDate: new Date(),
        isActive: true,
      });
      await employeeRepository.save(employee);

      console.log(`✅ Created employee: ${empData.fullName} (${empData.roleTitle})`);
      created++;
    }

    console.log(`\n✅ Seeding complete! Created: ${created}, Skipped: ${skipped}`);
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error seeding employees:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

seedEmployees().then(() => process.exit(0)).catch(() => process.exit(1));

