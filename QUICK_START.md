# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites Check
```bash
node --version  # Should be 18+
# No database setup needed for development - SQLite is automatic!
```

### Step 1: Install Dependencies
```bash
npm run install:all
```

### Step 2: Database Setup

**For Development (SQLite) - No setup needed!**

The SQLite database will be created automatically when you start the backend. The database file will be at `backend/database/salon_association.db`.

**For Production (PostgreSQL):**
```bash
# Create database
createdb salon_association

# Run schemas
psql -U postgres -d salon_association -f salon_association_full_database_schema_postgres.sql
psql -U postgres -d salon_association -f database/extended_schema.sql
```

### Step 3: Configure Environment

**Backend** (`backend/.env`):
```env
# Development with SQLite (default)
DB_TYPE=sqlite
DB_DATABASE=database/salon_association.db
JWT_SECRET=your-secret-key-here
PORT=3000
NODE_ENV=development
```

**For PostgreSQL (production), use:**
```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=salon_association
JWT_SECRET=your-secret-key-here
PORT=3000
```

**Web** (`web/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Step 4: Start Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

**Terminal 2 - Web:**
```bash
cd web
npm run dev
```

### Step 5: Access the Application

- **Web**: http://localhost:3001
- **Backend API**: http://localhost:3000/api
- **API Docs**: http://localhost:3000/api/docs

### Step 6: Create First Admin User

Using Swagger UI or curl:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@salon.com",
    "password": "password123",
    "fullName": "Admin User",
    "role": "super_admin"
  }'
```

### Step 7: Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@salon.com",
    "password": "password123"
  }'
```

Copy the `access_token` and use it in the Authorization header:
```
Authorization: Bearer <your-token>
```

## 📚 Next Steps

1. **Explore API Documentation**
   - Visit http://localhost:3000/api/docs
   - Try out endpoints using Swagger UI

2. **Create Test Data**
   - Create a salon
   - Add services
   - Create appointments
   - Process sales

3. **Frontend Development**
   - Build login page
   - Create dashboard
   - Implement module pages

## 🆘 Troubleshooting

### Database Connection Error (SQLite)
- Check that `database/` directory exists in backend folder
- Ensure write permissions for database directory
- Delete `database/salon_association.db` and restart to recreate

### Database Connection Error (PostgreSQL)
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `.env`
- Ensure database exists: `psql -l | grep salon_association`
- Set `DB_TYPE=postgres` in `.env`

### Port Already in Use
- Change `PORT` in backend `.env`
- Or kill process: `lsof -ti:3000 | xargs kill`

### Module Not Found
- Run `npm install` in backend and web directories
- Check `node_modules` exists

## 📖 Documentation

- [Full Setup Guide](./SETUP.md)
- [Project Status](./PROJECT_STATUS.md)
- [Architecture](./ARCHITECTURE.md)
- [PRD](./salon_association_prd.md)

