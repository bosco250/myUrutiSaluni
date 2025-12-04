import { DataSource } from 'typeorm';
import { User } from '../src/users/entities/user.entity';
import { Salon } from '../src/salons/entities/salon.entity';
import { Product } from '../src/inventory/entities/product.entity';
import { Service } from '../src/services/entities/service.entity';
import { v4 as uuidv4 } from 'uuid';

// Common salon products
const PRODUCTS = [
  // Hair Care Products
  { name: 'Shampoo - Moisturizing', sku: 'PROD-SH-001', unitPrice: 3500, taxRate: 18, description: 'Deep moisturizing shampoo for all hair types', isInventoryItem: true },
  { name: 'Conditioner - Repair', sku: 'PROD-CN-001', unitPrice: 4000, taxRate: 18, description: 'Repairing conditioner for damaged hair', isInventoryItem: true },
  { name: 'Hair Oil - Argan', sku: 'PROD-HO-001', unitPrice: 5500, taxRate: 18, description: 'Premium argan oil for hair treatment', isInventoryItem: true },
  { name: 'Hair Mask - Protein', sku: 'PROD-HM-001', unitPrice: 6000, taxRate: 18, description: 'Protein hair mask for strengthening', isInventoryItem: true },
  { name: 'Hair Serum - Anti-Frizz', sku: 'PROD-HS-001', unitPrice: 4500, taxRate: 18, description: 'Anti-frizz serum for smooth hair', isInventoryItem: true },
  
  // Styling Products
  { name: 'Hair Gel - Strong Hold', sku: 'PROD-HG-001', unitPrice: 3000, taxRate: 18, description: 'Strong hold gel for styling', isInventoryItem: true },
  { name: 'Hair Spray - Extra Hold', sku: 'PROD-HSP-001', unitPrice: 3500, taxRate: 18, description: 'Extra hold hairspray', isInventoryItem: true },
  { name: 'Mousse - Volume', sku: 'PROD-MO-001', unitPrice: 4000, taxRate: 18, description: 'Volumizing mousse', isInventoryItem: true },
  { name: 'Wax - Styling', sku: 'PROD-WX-001', unitPrice: 2500, taxRate: 18, description: 'Styling wax for men', isInventoryItem: true },
  
  // Hair Color Products
  { name: 'Hair Color - Black', sku: 'PROD-HC-BLK', unitPrice: 5000, taxRate: 18, description: 'Permanent black hair color', isInventoryItem: true },
  { name: 'Hair Color - Brown', sku: 'PROD-HC-BRN', unitPrice: 5000, taxRate: 18, description: 'Permanent brown hair color', isInventoryItem: true },
  { name: 'Hair Color - Blonde', sku: 'PROD-HC-BLD', unitPrice: 5500, taxRate: 18, description: 'Permanent blonde hair color', isInventoryItem: true },
  { name: 'Developer - 20 Volume', sku: 'PROD-DV-20', unitPrice: 3000, taxRate: 18, description: '20 volume developer for hair coloring', isInventoryItem: true },
  { name: 'Developer - 30 Volume', sku: 'PROD-DV-30', unitPrice: 3000, taxRate: 18, description: '30 volume developer for hair coloring', isInventoryItem: true },
  { name: 'Bleach Powder', sku: 'PROD-BL-001', unitPrice: 4000, taxRate: 18, description: 'Hair bleach powder', isInventoryItem: true },
  
  // Beauty Products
  { name: 'Face Cleanser', sku: 'PROD-FC-001', unitPrice: 4500, taxRate: 18, description: 'Gentle face cleanser', isInventoryItem: true },
  { name: 'Face Moisturizer', sku: 'PROD-FM-001', unitPrice: 5000, taxRate: 18, description: 'Daily face moisturizer', isInventoryItem: true },
  { name: 'Face Mask - Clay', sku: 'PROD-FMSK-001', unitPrice: 6000, taxRate: 18, description: 'Purifying clay face mask', isInventoryItem: true },
  { name: 'Sunscreen SPF 50', sku: 'PROD-SPF-50', unitPrice: 5500, taxRate: 18, description: 'High protection sunscreen', isInventoryItem: true },
  
  // Nail Products
  { name: 'Nail Polish - Red', sku: 'PROD-NP-RED', unitPrice: 2000, taxRate: 18, description: 'Classic red nail polish', isInventoryItem: true },
  { name: 'Nail Polish - Pink', sku: 'PROD-NP-PNK', unitPrice: 2000, taxRate: 18, description: 'Soft pink nail polish', isInventoryItem: true },
  { name: 'Nail Polish - Nude', sku: 'PROD-NP-NUD', unitPrice: 2000, taxRate: 18, description: 'Natural nude nail polish', isInventoryItem: true },
  { name: 'Nail Polish Remover', sku: 'PROD-NPR-001', unitPrice: 1500, taxRate: 18, description: 'Acetone-free nail polish remover', isInventoryItem: true },
  { name: 'Base Coat', sku: 'PROD-NBC-001', unitPrice: 2500, taxRate: 18, description: 'Nail base coat', isInventoryItem: true },
  { name: 'Top Coat', sku: 'PROD-NTC-001', unitPrice: 2500, taxRate: 18, description: 'Nail top coat for shine', isInventoryItem: true },
  { name: 'Cuticle Oil', sku: 'PROD-CO-001', unitPrice: 3000, taxRate: 18, description: 'Nourishing cuticle oil', isInventoryItem: true },
  
  // Barber Products
  { name: 'Shaving Cream', sku: 'PROD-SC-001', unitPrice: 3500, taxRate: 18, description: 'Premium shaving cream', isInventoryItem: true },
  { name: 'Aftershave Lotion', sku: 'PROD-AS-001', unitPrice: 4000, taxRate: 18, description: 'Soothing aftershave lotion', isInventoryItem: true },
  { name: 'Beard Oil', sku: 'PROD-BO-001', unitPrice: 4500, taxRate: 18, description: 'Conditioning beard oil', isInventoryItem: true },
  { name: 'Beard Balm', sku: 'PROD-BB-001', unitPrice: 5000, taxRate: 18, description: 'Styling beard balm', isInventoryItem: true },
  
  // Tools & Accessories
  { name: 'Hair Clips - Pack of 10', sku: 'PROD-HCP-001', unitPrice: 2000, taxRate: 18, description: 'Professional hair clips', isInventoryItem: true },
  { name: 'Hair Brushes - Set', sku: 'PROD-HBS-001', unitPrice: 8000, taxRate: 18, description: 'Professional hair brush set', isInventoryItem: true },
  { name: 'Hair Dryer', sku: 'PROD-HD-001', unitPrice: 25000, taxRate: 18, description: 'Professional hair dryer', isInventoryItem: true },
  { name: 'Flat Iron', sku: 'PROD-FI-001', unitPrice: 30000, taxRate: 18, description: 'Ceramic flat iron', isInventoryItem: true },
  { name: 'Curling Iron', sku: 'PROD-CI-001', unitPrice: 28000, taxRate: 18, description: 'Professional curling iron', isInventoryItem: true },
];

