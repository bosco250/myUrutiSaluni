# SQLite Compatibility Guide

This document outlines the changes made to ensure SQLite compatibility for development while maintaining PostgreSQL compatibility for production.

## Changes Made

### 1. ENUM Types → VARCHAR
SQLite doesn't support ENUM types. All enum columns have been converted to `VARCHAR(32)`:

- `User.role`
- `Membership.status`
- `Appointment.status`
- `Sale.paymentMethod`
- `InventoryMovement.movementType`
- `AttendanceLog.type`
- `ChartOfAccount.accountType`
- `JournalEntry.status`
- `Invoice.status`
- `Loan.status`
- `LoanProduct.productType`
- `WalletTransaction.transactionType` and `status`
- `AirtelAgent.agentType`
- `AirtelTransaction.transactionType`

**Note:** TypeScript enums are still used for type safety. The database stores string values.

### 2. JSONB → simple-json
SQLite doesn't support JSONB. All JSONB columns converted to `simple-json`:

- All `metadata` fields (19 columns)
- `eligibilityCriteria` in LoanProduct
- `factors` in CreditScore
- `airtelResponse` in AirtelTransaction

**Note:** TypeORM's `simple-json` type stores JSON as text in SQLite and as JSONB in PostgreSQL automatically.

### 3. TIMESTAMPTZ → datetime
SQLite doesn't support `timestamptz`. All timestamp columns converted to `datetime`:

- `Appointment.scheduledStart` and `scheduledEnd`
- `JournalEntry.postedAt`
- `Invoice.paidAt`
- `AirtelAgent.registeredAt`
- `AirtelTransaction.processedAt`
- `CreditScore.validUntil`

### 4. BIGINT → INTEGER
SQLite stores integers as INTEGER. Changed:

- `Customer.loyaltyPoints` from `bigint` to `integer`

## Supported Types (No Changes Needed)

These types work with both SQLite and PostgreSQL:

- ✅ `date` - Works in both databases
- ✅ `decimal` - Stored as REAL in SQLite, DECIMAL in PostgreSQL
- ✅ `double precision` - Stored as REAL in SQLite
- ✅ `datetime` - Works in both databases
- ✅ `text` - Works in both databases
- ✅ `varchar` - Works in both databases
- ✅ `uuid` - Generated as string in SQLite, UUID type in PostgreSQL

## Database Configuration

The application automatically detects which database to use:

**Development (SQLite):**
```env
DB_TYPE=sqlite
DB_DATABASE=database/salon_association.db
NODE_ENV=development
```

**Production (PostgreSQL):**
```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=salon_association
```

## Migration Notes

### From SQLite to PostgreSQL

When migrating from SQLite to PostgreSQL:

1. **ENUMs**: PostgreSQL will store VARCHAR values. You can optionally create ENUM types in PostgreSQL and migrate data.

2. **JSON**: `simple-json` columns will automatically use JSONB in PostgreSQL.

3. **Timestamps**: `datetime` works in both, but PostgreSQL can use `timestamptz` for timezone-aware timestamps if needed.

4. **UUIDs**: TypeORM handles UUID generation automatically for both databases.

### Data Type Mapping

| TypeORM Type | SQLite Storage | PostgreSQL Storage |
|--------------|----------------|-------------------|
| `varchar` | TEXT | VARCHAR |
| `simple-json` | TEXT (JSON string) | JSONB |
| `datetime` | TEXT (ISO 8601) | TIMESTAMP |
| `date` | TEXT (YYYY-MM-DD) | DATE |
| `decimal` | REAL | DECIMAL/NUMERIC |
| `integer` | INTEGER | INTEGER/BIGINT |
| `uuid` | TEXT (UUID string) | UUID |

## Best Practices

1. **Development**: Use SQLite for faster iteration
2. **Testing**: Use SQLite for unit/integration tests
3. **Staging**: Use PostgreSQL to match production
4. **Production**: Always use PostgreSQL

## Limitations

### SQLite Limitations to Be Aware Of

1. **No Foreign Key Constraints by Default**: TypeORM handles relationships, but SQLite doesn't enforce foreign keys unless explicitly enabled.

2. **Concurrent Writes**: SQLite handles concurrent reads well but can lock on writes. Fine for development, but PostgreSQL is better for production.

3. **No Full-Text Search**: SQLite has basic FTS, but PostgreSQL's full-text search is more powerful.

4. **Size Limits**: SQLite databases can be large, but PostgreSQL handles very large datasets better.

## Troubleshooting

### Database Locked Error
- Ensure only one process accesses the database
- Close any database viewers
- Restart the backend

### Type Mismatch Errors
- Verify all ENUM columns use VARCHAR
- Check JSON columns use `simple-json`
- Ensure timestamps use `datetime` not `timestamptz`

### Migration Issues
- SQLite migrations are simpler (no ENUM creation)
- PostgreSQL migrations may need additional steps for ENUM types
- Use TypeORM migrations for schema changes

## Testing

The codebase is designed to work seamlessly with both databases. Test your application with:

1. **SQLite** (development)
2. **PostgreSQL** (staging/production)

Both should produce identical results for the same data.

