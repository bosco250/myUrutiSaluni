# Database Migration Guide

## SQLite (Development) → PostgreSQL (Production)

This guide explains how to migrate from SQLite (used in development) to PostgreSQL (used in production).

## Why SQLite for Development?

- **No setup required** - Works out of the box
- **Fast** - Perfect for local development
- **File-based** - Easy to backup and reset
- **Zero configuration** - No database server needed

## Why PostgreSQL for Production?

- **Better performance** - Handles concurrent connections
- **Advanced features** - Full SQL support, JSON, arrays
- **Scalability** - Handles large datasets
- **Production-ready** - ACID compliance, replication

## Configuration

### Development (SQLite)

In `backend/.env`:
```env
DB_TYPE=sqlite
DB_DATABASE=database/salon_association.db
NODE_ENV=development
```

The database file will be automatically created at `backend/database/salon_association.db`

### Production (PostgreSQL)

In `backend/.env`:
```env
DB_TYPE=postgres
DB_HOST=your-postgres-host
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_DATABASE=salon_association
NODE_ENV=production
```

## Migration Steps

### Option 1: Using TypeORM Synchronize (Development Only)

For development, TypeORM can automatically create tables:

```env
NODE_ENV=development
DB_TYPE=sqlite
```

When you start the backend, tables will be created automatically.

### Option 2: Using Migrations (Recommended for Production)

1. **Generate migration from entities:**
   ```bash
   cd backend
   npm run migration:generate -- -n InitialSchema
   ```

2. **Run migrations:**
   ```bash
   npm run migration:run
   ```

3. **For PostgreSQL, run the SQL schemas:**
   ```bash
   psql -U postgres -d salon_association -f ../salon_association_full_database_schema_postgres.sql
   psql -U postgres -d salon_association -f ../database/extended_schema.sql
   ```

### Option 3: Data Migration (SQLite → PostgreSQL)

If you have data in SQLite and want to migrate to PostgreSQL:

1. **Export data from SQLite:**
   ```bash
   sqlite3 database/salon_association.db .dump > data_export.sql
   ```

2. **Convert SQLite SQL to PostgreSQL:**
   - Remove SQLite-specific syntax
   - Convert data types (TEXT → VARCHAR, INTEGER → BIGINT)
   - Update ENUM definitions
   - Fix UUID handling

3. **Import to PostgreSQL:**
   ```bash
   psql -U postgres -d salon_association -f data_export_converted.sql
   ```

**Note:** Manual conversion may be needed for:
- ENUM types (SQLite uses TEXT, PostgreSQL uses ENUM)
- UUID generation
- Timestamp formats
- JSONB columns

## TypeORM Entity Compatibility

The entities are designed to work with both databases:

- **ENUMs**: TypeORM converts them to appropriate types
- **UUIDs**: Supported in both (SQLite uses TEXT, PostgreSQL uses UUID)
- **JSONB**: SQLite uses TEXT, PostgreSQL uses JSONB
- **Timestamps**: Both support TIMESTAMP types
- **Decimal**: Both support DECIMAL/NUMERIC

## Switching Between Databases

### From SQLite to PostgreSQL

1. Update `.env`:
   ```env
   DB_TYPE=postgres
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   DB_DATABASE=salon_association
   ```

2. Ensure PostgreSQL is running and database exists

3. Run migrations or SQL schemas

4. Restart the backend

### From PostgreSQL to SQLite

1. Update `.env`:
   ```env
   DB_TYPE=sqlite
   DB_DATABASE=database/salon_association.db
   ```

2. Remove PostgreSQL connection details

3. Restart the backend (database will be created automatically)

## Best Practices

1. **Development**: Use SQLite for faster iteration
2. **Staging**: Use PostgreSQL to match production
3. **Production**: Always use PostgreSQL
4. **Migrations**: Use TypeORM migrations for schema changes
5. **Backups**: Regularly backup your database
   - SQLite: Copy the `.db` file
   - PostgreSQL: Use `pg_dump`

## Troubleshooting

### SQLite Database Locked
- Ensure only one process is accessing the database
- Close any database viewers
- Restart the backend

### PostgreSQL Connection Refused
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `.env`
- Check firewall settings
- Ensure database exists

### Type Mismatch Errors
- Some types differ between SQLite and PostgreSQL
- Use TypeORM migrations to handle differences
- Test queries on both databases

## Database File Locations

- **SQLite**: `backend/database/salon_association.db`
- **PostgreSQL**: Managed by PostgreSQL server

## Backup and Restore

### SQLite
```bash
# Backup
cp database/salon_association.db database/salon_association.db.backup

# Restore
cp database/salon_association.db.backup database/salon_association.db
```

### PostgreSQL
```bash
# Backup
pg_dump -U postgres salon_association > backup.sql

# Restore
psql -U postgres salon_association < backup.sql
```

