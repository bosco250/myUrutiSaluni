# Database Connection Configuration

## Your Database Details

Based on your PostgreSQL database creation, here's your connection configuration:

### Database Name
```
urutiSaluni
```

### Connection Configuration

Create a `.env` file in the `backend` directory with the following:

```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=
DB_DATABASE=urutiSaluni
DB_SSL=false
```

**Note**: If your PostgreSQL database has no password, use `DB_PASSWORD=` (empty value) or `DB_PASSWORD=""` (empty string).

### Connection String Format

If you need to use a connection string directly, it would look like:

```
postgresql://postgres:your_password@localhost:5432/urutiSaluni
```

Or with TypeORM connection string format:
```
postgresql://postgres:your_password@localhost:5432/urutiSaluni?sslmode=disable
```

### Quick Setup Steps

1. **Create `.env` file** in the `backend` directory:
   ```powershell
   cd backend
   # Copy the example and edit it
   ```

2. **Set your PostgreSQL password**:
   ```env
   DB_PASSWORD=the_password_you_set_during_postgres_installation
   ```

3. **Test the connection**:
   ```powershell
   npm run start:dev
   ```

### Connection Parameters Explained

- **DB_HOST**: `localhost` (or `127.0.0.1`) - your local machine
- **DB_PORT**: `5432` - default PostgreSQL port
- **DB_USERNAME**: `postgres` - the owner you specified
- **DB_PASSWORD**: The password you set when installing PostgreSQL
- **DB_DATABASE**: `urutiSaluni` - your database name
- **DB_SSL**: `false` for local development, `true` for production with SSL

### Troubleshooting

If you get connection errors:

1. **Check PostgreSQL is running**:
   ```powershell
   Get-Service postgresql*
   ```

2. **Test connection with psql**:
   ```powershell
   psql -U postgres -d urutiSaluni
   ```

3. **Verify database exists**:
   ```sql
   \l
   -- Look for urutiSaluni in the list
   ```

4. **Check password**: Make sure `DB_PASSWORD` in `.env` matches your PostgreSQL password

### Example .env File

Here's a complete example `.env` file:

```env
NODE_ENV=development
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=
DB_DATABASE=urutiSaluni
DB_SSL=false

JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
PORT=3000
CORS_ORIGIN=http://localhost:3001
```

**Important**: 
- If your database has no password, use `DB_PASSWORD=` (empty value)
- If your database has a password, replace the empty value with your actual PostgreSQL password

