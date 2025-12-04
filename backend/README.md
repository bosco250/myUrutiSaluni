# Salon Association Platform - Backend API

A comprehensive NestJS-based backend API for managing salon associations, membership systems, accounting, micro-lending, and Airtel Money integration.

## Features

### Core Functionality
- 🏪 **Multi-tenant Salon Management** - Manage multiple salons with dedicated dashboards
- 👥 **Role-Based Access Control (RBAC)** - Granular permissions system
- 💳 **Membership System** - Tiered membership with subscription management
- 📅 **Appointment Scheduling** - Real-time booking and calendar management
- 💰 **Sales & Inventory** - Point of sale and inventory tracking
- 📊 **Accounting Module** - Double-entry bookkeeping and financial reports
- 💸 **Micro-lending** - Loan products with credit scoring
- 📱 **Airtel Money Integration** - Payment processing and mobile wallet
- 🔔 **Real-time Notifications** - Event-driven notification system
- 📈 **Analytics Dashboard** - Business intelligence and reporting

### Technical Features
- 🛡️ **JWT Authentication** - Secure token-based auth
- ✅ **Request Validation** - Automatic DTO validation with class-validator
- 🔒 **Input Sanitization** - XSS protection and data sanitization
- 📝 **Comprehensive Logging** - Request/response logging with timestamps
- 🚨 **Global Error Handling** - Structured error responses
- 📚 **Swagger Documentation** - Interactive API docs
- ❤️ **Health Checks** - Kubernetes-ready health endpoints
- 🔄 **Database Migrations** - TypeORM migration system
- 🎯 **Rate Limiting** - Built-in request throttling
- 🌐 **CORS Support** - Configurable cross-origin requests

## Technology Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL (production) / SQLite (development)
- **ORM**: TypeORM 0.3.x
- **Authentication**: Passport JWT
- **Validation**: class-validator & class-transformer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest

## Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- PostgreSQL 14+ (for production)
- SQLite 3 (for development - included)

## Getting Started

### 1. Installation

```bash
# Install dependencies
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=development
PORT=3000

# For SQLite (development)
DB_TYPE=sqlite
DB_DATABASE=database/salon_association.db

# For PostgreSQL (production)
# DB_TYPE=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_USERNAME=postgres
# DB_PASSWORD=your_password
# DB_DATABASE=salon_association

JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=7d

FRONTEND_URL=http://localhost:3001
```

### 3. Database Setup

#### Development (SQLite)
```bash
# Database will be created automatically on first run
npm run start:dev
```

#### Production (PostgreSQL)
```bash
# Run migrations
npm run migration:run

# Create admin user
npm run create-admin
```

### 4. Start the Server

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

The API will be available at:
- **API**: http://localhost:3000/api
- **Swagger Docs**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/health

## API Documentation

Access the interactive Swagger documentation at http://localhost:3000/api/docs

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get current user profile

#### Salons
- `GET /api/salons` - List all salons
- `POST /api/salons` - Create salon
- `GET /api/salons/:id` - Get salon details
- `PATCH /api/salons/:id` - Update salon
- `DELETE /api/salons/:id` - Delete salon

#### Memberships
- `GET /api/memberships` - List memberships
- `POST /api/memberships/apply` - Apply for membership
- `PATCH /api/memberships/:id/approve` - Approve application

#### Health Checks
- `GET /health` - Overall health status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

## Project Structure

```
backend/
├── src/
│   ├── accounting/        # Accounting module
│   ├── airtel/           # Airtel Money integration
│   ├── appointments/     # Appointment scheduling
│   ├── attendance/       # Employee attendance
│   ├── auth/             # Authentication & authorization
│   ├── common/           # Shared utilities
│   │   ├── decorators/   # Custom decorators
│   │   ├── filters/      # Exception filters
│   │   ├── guards/       # Auth & rate limit guards
│   │   ├── interceptors/ # Logging & transform interceptors
│   │   ├── middleware/   # Request logging middleware
│   │   └── pipes/        # Validation pipes
│   ├── config/           # Configuration
│   ├── customers/        # Customer management
│   ├── dashboard/        # Analytics dashboard
│   ├── database/         # Database configuration
│   ├── inventory/        # Inventory management
│   ├── loans/            # Micro-lending system
│   ├── memberships/      # Membership management
│   ├── migrations/       # Database migrations
│   ├── notifications/    # Notification system
│   ├── sales/            # Sales & POS
│   ├── salons/           # Salon management
│   ├── services/         # Service catalog
│   ├── users/            # User management
│   ├── wallets/          # Digital wallets
│   ├── app.module.ts     # Root module
│   └── main.ts           # Application entry point
├── database/             # SQLite database (development)
├── .env.example          # Environment template
├── nest-cli.json         # NestJS CLI config
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript config
```

## Database Migrations

```bash
# Generate a new migration
npm run migration:generate -- src/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Route guards for protected endpoints
- Password hashing with bcrypt

### Request Security
- Input validation and sanitization
- Rate limiting per user/IP
- CORS protection
- Helmet security headers

### Data Security
- SQL injection protection via TypeORM
- XSS prevention through sanitization
- Secure password storage
- Environment variable configuration

## Deployment

### Production Checklist

1. **Environment Configuration**
   - Set `NODE_ENV=production`
   - Use strong JWT secret
   - Configure PostgreSQL connection
   - Enable SSL for database

2. **Build Application**
   ```bash
   npm run build
   ```

3. **Run Migrations**
   ```bash
   npm run migration:run
   ```

4. **Start Production Server**
   ```bash
   npm run start:prod
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `DB_TYPE` | Database type (sqlite/postgres) | `sqlite` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | - |
| `DB_DATABASE` | Database name | `salon_association` |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRATION` | Token expiration | `7d` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3001` |

## Performance Optimization

- Database connection pooling
- Query result caching
- Lazy loading of relations
- Request/response compression
- Rate limiting
- Efficient pagination

## Monitoring & Logging

### Health Checks
- `/health` - Combined health check
- `/health/ready` - Readiness probe (K8s)
- `/health/live` - Liveness probe (K8s)

### Logging
- Request/response logging
- Error tracking with stack traces
- Performance metrics
- SQL query logging (development)

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

ISC

## Support

For issues and questions, please open an issue on the repository.

---

Built with ❤️ using NestJS
