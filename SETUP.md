# Salon Association Platform - Setup Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- **For Development**: SQLite (automatic, no setup needed)
- **For Production**: PostgreSQL 14+ installed and running

## Installation Steps

### 1. Install Dependencies

From the root directory:

```bash
npm run install:all
```

Or install separately:

```bash
# Backend
cd backend
npm install

# Web
cd ../web
npm install
```

### 2. Database Setup

#### Development (SQLite) - Recommended

**No setup required!** SQLite database will be created automatically on first run.

The database file will be created at: `backend/database/salon_association.db`

#### Production (PostgreSQL)

1. Create a PostgreSQL database:

```sql
CREATE DATABASE salon_association;
```

2. Run the base schema:

```bash
psql -U postgres -d salon_association -f salon_association_full_database_schema_postgres.sql
```

3. Run the extended schema:

```bash
psql -U postgres -d salon_association -f database/extended_schema.sql
```

### 3. Environment Configuration

#### Backend (.env)

Copy `backend/.env.example` to `backend/.env` and configure:

**For Development (SQLite) - Default:**
```env
DB_TYPE=sqlite
DB_DATABASE=database/salon_association.db

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

PORT=3000
NODE_ENV=development
```

**For Production (PostgreSQL):**
```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=salon_association

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

PORT=3000
NODE_ENV=production

# Airtel API (configure when ready)
AIRTEL_API_BASE_URL=https://openapiuat.airtel.africa
AIRTEL_CLIENT_ID=your-airtel-client-id
AIRTEL_CLIENT_SECRET=your-airtel-client-secret
```

#### Web (.env.local)

Copy `web/.env.example` to `web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 4. Run the Application

#### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

The backend will be available at `http://localhost:3000`
API documentation at `http://localhost:3000/api/docs`

**Terminal 2 - Web:**
```bash
cd web
npm run dev
```

The web application will be available at `http://localhost:3001`

### 5. Initial Setup

1. Access the API documentation at `http://localhost:3000/api/docs`
2. Register the first admin user via the `/api/auth/register` endpoint
3. Use the admin credentials to access the system

## Project Structure

```
salon-association-platform/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── users/          # User management
│   │   ├── salons/         # Salon management
│   │   ├── memberships/    # Membership management
│   │   ├── services/       # Service catalog
│   │   ├── appointments/   # Appointment scheduling
│   │   ├── sales/          # Sales & POS
│   │   ├── inventory/      # Inventory management
│   │   ├── attendance/     # Attendance tracking
│   │   ├── accounting/     # Accounting module
│   │   ├── loans/          # Micro-lending
│   │   ├── wallets/        # Financial wallets
│   │   ├── airtel/         # Airtel integration
│   │   ├── dashboard/      # Dashboard & analytics
│   │   └── notifications/  # Notifications
│   └── package.json
├── web/                   # Next.js web application
│   ├── app/               # Next.js app directory
│   ├── components/        # React components
│   └── lib/               # Utilities & API client
├── database/              # Database schemas
│   └── extended_schema.sql
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/login/phone` - Login with phone

### Core Modules
- `/api/users` - User management
- `/api/salons` - Salon management
- `/api/memberships` - Membership management
- `/api/services` - Service catalog
- `/api/appointments` - Appointments
- `/api/sales` - Sales & transactions
- `/api/inventory` - Inventory management
- `/api/accounting` - Accounting operations
- `/api/loans` - Loan management
- `/api/wallets` - Wallet operations
- `/api/airtel` - Airtel agent services
- `/api/dashboard` - Dashboard statistics

## Next Steps

1. **Complete Module Implementations**: Expand the service methods with full business logic
2. **Add Validation**: Implement comprehensive DTOs and validation
3. **Add Tests**: Write unit and integration tests
4. **Frontend Development**: Build out the UI components and pages
5. **Airtel Integration**: Implement actual Airtel API integration
6. **Notification System**: Set up SMS, email, and push notifications
7. **Reporting**: Implement comprehensive reporting features
8. **Mobile App**: Develop React Native mobile application

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists

### Port Conflicts
- Change `PORT` in backend `.env` if 3000 is in use
- Change web port in `package.json` scripts if 3001 is in use

### TypeORM Synchronization
- In development, `synchronize: true` auto-creates tables
- In production, use migrations instead

## Support

For issues or questions, refer to:
- [Product Requirements Document](./salon_association_prd.md)
- [Database Schema](./salon_association_full_database_schema_postgres.sql)
- [User Journey Maps](./salon_association_user_journey_maps.md)

