# Task Flows & Business Process Overview

This document outlines the key business flows and task processes in the Salon Association Platform.

## 🏗️ System Architecture Overview

**Tech Stack:**

- **Backend**: NestJS + TypeORM + PostgreSQL/SQLite
- **Web Frontend**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **Mobile**: React Native
- **Authentication**: JWT with Role-Based Access Control (RBAC)

**Key Modules:**

1. Authentication & Users
2. Salons & Memberships
3. Customers
4. Services & Appointments
5. Sales & POS
6. Inventory
7. Attendance
8. Accounting
9. Loans (Micro-lending)
10. Wallets
11. Airtel Integration
12. Inspections
13. Notifications
14. Reports

---

## 🔄 Core Business Flows

### 1. **Membership Application & Approval Flow**

```
User Registration (CUSTOMER role)
    ↓
Membership Application Submission
    ↓
Admin Review (SUPER_ADMIN / ASSOCIATION_ADMIN)
    ↓
[APPROVED] → User role updated to SALON_OWNER
    ↓
Membership Number Generated
    ↓
Yearly Payment Structure Created (2 installments × 1500 RWF = 3000 RWF/year)
    ↓
User can now create Salons
```

**Key Files:**

- `backend/src/memberships/memberships.service.ts` - Handles application review and role updates
- `web/app/(dashboard)/membership/apply/page.tsx` - Application form
- `web/app/(dashboard)/membership/applications/page.tsx` - Admin review interface

**Status Flow:**

- `PENDING` → `APPROVED` or `REJECTED`

---

### 2. **Salon Operations Flow**

```
Salon Owner Creates Salon
    ↓
Add Employees (SALON_EMPLOYEE role)
    ↓
Define Services & Products
    ↓
Set Service Pricing per Salon
    ↓
Salon is Ready for Operations
```

**Key Entities:**

- `salons` - Salon information
- `salon_employees` - Employee relationships
- `services` - Service catalog
- `products` - Inventory products
- `service_pricing` - Salon-specific pricing

---

### 3. **Appointment Booking Flow**

```
Customer Books Appointment
    ↓
Select Salon, Service, Date/Time
    ↓
Appointment Created (status: BOOKED)
    ↓
[Optional] Confirmation
    ↓
Appointment Status Updates:
    - BOOKED → CONFIRMED
    - CONFIRMED → IN_PROGRESS
    - IN_PROGRESS → COMPLETED
    - Or → CANCELLED / NO_SHOW
```

**Key Files:**

- `backend/src/appointments/appointments.service.ts`
- `backend/src/appointments/entities/appointment.entity.ts`

**Status Enum:**

- `booked`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`

---

### 4. **Sales & POS Flow** (Most Complex Flow)

```
Sale Creation
    ↓
Add Sale Items (Services or Products)
    ↓
Calculate Totals (with discounts)
    ↓
Process Payment (cash, mobile_money, card, bank_transfer)
    ↓
[Automatic Side Effects:]
    ├─→ Inventory Movement (if products sold)
    ├─→ Commission Creation (if employee assigned)
    ├─→ Accounting Journal Entry (double-entry)
    └─→ Customer Statistics Updated
    ↓
Sale Completed
```

**Detailed Flow Breakdown:**

#### 4.1 Sale Item Processing

```typescript
// For each sale item:
- Calculate lineTotal = (unitPrice × quantity) - discountAmount
- If productId: Create inventory movement (CONSUMPTION, negative quantity)
- If salonEmployeeId: Create commission record
```

#### 4.2 Accounting Integration

```typescript
// Automatic journal entry creation:
DEBIT: Cash/Accounts Receivable (totalAmount)
CREDIT: Sales Revenue (netRevenue)
DEBIT: Sales Discounts (if discountAmount > 0)
```

#### 4.3 Commission Tracking

```typescript
// Commission created per sale item with employee
- Links to sale_item.id
- Amount calculated based on lineTotal
- Tracked in commissions table
```

**Key Files:**

- `backend/src/sales/sales.service.ts` - Main sales logic (1000+ lines)
- `backend/src/sales/entities/sale.entity.ts`
- `backend/src/sales/entities/sale-item.entity.ts`
- `backend/src/commissions/commissions.service.ts`
- `backend/src/inventory/inventory.service.ts`
- `backend/src/accounting/accounting.service.ts`

**Critical Dependencies:**

- Sales → Inventory (product consumption)
- Sales → Commissions (employee earnings)
- Sales → Accounting (financial records)
- Sales → Customers (loyalty tracking)

---

### 5. **Inventory Management Flow**

```
Product Creation
    ↓
