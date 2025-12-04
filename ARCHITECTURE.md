# Salon Association Platform - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  Next.js 14 (React 18) + Tailwind CSS + TypeScript          │
│  - Web Admin Panel                                           │
│  - Mobile-Responsive UI                                       │
│  - API Client (Axios)                                        │
└──────────────────────┬────────────────────────────────────────┘
                       │ HTTP/REST
                       │
┌──────────────────────▼────────────────────────────────────────┐
│                      Backend API Layer                         │
│  NestJS 10 + TypeScript                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Authentication & Authorization                        │   │
│  │  - JWT Authentication                                  │   │
│  │  - Role-Based Access Control (RBAC)                   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Business Logic Modules                                │   │
│  │  - Users, Salons, Memberships                          │   │
│  │  - Services, Appointments, Sales                       │   │
│  │  - Inventory, Attendance                              │   │
│  │  - Accounting, Loans, Wallets                         │   │
│  │  - Airtel Integration                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Data Access Layer                                     │   │
│  │  - TypeORM Entities                                   │   │
│  │  - Repository Pattern                                │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬────────────────────────────────────────┘
                       │
┌──────────────────────▼────────────────────────────────────────┐
│                    Database Layer                               │
│  PostgreSQL 14+                                                 │
│  - Relational Data Storage                                     │
│  - ACID Transactions                                           │
│  - Complex Queries & Reporting                                 │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                    External Services                           │
│  - Airtel Open API (Mobile Money)                              │
│  - SMS Provider (Twilio, etc.)                                  │
│  - Email Service (SendGrid, AWS SES)                           │
│  - Push Notifications (Firebase)                              │
└────────────────────────────────────────────────────────────────┘
```

## Module Architecture

### Backend Module Structure

Each module follows NestJS best practices:

```
module-name/
├── entities/              # TypeORM entities
│   └── entity.entity.ts
├── dto/                   # Data Transfer Objects
│   ├── create-*.dto.ts
│   └── update-*.dto.ts
├── module-name.module.ts  # Module definition
├── module-name.service.ts # Business logic
└── module-name.controller.ts # API endpoints
```

### Data Flow

```
Client Request
    ↓
Controller (Validation via DTOs)
    ↓
Service (Business Logic)
    ↓
Repository (Data Access)
    ↓
Database (PostgreSQL)
    ↓
Response (DTOs)
    ↓
Client
```

## Security Architecture

### Authentication Flow

1. User submits credentials
2. AuthService validates credentials
3. JWT token generated with user payload
4. Token stored in localStorage (frontend)
5. Token sent in Authorization header for subsequent requests
6. JwtStrategy validates token on protected routes

### Authorization

- Role-based access control (RBAC)
- Guards protect routes based on roles
- Decorators for role checking
- User context available via `@CurrentUser()` decorator

## Database Design

### Core Tables

**Users & Authentication**
- `users` - User accounts
- `salons` - Salon businesses
- `salon_employees` - Employee relationships
- `customers` - Customer profiles

**Operations**
- `services` - Service catalog
- `appointments` - Appointment scheduling
- `sales` - Sales transactions
- `sale_items` - Sale line items
- `products` - Inventory products
- `inventory_movements` - Stock movements
- `attendance_logs` - Employee attendance

**Membership & Association**
- `memberships` - Association memberships
- `membership_payments` - Membership fees

**Financial**
- `chart_of_accounts` - Accounting chart
- `journal_entries` - Double-entry journals
- `journal_entry_lines` - Journal line items
- `invoices` - Invoice management
- `wallets` - User wallets
- `wallet_transactions` - Wallet transactions

**Micro-Lending**
- `loan_products` - Loan product definitions
- `loans` - Loan applications
- `loan_repayments` - Repayment schedules
- `credit_scores` - Credit scoring

**Airtel Integration**
- `airtel_agents` - Agent registrations
- `airtel_transactions` - Transaction records

### Relationships

- One-to-Many: Salon → Employees, Services, Appointments
- Many-to-Many: Appointments ↔ Employees
- One-to-One: User → Wallet (per salon)
- Hierarchical: Chart of Accounts (parent-child)

## API Design

### RESTful Principles

- Resource-based URLs
- HTTP methods (GET, POST, PATCH, DELETE)
- Status codes for responses
- JSON request/response format

### Response Format

```json
{
  "data": { ... },
  "statusCode": 200,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Format

```json
{
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/resource",
  "method": "POST",
  "message": "Validation error message"
}
```

## Frontend Architecture

### Next.js App Router Structure

```
app/
├── layout.tsx          # Root layout
├── page.tsx            # Home page
├── (auth)/             # Auth routes
│   ├── login/
│   └── register/
├── (dashboard)/        # Protected routes
│   ├── dashboard/
│   ├── salons/
│   ├── appointments/
│   └── ...
└── api/                # API routes (if needed)
```

### State Management

- **Server State**: React Query for API data
- **Client State**: Zustand for UI state
- **Form State**: React Hook Form

### API Client

- Axios instance with interceptors
- Automatic token injection
- Error handling
- Type-safe API calls

## Integration Points

### Airtel Integration

1. Agent Registration
   - Register user as Airtel agent
   - Store agent credentials
   - Link to user/salon

2. Transaction Processing
   - Receive webhooks from Airtel
   - Update wallet balances
   - Track commissions
   - Reconcile float

### Notification System

- Multi-channel support
- Template-based messages
- Queue for async processing
- Delivery tracking

## Scalability Considerations

### Database
- Indexes on frequently queried fields
- Partitioning for large tables (future)
- Read replicas for reporting (future)

### Application
- Stateless API design
- Horizontal scaling ready
- Caching layer (Redis - future)
- Queue system for async tasks (future)

### File Storage
- Cloud storage for documents (future)
- CDN for static assets (future)

## Deployment Architecture

### Development
- Local PostgreSQL
- Local development servers
- Hot reload enabled

### Production (Recommended)
- Containerized (Docker)
- Load balancer
- Database replication
- CDN for static assets
- Monitoring and logging

## Technology Choices Rationale

### NestJS
- TypeScript-first
- Modular architecture
- Built-in dependency injection
- Excellent for enterprise applications

### PostgreSQL
- ACID compliance
- Complex queries
- JSON support
- Mature and reliable

### Next.js
- Server-side rendering
- API routes (if needed)
- Excellent developer experience
- Production-ready

### TypeORM
- TypeScript support
- Active Record & Data Mapper patterns
- Migration support
- Relationship management

