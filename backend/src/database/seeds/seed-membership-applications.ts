import { DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MembershipApplication } from '../../memberships/entities/membership-application.entity';

export async function seedMembershipApplications(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);
  const applicationRepository = dataSource.getRepository(MembershipApplication);

  console.log('🌱 Seeding membership applications...');

  // Check existing applications
  const existingAppsCount = await applicationRepository.count();
  console.log(`📊 Current database state: ${existingAppsCount} existing application(s)`);

  // Get all salon owners
  const salonOwners = await userRepository.find({
    where: { role: 'salon_owner' as any }
  });

  if (salonOwners.length === 0) {
    console.log('⚠️  No salon owners found. Run salon seeds first: npm run seed:salons');
    return;
  }

  console.log(`📋 Found ${salonOwners.length} salon owners`);

  // Create varied membership applications
  const applicationData = [
    {
      businessName: 'Elite Hair Studio',
      businessAddress: 'KG 15 Ave, Kimironko',
      city: 'Kigali',
      district: 'Gasabo',
      phone: '+250788111222',
      email: 'elite.studio@salon.rw',
      businessDescription: 'Modern hair studio specializing in contemporary styles and treatments',
      registrationNumber: 'SAL-2023-025',
      taxId: 'TAX-2023-025',
      status: 'pending',
    },
    {
      businessName: 'Beauty Express Center',
      businessAddress: 'KK 25 St, Kabuga',
      city: 'Kigali',
      district: 'Kicukiro',
      phone: '+250788222333',
      email: 'beauty.express@salon.rw',
      businessDescription: 'Quick and affordable beauty services for busy professionals',
      registrationNumber: 'SAL-2023-026',
      taxId: 'TAX-2023-026',
      status: 'pending',
    },
    {
      businessName: 'Glamour Spa & Salon',
      businessAddress: 'KN 8 Ave, Nyamirambo',
      city: 'Kigali',
      district: 'Nyarugenge',
      phone: '+250788333444',
      email: 'glamour.spa@salon.rw',
      businessDescription: 'Full-service spa and beauty salon with relaxation treatments',
      registrationNumber: 'SAL-2023-027',
      taxId: 'TAX-2023-027',
      status: 'pending',
    },
    {
      businessName: 'Royal Cuts Barbershop',
      businessAddress: 'Avenue de la Paix, Huye',
      city: 'Huye',
      district: 'Huye',
      phone: '+250788444555',
      email: 'royal.cuts@salon.rw',
      businessDescription: 'Professional barbershop serving the Southern Province',
      registrationNumber: 'SAL-2023-028',
      taxId: 'TAX-2023-028',
      status: 'pending',
    },
    {
      businessName: 'Natural Beauty Hub',
      businessAddress: 'Main Street, Musanze',
      city: 'Musanze',
      district: 'Musanze',
      phone: '+250788555666',
      email: 'natural.beauty@salon.rw',
      businessDescription: 'Specialized in natural hair care and organic products',
      registrationNumber: 'SAL-2023-029',
      taxId: 'TAX-2023-029',
      status: 'pending',
    },
    {
      businessName: 'City Style Lounge',
      businessAddress: 'KG 18 Rd, Gisozi',
      city: 'Kigali',
      district: 'Gasabo',
      phone: '+250788666777',
      email: 'city.style@salon.rw',
      businessDescription: 'Trendy salon offering the latest international styles',
      registrationNumber: 'SAL-2023-030',
      taxId: 'TAX-2023-030',
      status: 'approved',
      metadata: {
        approvalNotes: 'Excellent facility with modern equipment',
      }
    },
    {
      businessName: 'Affordable Cuts',
      businessAddress: 'KK 12 St, Gikondo',
      city: 'Kigali',
      district: 'Kicukiro',
      phone: '+250788777888',
      email: 'affordable.cuts@salon.rw',
      businessDescription: 'Budget-friendly salon for students and families',
      registrationNumber: 'SAL-2023-031',
      taxId: 'TAX-2023-031',
      status: 'rejected',
      rejectionReason: 'Incomplete documentation - missing business license',
    },
    {
      businessName: 'VIP Grooming Center',
      businessAddress: 'Airport Road, Kanombe',
      city: 'Kigali',
      district: 'Kicukiro',
      phone: '+250788888999',
      email: 'vip.grooming@salon.rw',
      businessDescription: 'Premium grooming services for executives and VIPs',
      registrationNumber: 'SAL-2023-032',
      taxId: 'TAX-2023-032',
      status: 'approved',
      metadata: {
        approvalNotes: 'High-end facility approved for premium membership',
      }
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const appData of applicationData) {
    try {
      // Check if application already exists
      const existing = await applicationRepository.findOne({
        where: [
          { businessName: appData.businessName },
          { email: appData.email },
          { registrationNumber: appData.registrationNumber }
        ]
      });

      if (existing) {
        skipped++;
        console.log(`  → Skipping existing application: ${appData.businessName}`);
        continue;
      }

      // Pick a random salon owner as applicant
      const randomOwner = salonOwners[Math.floor(Math.random() * salonOwners.length)];

      const application = applicationRepository.create({
        applicantId: randomOwner.id,
        businessName: appData.businessName,
        businessAddress: appData.businessAddress,
        city: appData.city,
        district: appData.district,
        phone: appData.phone,
        email: appData.email,
        businessDescription: appData.businessDescription,
        registrationNumber: appData.registrationNumber,
        taxId: appData.taxId,
        status: appData.status as any,
        rejectionReason: appData.rejectionReason || null,
        metadata: appData.metadata || {},
      });

      // If approved or rejected, set review timestamp
      if (appData.status === 'approved' || appData.status === 'rejected') {
        application.reviewedAt = new Date();
        // Use first admin user as reviewer if available
        const adminUser = await userRepository.findOne({
          where: [
            { role: 'super_admin' as any },
            { role: 'association_admin' as any }
          ]
        });
        if (adminUser) {
          application.reviewedById = adminUser.id;
        }
      }

      await applicationRepository.save(application);
      created++;
      console.log(`  ✓ Created application: ${application.businessName} (${application.status})`);
    } catch (error) {
      console.error(`  ✗ Error creating application for ${appData.businessName}:`, error.message);
    }
  }

  console.log(`\n✅ Membership applications seed completed:`);
  console.log(`   - ${created} applications created`);
  console.log(`   - ${skipped} applications skipped (already exist)`);
  
  // Show status breakdown
  const stats = await applicationRepository
    .createQueryBuilder('app')
    .select('app.status', 'status')
    .addSelect('COUNT(*)', 'count')
    .groupBy('app.status')
    .getRawMany();
  
  console.log(`\n📊 Application Status Breakdown:`);
  stats.forEach(stat => {
    console.log(`   - ${stat.status}: ${stat.count}`);
  });
}