Inventory Movements:
    - PURCHASE (stock in)
    - CONSUMPTION (stock out - from sales)
    - ADJUSTMENT (corrections)
    - TRANSFER (between locations)
    - RETURN (returns to supplier)
    ↓
Stock Levels Updated
```

**Movement Types:**

- `PURCHASE` - Positive quantity
- `CONSUMPTION` - Negative quantity (from sales)
- `ADJUSTMENT` - Can be positive or negative
- `TRANSFER` - Between salons/locations
- `RETURN` - Positive quantity (returning to supplier)

**Key Files:**

- `backend/src/inventory/inventory.service.ts`
- `backend/src/inventory/entities/inventory-movement.entity.ts`

---

### 6. **Attendance Tracking Flow**

```
Employee Clock In
    ↓
Attendance Log Created
    - source: mobile_app | ussd | web
    - clockInTime recorded
    - location (optional)
    ↓
Employee Clock Out
    ↓
Attendance Log Updated
    - clockOutTime recorded
    - duration calculated
```

**Key Files:**

- `backend/src/attendance/attendance.service.ts`
- `backend/src/attendance/entities/attendance-log.entity.ts`

---

### 7. **Loan Application Flow**

```
Salon Owner Applies for Loan
    ↓
Credit Scoring (based on salon performance)
    ↓
Loan Application Created
    ↓
Review & Approval
    ↓
Loan Disbursement (to wallet)
    ↓
Repayment Schedule Created
    ↓
Repayments Tracked
```

**Key Files:**

- `backend/src/loans/loans.service.ts`
- `backend/src/loans/entities/loan.entity.ts`

---

### 8. **Wallet Transaction Flow**

```
Wallet Creation (per salon)
    ↓
Transaction Types:
    - DEPOSIT
    - WITHDRAWAL
    - TRANSFER
    - LOAN_DISBURSEMENT
    - LOAN_REPAYMENT
    - COMMISSION
    - REFUND
    - FEE
    ↓
Balance Updated (atomic transaction)
```

**Key Files:**

- `backend/src/wallets/wallets.service.ts`
- `backend/src/wallets/entities/wallet.entity.ts`
- `backend/src/wallets/entities/wallet-transaction.entity.ts`

---

### 9. **Airtel Agent Flow**

```
Agent Registration
    ↓
Agent Type: Agent | AgentLite
    ↓
Float Balance Management
    ↓
Transaction Processing
    ↓
Commission Tracking
```

**Key Files:**

- `backend/src/airtel/airtel.service.ts`
- `backend/src/airtel/entities/airtel-agent.entity.ts`

---

## 🔗 Inter-Module Dependencies

### Critical Dependencies:

1. **Sales Module** is the central hub:

   ```
   Sales
   ├─→ Inventory (product consumption)
   ├─→ Commissions (employee earnings)
   ├─→ Accounting (journal entries)
   ├─→ Customers (loyalty tracking)
   └─→ Wallets (if payment via wallet)
   ```

2. **Membership Module** gates access:

   ```
   Membership Approval
   └─→ User Role Update (CUSTOMER → SALON_OWNER)
       └─→ Enables Salon Creation
   ```

3. **Accounting Module** tracks financials:
   ```
   Sales → Journal Entries
   Loans → Journal Entries
   Wallets → Journal Entries (optional)
   ```

---

## 📊 Data Flow Patterns

### Request Flow:

```
Frontend (Next.js)
    ↓ HTTP Request with JWT
Backend Controller
    ↓ Validation (DTOs)
Service Layer (Business Logic)
    ↓ Database Operations
TypeORM Repository
    ↓ SQL Queries
PostgreSQL/SQLite Database
```

### Response Flow:

```
Database Results
    ↓ Entity Mapping
Service Layer
    ↓ Business Logic Processing
