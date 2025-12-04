# PostgreSQL Setup Guide

This project has been migrated from SQLite (better-sqlite3) to PostgreSQL to avoid native compilation issues on Windows.

## Prerequisites

1. **Install PostgreSQL**
   - Download from: https://www.postgresql.org/download/windows/
   - Or use a package manager like Chocolatey: `choco install postgresql`
   - During installation, remember the password you set for the `postgres` user

2. **Verify Installation**
   ```powershell
   psql --version
   ```

## Database Setup

1. **Create the Database**
   ```powershell
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create the database
   CREATE DATABASE salon_association;
   
   # Exit psql
   \q
   ```

2. **Configure Environment Variables**
   
   Create a `.env` file in the `backend` directory (or copy from `.env.example` if available):
   ```env
   NODE_ENV=development
   DB_TYPE=postgres
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_postgres_password
   DB_DATABASE=salon_association
   DB_SSL=false
   ```

## Running the Application

1. **Install Dependencies**
   ```powershell
   npm install
   ```

2. **Run Migrations** (if you have migrations)
   ```powershell
   npm run migration:run
   ```

3. **Seed the Database** (optional)
   ```powershell
   npm run seed
   ```

4. **Start the Development Server**
   ```powershell
   npm run start:dev
   ```

## Available Scripts

- `npm run seed` - Seed the database with initial data
- `npm run seed:check` - Check if seed data exists
- `npm run seed:list` - List all salon owners
- `npm run seed:apps` - List all membership applications
- `npm run seed:employees` - Seed employees
- `npm run seed:products-services` - Seed products and services

## Troubleshooting

### Connection Issues

If you get connection errors:

1. **Check PostgreSQL is running**
   ```powershell
   # Windows: Check services
   Get-Service postgresql*
   ```

2. **Verify connection settings**
   - Make sure `DB_HOST`, `DB_PORT`, `DB_USERNAME`, and `DB_PASSWORD` are correct
   - Default port is `5432`

3. **Check firewall**
   - Make sure PostgreSQL port (5432) is not blocked

### Database Already Exists

If the database already exists, you can either:
- Use a different database name in `.env`
- Drop and recreate: `DROP DATABASE salon_association; CREATE DATABASE salon_association;`

## Migration from SQLite

If you had existing SQLite data and want to migrate:

1. Export data from SQLite (if needed)
2. Create the PostgreSQL database
3. Run migrations to create schema
4. Import data (if you have export scripts)

## Notes

- The project still supports SQLite if you set `DB_TYPE=sqlite` in your `.env` file
- However, SQLite requires `better-sqlite3` which needs Visual Studio Build Tools on Windows
- PostgreSQL is now the default and recommended database