// Common salon services
const SERVICES = [
  // Hair Services
  { name: 'Haircut - Men', code: 'SRV-HC-M', basePrice: 3000, durationMinutes: 30, description: 'Standard men\'s haircut', isActive: true },
  { name: 'Haircut - Women', code: 'SRV-HC-W', basePrice: 5000, durationMinutes: 45, description: 'Standard women\'s haircut', isActive: true },
  { name: 'Haircut - Children', code: 'SRV-HC-C', basePrice: 2000, durationMinutes: 25, description: 'Children\'s haircut', isActive: true },
  { name: 'Hair Wash & Style', code: 'SRV-HWS', basePrice: 4000, durationMinutes: 40, description: 'Hair wash and styling', isActive: true },
  { name: 'Hair Trim', code: 'SRV-HT', basePrice: 2500, durationMinutes: 20, description: 'Hair trim only', isActive: true },
  
  // Hair Styling
  { name: 'Hair Styling', code: 'SRV-HST', basePrice: 6000, durationMinutes: 60, description: 'Professional hair styling', isActive: true },
  { name: 'Blow Dry', code: 'SRV-BD', basePrice: 5000, durationMinutes: 45, description: 'Blow dry service', isActive: true },
  { name: 'Hair Straightening', code: 'SRV-HSTR', basePrice: 10000, durationMinutes: 90, description: 'Hair straightening treatment', isActive: true },
  { name: 'Hair Curling', code: 'SRV-HCUR', basePrice: 8000, durationMinutes: 75, description: 'Hair curling service', isActive: true },
  { name: 'Updo Styling', code: 'SRV-UPDO', basePrice: 12000, durationMinutes: 90, description: 'Elegant updo styling', isActive: true },
  
  // Hair Coloring
  { name: 'Full Hair Color', code: 'SRV-FHC', basePrice: 15000, durationMinutes: 120, description: 'Full head hair coloring', isActive: true },
  { name: 'Hair Highlights', code: 'SRV-HH', basePrice: 20000, durationMinutes: 150, description: 'Hair highlights', isActive: true },
  { name: 'Hair Lowlights', code: 'SRV-HL', basePrice: 18000, durationMinutes: 150, description: 'Hair lowlights', isActive: true },
  { name: 'Root Touch-up', code: 'SRV-RT', basePrice: 8000, durationMinutes: 60, description: 'Root color touch-up', isActive: true },
  { name: 'Hair Bleaching', code: 'SRV-HBL', basePrice: 18000, durationMinutes: 120, description: 'Hair bleaching service', isActive: true },
  
  // Hair Treatment
  { name: 'Hair Treatment - Deep Conditioning', code: 'SRV-HTD', basePrice: 8000, durationMinutes: 60, description: 'Deep conditioning treatment', isActive: true },
  { name: 'Hair Treatment - Protein', code: 'SRV-HTP', basePrice: 10000, durationMinutes: 75, description: 'Protein hair treatment', isActive: true },
  { name: 'Hair Treatment - Keratin', code: 'SRV-HTK', basePrice: 25000, durationMinutes: 120, description: 'Keratin smoothing treatment', isActive: true },
  { name: 'Hair Treatment - Hot Oil', code: 'SRV-HTO', basePrice: 6000, durationMinutes: 45, description: 'Hot oil treatment', isActive: true },
  
  // Braiding & Weaving
  { name: 'Cornrows', code: 'SRV-CRW', basePrice: 12000, durationMinutes: 120, description: 'Cornrow braiding', isActive: true },
  { name: 'Box Braids', code: 'SRV-BXB', basePrice: 25000, durationMinutes: 240, description: 'Box braids installation', isActive: true },
  { name: 'Ghana Braids', code: 'SRV-GHB', basePrice: 18000, durationMinutes: 180, description: 'Ghana braids', isActive: true },
  { name: 'Hair Weaving', code: 'SRV-HW', basePrice: 30000, durationMinutes: 180, description: 'Hair weaving service', isActive: true },
  { name: 'Hair Extensions', code: 'SRV-HE', basePrice: 35000, durationMinutes: 240, description: 'Hair extensions installation', isActive: true },
  
  // Barber Services
  { name: 'Beard Trim', code: 'SRV-BT', basePrice: 2000, durationMinutes: 15, description: 'Beard trimming', isActive: true },
  { name: 'Beard Shave', code: 'SRV-BS', basePrice: 3000, durationMinutes: 20, description: 'Full beard shave', isActive: true },
  { name: 'Hot Towel Shave', code: 'SRV-HTS', basePrice: 5000, durationMinutes: 30, description: 'Premium hot towel shave', isActive: true },
  { name: 'Line-up', code: 'SRV-LU', basePrice: 2500, durationMinutes: 20, description: 'Hairline and beard line-up', isActive: true },
  { name: 'Fade Cut', code: 'SRV-FC', basePrice: 4000, durationMinutes: 40, description: 'Professional fade haircut', isActive: true },
  
  // Beauty Services
  { name: 'Facial - Basic', code: 'SRV-FB', basePrice: 8000, durationMinutes: 60, description: 'Basic facial treatment', isActive: true },
  { name: 'Facial - Deep Cleansing', code: 'SRV-FDC', basePrice: 12000, durationMinutes: 75, description: 'Deep cleansing facial', isActive: true },
  { name: 'Facial - Anti-Aging', code: 'SRV-FAA', basePrice: 15000, durationMinutes: 90, description: 'Anti-aging facial', isActive: true },
  { name: 'Eyebrow Threading', code: 'SRV-ET', basePrice: 2000, durationMinutes: 15, description: 'Eyebrow threading', isActive: true },
  { name: 'Eyebrow Waxing', code: 'SRV-EW', basePrice: 2500, durationMinutes: 20, description: 'Eyebrow waxing', isActive: true },
  { name: 'Makeup - Basic', code: 'SRV-MB', basePrice: 15000, durationMinutes: 60, description: 'Basic makeup application', isActive: true },
  { name: 'Makeup - Full', code: 'SRV-MF', basePrice: 25000, durationMinutes: 90, description: 'Full makeup application', isActive: true },
  { name: 'Makeup - Bridal', code: 'SRV-MBR', basePrice: 50000, durationMinutes: 120, description: 'Bridal makeup package', isActive: true },
  
  // Nail Services
  { name: 'Manicure - Basic', code: 'SRV-MNB', basePrice: 5000, durationMinutes: 45, description: 'Basic manicure', isActive: true },
  { name: 'Manicure - French', code: 'SRV-MNF', basePrice: 7000, durationMinutes: 60, description: 'French manicure', isActive: true },
  { name: 'Manicure - Gel', code: 'SRV-MNG', basePrice: 10000, durationMinutes: 75, description: 'Gel manicure', isActive: true },
  { name: 'Pedicure - Basic', code: 'SRV-PDB', basePrice: 6000, durationMinutes: 60, description: 'Basic pedicure', isActive: true },
  { name: 'Pedicure - Spa', code: 'SRV-PDS', basePrice: 12000, durationMinutes: 90, description: 'Spa pedicure', isActive: true },
  { name: 'Nail Art', code: 'SRV-NA', basePrice: 8000, durationMinutes: 60, description: 'Nail art design', isActive: true },
  { name: 'Nail Extension', code: 'SRV-NE', basePrice: 15000, durationMinutes: 90, description: 'Nail extension service', isActive: true },
  
  // Spa Services
  { name: 'Full Body Massage', code: 'SRV-FBM', basePrice: 20000, durationMinutes: 90, description: 'Full body massage', isActive: true },
  { name: 'Back Massage', code: 'SRV-BM', basePrice: 10000, durationMinutes: 45, description: 'Back massage', isActive: true },
  { name: 'Head & Shoulder Massage', code: 'SRV-HSM', basePrice: 8000, durationMinutes: 30, description: 'Head and shoulder massage', isActive: true },
  { name: 'Body Scrub', code: 'SRV-BS', basePrice: 15000, durationMinutes: 60, description: 'Exfoliating body scrub', isActive: true },
];

