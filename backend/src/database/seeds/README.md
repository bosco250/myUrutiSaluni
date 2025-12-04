# Database Seeds

This directory contains seed data for the Salon Association Platform.

## Running Seeds

### Run All Seeds
```bash
npm run seed
```

### Run Salon Seeds Only
```bash
npm run seed:salons
```

## Seed Data Included

### Appointments (~50 total)
The seed creates approximately 50 appointments with diverse statuses and dates:
- **Past appointments** (15): Completed, Cancelled, No Show
- **Today's appointments** (10): Booked, Confirmed, In Progress
- **Future appointments** (25): Booked, Confirmed

Appointments are distributed across:
- Different salons
- Various services
- Multiple customers (or walk-ins)
- Different time slots throughout the day

**Note**: Appointment seeds require salons and services to exist first. Run salon and service seeds before appointment seeds.

### Salon Owners (12 total)
The seed creates 12 salon owners with diverse profiles across different districts in Rwanda:

1. **Marie Claire Uwimana** - Elegance Beauty Lounge (Gasabo, Kigali)
2. **Jean Baptiste Habimana** - Urban Cuts & Style (Kicukiro, Kigali)
3. **Grace Mukamana** - Grace Hair & Beauty Studio (Nyarugenge, Kigali)
4. **Patrick Niyonzima** - Executive Grooming Lounge (Gasabo, Kigali)
5. **Divine Uwase** - Divine Beauty Palace (Kicukiro, Kigali)
6. **Emmanuel Mugisha** - Southern Style Hub (Huye)
7. **Alice Uwineza** - Mountain Beauty Center (Musanze)
8. **David Nshimiyimana** - Lakeside Grooming Studio (Rubavu)
9. **Claudine Umutoni** - Claudine's Beauty Haven (Nyarugenge, Kigali)
10. **Samuel Bizimana** - Modern Cuts Barbershop (Gasabo, Kigali)
11. **Josephine Mukeshimana** - Josephine's Natural Hair Boutique (Gasabo, Kigali)
12. **Robert Uwizeye** - Prime Cuts & Spa (Kicukiro, Kigali)

### Login Credentials
All salon owners can login with:
- **Email**: Their respective email addresses (e.g., `marie.uwimana@salon.rw`)
- **Password**: `Password123!`

### Salon Types
Seeds include various business types:
- Full Service Salons
- Barbershops
- Beauty Centers
- Hair Studios
- Luxury Salons
- Grooming Studios
- Hair Boutiques

### Geographic Distribution
- **Kigali Districts**: Gasabo (5), Kicukiro (4), Nyarugenge (2)
- **Other Cities**: Huye (1), Musanze (1), Rubavu (1)

## Salon Features

Each salon includes:
- Complete contact information (phone, email, address)
- Registration number
- Business type and specialties
- Number of employees
- Opening hours
- Appointment settings
- Website (where applicable)

## Seed Behavior

- Seeds are **idempotent** - running them multiple times won't create duplicates
- Checks for existing users by email and phone
- Checks for existing salons by name and registration number
- Provides detailed console output of the seeding process
- Safe to run in both development and production environments

## Adding New Seeds

To add new seed data:

1. Create a new seed file in this directory (e.g., `seed-customers.ts`)
2. Implement the seed function following the pattern in `seed-salons.ts`
3. Import and call your seed function in `seed.ts`
4. Update this README with details about the new seed data

## Example: Creating a New Seed

```typescript
import { DataSource } from 'typeorm';
import { YourEntity } from '../../path/to/entity';

export async function seedYourEntity(dataSource: DataSource) {
  const repository = dataSource.getRepository(YourEntity);
  
  console.log('🌱 Seeding your entity...');
  
  // Check if data already exists
  const existingCount = await repository.count();
  if (existingCount > 0) {
    console.log(`✓ Skipping - ${existingCount} records already exist`);
    return;
  }
  
  // Create your seed data
  const data = [...];
  
  // Save to database
  for (const item of data) {
    const entity = repository.create(item);
    await repository.save(entity);
  }
  
  console.log(`✅ Created ${data.length} records`);
}
```

## Troubleshooting

### Permission Denied Error
Make sure the database file has proper permissions:
```bash
chmod 666 database/salon_association.db
```

### Module Not Found
Install dependencies:
```bash
npm install
```

### Database Locked
Close any other connections to the database and try again.

## Related Scripts

- `npm run build` - Build the project
- `npm run start:dev` - Start development server
- `npm run migration:run` - Run database migrations
- `npm run seed` - Run all seeds
