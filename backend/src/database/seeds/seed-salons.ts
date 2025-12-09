import { DataSource } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';
import { Salon } from '../../salons/entities/salon.entity';
import * as bcrypt from 'bcrypt';

export async function seedSalons(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);
  const salonRepository = dataSource.getRepository(Salon);

  console.log('🌱 Seeding salon owners and salons...');

  // Check how many salons exist
  const existingSalonsCount = await salonRepository.count();
  console.log(
    `📊 Current database state: ${existingSalonsCount} existing salon(s)`,
  );

  const hashedPassword = await bcrypt.hash('Password123!', 10);

  // Create salon owners with diverse profiles
  const salonOwnersData = [
    {
      fullName: 'Marie Claire Uwimana',
      email: 'marie.uwimana@salon.rw',
      phone: '+250788123456',
      city: 'Kigali',
      district: 'Gasabo',
      salonName: 'Elegance Beauty Lounge',
      description:
        'Premium beauty salon offering hair styling, spa treatments, and nail services in the heart of Kigali',
      address: 'KG 11 Ave, Kimihurura',
      registrationNumber: 'SAL-2020-001',
      website: 'https://elegancebeauty.rw',
      settings: {
        numberOfEmployees: 8,
        businessType: 'Full Service Salon',
        specialties: ['Hair Styling', 'Spa', 'Nails', 'Makeup'],
        openingHours: '08:00-20:00',
        acceptsAppointments: true,
      },
    },
    {
      fullName: 'Jean Baptiste Habimana',
      email: 'jb.habimana@salon.rw',
      phone: '+250788234567',
      city: 'Kigali',
      district: 'Kicukiro',
      salonName: 'Urban Cuts & Style',
      description: 'Modern barbershop and styling center for men and women',
      address: 'KK 15 St, Kicukiro Center',
      registrationNumber: 'SAL-2021-015',
      website: 'https://urbancuts.rw',
      settings: {
        numberOfEmployees: 5,
        businessType: 'Barbershop & Salon',
        specialties: ['Haircuts', 'Beard Grooming', 'Hair Coloring'],
        openingHours: '09:00-19:00',
        acceptsAppointments: true,
      },
    },
    {
      fullName: 'Grace Mukamana',
      email: 'grace.mukamana@salon.rw',
      phone: '+250788345678',
      city: 'Kigali',
      district: 'Nyarugenge',
      salonName: 'Grace Hair & Beauty Studio',
      description: 'Specialized in natural hair care and African hair braiding',
      address: 'KN 3 Ave, Nyamirambo',
      registrationNumber: 'SAL-2021-032',
      website: null,
      settings: {
        numberOfEmployees: 6,
        businessType: 'Hair Studio',
        specialties: ['Natural Hair', 'Braiding', 'Weaving', 'Locs'],
        openingHours: '08:00-18:00',
        acceptsAppointments: false,
      },
    },
    {
      fullName: 'Patrick Niyonzima',
      email: 'patrick.niyonzima@salon.rw',
      phone: '+250788456789',
      city: 'Kigali',
      district: 'Gasabo',
      salonName: 'Executive Grooming Lounge',
      description:
        'Luxury grooming experience for professionals and executives',
      address: 'KG 5 Ave, Gacuriro',
      registrationNumber: 'SAL-2022-008',
      website: 'https://executivegrooming.rw',
      settings: {
        numberOfEmployees: 10,
        businessType: 'Luxury Salon',
        specialties: ['Executive Cuts', 'Spa', 'Grooming', 'VIP Service'],
        openingHours: '07:00-21:00',
        acceptsAppointments: true,
      },
    },
    {
      fullName: 'Divine Uwase',
      email: 'divine.uwase@salon.rw',
      phone: '+250788567890',
      city: 'Kigali',
      district: 'Kicukiro',
      salonName: 'Divine Beauty Palace',
      description:
        'Complete beauty services including bridal makeup and event styling',
      address: 'KK 8 Rd, Gikondo',
      registrationNumber: 'SAL-2022-024',
      website: 'https://divinebeauty.rw',
      settings: {
        numberOfEmployees: 12,
        businessType: 'Beauty Palace',
        specialties: ['Bridal Makeup', 'Event Styling', 'Hair', 'Nails', 'Spa'],
        openingHours: '08:00-20:00',
        acceptsAppointments: true,
      },
    },
    {
      fullName: 'Emmanuel Mugisha',
      email: 'emmanuel.mugisha@salon.rw',
      phone: '+250788678901',
      city: 'Huye',
      district: 'Huye',
      salonName: 'Southern Style Hub',
      description:
        'Leading salon in the Southern Province serving Huye and surrounding areas',
      address: 'Avenue de la Cathedrale, Huye Town',
      registrationNumber: 'SAL-2021-045',
      website: null,
      settings: {
        numberOfEmployees: 7,
        businessType: 'Full Service Salon',
        specialties: ['Haircuts', 'Styling', 'Hair Treatment'],
        openingHours: '08:00-19:00',
        acceptsAppointments: true,
      },
    },
    {
      fullName: 'Alice Uwineza',
      email: 'alice.uwineza@salon.rw',
      phone: '+250788789012',
      city: 'Musanze',
      district: 'Musanze',
      salonName: 'Mountain Beauty Center',
      description: 'Premier beauty center in the Northern Province',
      address: 'Ruhengeri Main Street, Musanze',
      registrationNumber: 'SAL-2022-011',
      website: null,
      settings: {
        numberOfEmployees: 4,
        businessType: 'Beauty Center',
        specialties: ['Hair', 'Makeup', 'Nails'],
        openingHours: '09:00-18:00',
        acceptsAppointments: false,
      },
    },
    {
      fullName: 'David Nshimiyimana',
      email: 'david.nshimiyimana@salon.rw',
      phone: '+250788890123',
      city: 'Rubavu',
      district: 'Rubavu',
      salonName: 'Lakeside Grooming Studio',
      description: 'Modern grooming studio near Lake Kivu',
      address: 'Lake Kivu Road, Gisenyi',
      registrationNumber: 'SAL-2022-019',
      website: 'https://lakesidestudio.rw',
      settings: {
        numberOfEmployees: 5,
        businessType: 'Grooming Studio',
        specialties: ['Haircuts', 'Beard Grooming', 'Styling'],
        openingHours: '08:00-19:00',
        acceptsAppointments: true,
      },
    },
    {
      fullName: 'Claudine Umutoni',
      email: 'claudine.umutoni@salon.rw',
      phone: '+250788901234',
      city: 'Kigali',
      district: 'Nyarugenge',
      salonName: "Claudine's Beauty Haven",
      description: 'Family-friendly salon with affordable prices',
      address: 'KN 12 St, Kicukiro',
      registrationNumber: 'SAL-2023-003',
      website: null,
      settings: {
        numberOfEmployees: 3,
        businessType: 'Family Salon',
        specialties: ['Haircuts', 'Styling', 'Kids Cuts'],
        openingHours: '09:00-18:00',
        acceptsAppointments: false,
      },
    },
    {
      fullName: 'Samuel Bizimana',
      email: 'samuel.bizimana@salon.rw',
      phone: '+250788012345',
      city: 'Kigali',
      district: 'Gasabo',
      salonName: 'Modern Cuts Barbershop',
      description: 'Contemporary barbershop with skilled barbers',
      address: 'KG 21 Ave, Remera',
      registrationNumber: 'SAL-2023-007',
      website: 'https://moderncuts.rw',
      settings: {
        numberOfEmployees: 4,
        businessType: 'Barbershop',
        specialties: ['Fades', 'Line-ups', 'Beard Shaping'],
        openingHours: '08:00-20:00',
        acceptsAppointments: true,
      },
    },
    {
      fullName: 'Josephine Mukeshimana',
      email: 'josephine.mukeshimana@salon.rw',
      phone: '+250788123457',
      city: 'Kigali',
      district: 'Gasabo',
      salonName: "Josephine's Natural Hair Boutique",
      description: 'Specialized natural hair care and protective styling',
      address: 'KG 7 Rd, Kacyiru',
      registrationNumber: 'SAL-2023-012',
      website: null,
      settings: {
        numberOfEmployees: 5,
        businessType: 'Hair Boutique',
        specialties: [
          'Natural Hair Care',
          'Protective Styles',
          'Hair Products',
        ],
        openingHours: '09:00-19:00',
        acceptsAppointments: true,
      },
    },
    {
      fullName: 'Robert Uwizeye',
      email: 'robert.uwizeye@salon.rw',
      phone: '+250788234568',
      city: 'Kigali',
      district: 'Kicukiro',
      salonName: 'Prime Cuts & Spa',
      description: 'Premium barbershop with spa services',
      address: 'KK 19 Ave, Nyarugunga',
      registrationNumber: 'SAL-2023-018',
      website: 'https://primecuts.rw',
      settings: {
        numberOfEmployees: 6,
        businessType: 'Barbershop & Spa',
        specialties: ['Premium Cuts', 'Hot Towel Shave', 'Massage'],
        openingHours: '08:00-21:00',
        acceptsAppointments: true,
      },
    },
  ];

  const createdOwners: User[] = [];
  const createdSalons: Salon[] = [];

  for (const ownerData of salonOwnersData) {
    try {
      // Check if owner already exists by email or phone
      let owner = await userRepository.findOne({
        where: [{ email: ownerData.email }, { phone: ownerData.phone }],
      });

      if (!owner) {
        // Create salon owner user
        owner = userRepository.create({
          fullName: ownerData.fullName,
          email: ownerData.email,
          phone: ownerData.phone,
          passwordHash: hashedPassword,
          role: UserRole.SALON_OWNER,
          isActive: true,
          metadata: {
            city: ownerData.city,
            district: ownerData.district,
          },
        });

        owner = await userRepository.save(owner);
        createdOwners.push(owner);
        console.log(`  ✓ Created salon owner: ${owner.fullName}`);
      } else {
        console.log(`  → Using existing owner: ${owner.fullName}`);
      }

      // Check if salon already exists
      const existingSalon = await salonRepository.findOne({
        where: [
          { name: ownerData.salonName },
          { registrationNumber: ownerData.registrationNumber },
        ],
      });

      if (!existingSalon) {
        // Create salon
        const salon = salonRepository.create({
          name: ownerData.salonName,
          ownerId: owner.id,
          description: ownerData.description,
          address: ownerData.address,
          phone: ownerData.phone,
          email: ownerData.email,
          website: ownerData.website,
          city: ownerData.city,
          district: ownerData.district,
          country: 'Rwanda',
          registrationNumber: ownerData.registrationNumber,
          status: 'active',
          settings: ownerData.settings,
        });

        const savedSalon = await salonRepository.save(salon);
        createdSalons.push(savedSalon);
        console.log(`  ✓ Created salon: ${savedSalon.name}`);
      } else {
        console.log(`  → Salon already exists: ${ownerData.salonName}`);
      }
    } catch (error) {
      console.error(
        `  ✗ Error creating salon for ${ownerData.fullName}:`,
        error.message,
      );
    }
  }

  console.log(`\n✅ Seed completed:`);
  console.log(`   - ${createdOwners.length} salon owners created`);
  console.log(`   - ${createdSalons.length} salons created`);
  console.log(`\n📝 Login credentials for all salon owners:`);
  console.log(`   Password: Password123!`);
}