async function seedProductsAndServices() {
  const dataSource = new DataSource({
    type: 'better-sqlite3',
    database: './database/salon_association.db',
    entities: [User, Salon, Product, Service],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const salonRepository = dataSource.getRepository(Salon);
    const productRepository = dataSource.getRepository(Product);
    const serviceRepository = dataSource.getRepository(Service);

    // Get all salons
    const salons = await salonRepository.find();
    
    if (salons.length === 0) {
      console.error('❌ No salons found. Please create salons first.');
      await dataSource.destroy();
      return;
    }

    console.log(`\n📋 Found ${salons.length} salon(s)`);
    console.log(`\n🛍️  Seeding products and services for all salons...\n`);

    let totalProductsCreated = 0;
    let totalProductsSkipped = 0;
    let totalServicesCreated = 0;
    let totalServicesSkipped = 0;

    for (const salon of salons) {
      console.log(`\n📍 Processing salon: ${salon.name}`);

      // Seed Products
      console.log(`   📦 Adding ${PRODUCTS.length} products...`);
      for (const productData of PRODUCTS) {
        const existing = await productRepository.findOne({
          where: {
            salonId: salon.id,
            sku: productData.sku,
          },
        });

        if (existing) {
          totalProductsSkipped++;
          continue;
        }

        const product = productRepository.create({
          id: uuidv4(),
          salonId: salon.id,
          ...productData,
        });

        await productRepository.save(product);
        totalProductsCreated++;
      }

      // Seed Services
      console.log(`   ✂️  Adding ${SERVICES.length} services...`);
      for (const serviceData of SERVICES) {
        const existing = await serviceRepository.findOne({
          where: {
            salonId: salon.id,
            code: serviceData.code,
          },
        });

        if (existing) {
          totalServicesSkipped++;
          continue;
        }

        const service = serviceRepository.create({
          id: uuidv4(),
          salonId: salon.id,
          ...serviceData,
        });

        await serviceRepository.save(service);
        totalServicesCreated++;
      }

      console.log(`   ✅ Completed: ${salon.name}`);
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`   Products: Created ${totalProductsCreated}, Skipped ${totalProductsSkipped}`);
    console.log(`   Services: Created ${totalServicesCreated}, Skipped ${totalServicesSkipped}`);
    console.log(`\n📊 Summary per salon:`);
    console.log(`   - Products per salon: ${PRODUCTS.length}`);
    console.log(`   - Services per salon: ${SERVICES.length}`);
    
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error seeding products and services:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

seedProductsAndServices().then(() => process.exit(0)).catch(() => process.exit(1));

