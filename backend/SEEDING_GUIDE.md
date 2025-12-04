# 🌱 Database Seeding Guide

## Quick Start

```bash
# Run all seeds
npm run seed

# Check seed status
npm run seed:check

# List all salon owners
npm run seed:list
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run seed` | Run all database seeds (idempotent) |
| `npm run seed:salons` | Run salon seeds specifically |
| `npm run seed:check` | Show database statistics |
| `npm run seed:list` | List all salon owners with details |

## What Gets Seeded

### ✅ Salon Owners (12)
- Complete user profiles with SALON_OWNER role
- Diverse names representing Rwanda
- Valid email addresses and phone numbers
- All with password: **Password123!**

### ✅ Salons (12)
- Full salon profiles with business details
- Geographic distribution across Rwanda
- Various business types (Full Service, Barbershop, Beauty Center, etc.)
- Complete contact information and settings

## Seed Data Details

### Geographic Coverage
- **Kigali** (11 salons)
  - Gasabo: 5 salons
  - Kicukiro: 4 salons  
  - Nyarugenge: 2 salons
- **Huye**: 1 salon
- **Musanze**: 1 salon
- **Rubavu**: 1 salon

### Business Types
- Full Service Salon: 2
- Barbershop/Grooming: 4
- Beauty Center/Palace: 3
- Hair Studio/Boutique: 2
- Luxury Salon: 1

## Login Credentials

All salon owners can login with their email and: **Password123!**

Example logins:
```
Email: marie.uwimana@salon.rw
Password: Password123!

Email: jb.habimana@salon.rw
Password: Password123!

Email: grace.mukamana@salon.rw
Password: Password123!
```

See [SALON_SEEDS.md](./SALON_SEEDS.md) for the complete list.

## Idempotent Design

The seed scripts are **idempotent**, meaning:
- ✅ Safe to run multiple times
- ✅ Won't create duplicates
- ✅ Checks for existing records before inserting
- ✅ Uses email and phone for uniqueness checks

## Testing Your Seeds

### 1. Check Database Status
```bash
npm run seed:check
```

Expected output:
```
📊 Database Statistics:
=======================
Total Users: 23
Salon Owners: 12
Salons: 14
```

### 2. View All Salon Owners
```bash
npm run seed:list
```

### 3. Test Login
Start the backend and try logging in:
```bash
npm run start:dev
```

Then visit:
- API: http://localhost:3000/api
- Frontend: http://localhost:3001/login

## File Structure

```
backend/
├── src/
│   └── database/
│       └── seeds/
│           ├── seed.ts              # Main seed runner
│           ├── seed-salons.ts       # Salon owner & salon seeds
│           └── README.md            # Detailed seed documentation
├── scripts/
│   ├── check-seeds.js               # Database statistics checker
│   └── list-salon-owners.js         # Detailed salon owner lister
├── database/
│   └── salon_association.db         # SQLite database
├── SALON_SEEDS.md                   # Complete salon details
└── package.json                     # Seed scripts
```

## Troubleshooting

### Database Locked
```bash
# Close all connections and try again
# Or restart the development server
```

### Permission Denied
```bash
chmod 666 database/salon_association.db
```

### Seeds Not Creating Data
```bash
# Check for errors in the output
npm run seed 2>&1 | more

# Verify database connection
npm run seed:check
```

### Reset Database (Careful!)
```bash
# Backup first!
cp database/salon_association.db database/salon_association.db.backup

# Delete and let TypeORM recreate
rm database/salon_association.db
npm run start:dev
# Then run seeds
npm run seed
```

## Adding New Seeds

To add new seed types (e.g., customers, services):

1. **Create seed file**: `src/database/seeds/seed-customers.ts`
2. **Export seed function**: 
   ```typescript
   export async function seedCustomers(dataSource: DataSource) {
     // Your seed logic
   }
   ```
3. **Import in main seed**: Add to `src/database/seeds/seed.ts`
4. **Document**: Update this README

## Production Considerations

### Before Production

- [ ] Change all default passwords
- [ ] Update email addresses to real ones
- [ ] Verify phone numbers
- [ ] Update salon addresses
- [ ] Add real salon images
- [ ] Configure email sending
- [ ] Set up SMS notifications

### Production Seeds

For production, consider:
- Use environment-specific seed data
- Don't seed test users in production
- Seed only necessary reference data
- Use strong, random passwords
- Log all seed operations

## Related Documentation

- [SALON_SEEDS.md](./SALON_SEEDS.md) - Complete salon details
- [src/database/seeds/README.md](./src/database/seeds/README.md) - Technical seed documentation
- [DATABASE_MIGRATION.md](../../DATABASE_MIGRATION.md) - Database setup guide

## Support

For issues or questions:
1. Check seed output for errors
2. Run `npm run seed:check` to verify database
3. Review logs in console
4. Check database file permissions

---

**Happy Seeding! 🌱**
