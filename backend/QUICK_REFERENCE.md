# Backend Quick Reference

## Startup Commands

```bash
# Development with hot reload
npm run start:dev

# Production
npm run start:prod

# Debug mode
npm run start:debug

# Build
npm run build
```

## Key URLs

- **API Base**: http://localhost:3000/api
- **Swagger Docs**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/health
- **Readiness**: http://localhost:3000/health/ready
- **Liveness**: http://localhost:3000/health/live

## Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

## Database Commands

```bash
# Generate migration
npm run migration:generate -- src/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

## Testing Commands

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## Common Decorators

```typescript
@Public()                    // Make route public
@Roles(UserRole.ADMIN)      // Require specific role
@CurrentUser()               // Get authenticated user
@IpAddress()                // Get request IP
@ApiBearerAuth('JWT-auth')  // Add auth to Swagger
```

## Common Guards

```typescript
@UseGuards(JwtAuthGuard)     // JWT authentication
@UseGuards(RolesGuard)       // Role-based access
@UseGuards(RateLimitGuard)   // Rate limiting
```

## Quick Examples

### Create Controller
```typescript
@ApiTags('Resource')
@Controller('resource')
export class ResourceController {
  @Get()
  @ApiOperation({ summary: 'List all' })
  findAll() { }
  
  @Post()
  @ApiOperation({ summary: 'Create new' })
  create(@Body() dto: CreateDto) { }
}
```

### Create DTO
```typescript
export class CreateDto {
  @ApiProperty({ example: 'value' })
  @IsString()
  field: string;
}
```

### Throw Errors
```typescript
throw new NotFoundException('Not found');
throw new BadRequestException('Invalid');
throw new UnauthorizedException('Unauthorized');
```

## Module Structure

```
module/
├── dto/
│   ├── create-*.dto.ts
│   └── update-*.dto.ts
├── entities/
│   └── *.entity.ts
├── *.controller.ts
├── *.service.ts
└── *.module.ts
```

## Useful Commands

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
tsc --noEmit
```

## Environment Variables

Required:
- `NODE_ENV` - development/production
- `PORT` - Server port (default: 3000)
- `DB_TYPE` - sqlite/postgres
- `JWT_SECRET` - Secret for JWT signing

Optional:
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- `FRONTEND_URL` - CORS origin
- `LOG_LEVEL` - Logging level

## Common Issues

### Port in use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database issues
- Check `.env` configuration
- Verify database is running
- Run migrations

### Module not found
```bash
npm install
npm run build
```

## API Response Format

Success:
```json
{
  "data": {},
  "statusCode": 200,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Error:
```json
{
  "statusCode": 404,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/resource/1",
  "method": "GET",
  "message": "Resource not found"
}
```

## Health Check Response

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  }
}
```

## Useful Links

- [Full Documentation](./README.md)
- [Development Guide](./DEVELOPMENT.md)
- [Improvements Log](./IMPROVEMENTS.md)
- [NestJS Docs](https://docs.nestjs.com/)

---

For detailed information, see README.md and DEVELOPMENT.md