Controller
    ↓ Response DTO
Frontend
    ↓ React Query Cache
UI Update
```

---

## 🎯 Key Business Rules

1. **Membership Rules:**
   - Annual fee: 3000 RWF (2 installments of 1500 RWF)
   - Payment must be complete to activate membership
   - Role upgrade: CUSTOMER → SALON_OWNER on approval

2. **Sales Rules:**
   - Each sale can have multiple items (services + products)
   - Products automatically reduce inventory
   - Commissions created for assigned employees
   - Automatic accounting journal entries

3. **Inventory Rules:**
   - Consumption movements are negative quantities
   - Stock levels calculated from all movements
   - Each movement references a sale or purchase

4. **Accounting Rules:**
   - Double-entry bookkeeping
   - Automatic account creation (if not exists)
   - Sales create: Debit Cash, Credit Revenue

---

## 🔐 Role-Based Access Control

**Roles:**

- `SUPER_ADMIN` - Full system access
- `ASSOCIATION_ADMIN` - Association management
- `DISTRICT_LEADER` - District oversight
- `SALON_OWNER` - Salon operations (after membership approval)
- `SALON_EMPLOYEE` - Employee operations
- `CUSTOMER` - Customer access

**Permission Flow:**

```
User Login → JWT Token Generated
    ↓
Token includes: userId, role, permissions
    ↓
Guards check role on protected routes
    ↓
Service layer validates permissions
```

---

## 📝 Task Implementation Checklist

When implementing new features, consider:

1. **Backend:**
   - [ ] Create Entity (TypeORM)
   - [ ] Create DTOs (validation)
   - [ ] Create Service (business logic)
   - [ ] Create Controller (API endpoints)
   - [ ] Add to AppModule
   - [ ] Add Swagger documentation

2. **Frontend:**
   - [ ] Create API client functions
   - [ ] Create React Query hooks
   - [ ] Create UI components
   - [ ] Add route/page
   - [ ] Add role-based access guards

3. **Integration:**
   - [ ] Check dependencies with other modules
   - [ ] Update accounting (if financial)
   - [ ] Add notifications (if needed)
   - [ ] Update dashboard (if needed)

---

## 🚀 Next Steps for Big Tasks

To work on major features, you should:

1. **Understand the Flow:**
   - Map out the complete user journey
   - Identify all touchpoints (frontend + backend)
   - List all database entities involved

2. **Identify Dependencies:**
   - Which modules are affected?
   - What side effects need to happen?
   - What validations are required?

3. **Plan Implementation:**
   - Start with database schema changes
   - Implement backend services
   - Create API endpoints
   - Build frontend UI
   - Add integration tests

4. **Test the Flow:**
   - Test happy path
   - Test error cases
   - Test edge cases
   - Test role permissions

---

## 📚 Key Files Reference

### Backend Services (Business Logic):

- `backend/src/sales/sales.service.ts` - Sales processing
- `backend/src/memberships/memberships.service.ts` - Membership management
- `backend/src/appointments/appointments.service.ts` - Appointment scheduling
- `backend/src/inventory/inventory.service.ts` - Inventory management
- `backend/src/accounting/accounting.service.ts` - Financial records
- `backend/src/commissions/commissions.service.ts` - Employee commissions

### Frontend Pages:

- `web/app/(dashboard)/dashboard/page.tsx` - Main dashboard
- `web/app/(dashboard)/sales/page.tsx` - Sales interface
- `web/app/(dashboard)/appointments/page.tsx` - Appointments
- `web/app/(dashboard)/membership/apply/page.tsx` - Membership application

### API Client:

- `web/lib/api.ts` - Axios instance with interceptors
- `web/lib/*.ts` - API client functions

---

## 💡 Tips for Understanding the Codebase

1. **Start with the Sales Flow** - It's the most complex and shows how modules integrate
2. **Follow the Data** - Trace how data flows from frontend → backend → database → response
3. **Check Dependencies** - When a sale is created, see what else happens automatically
4. **Read the Services** - Business logic is in service files, not controllers
5. **Check Entity Relationships** - TypeORM entities show how data is connected

---

**Last Updated:** Based on current codebase analysis
**Maintained By:** Development Team
