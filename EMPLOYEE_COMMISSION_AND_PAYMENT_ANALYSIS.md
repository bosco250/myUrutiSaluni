# Employee Commission & Payment System - Complete Analysis

## 📋 Current System Overview

### 1. **Commission System (Per Task/Sale Item)**

#### How Commissions Work:

- **Trigger**: Commissions are automatically created when a **sale item** has an employee assigned (`salonEmployeeId`)
- **Calculation**: Based on the employee's `commissionRate` percentage stored in `salon_employees` table
- **Formula**: `commissionAmount = (saleItem.lineTotal × commissionRate) / 100`

#### Flow:

```
Sale Created
    ↓
Sale Items Added (with optional salonEmployeeId)
    ↓
Sale Completed
    ↓
processCommissions() called automatically
    ↓
For each sale item with salonEmployeeId:
    - Get employee's commissionRate
    - Calculate: (lineTotal × commissionRate) / 100
    - Create Commission record (paid = false)
```

#### Commission Entity Structure:

```typescript
{
  id: UUID
  salonEmployeeId: UUID (required)
  saleItemId: UUID (nullable - links to sale_item)
  amount: DECIMAL(12,2) - calculated commission
  commissionRate: DECIMAL(5,2) - percentage used
  saleAmount: DECIMAL(14,2) - original sale item total
  paid: BOOLEAN (default: false)
  paidAt: TIMESTAMP (nullable)
  createdAt: TIMESTAMP
}
```

#### Key Files:

- `backend/src/commissions/commissions.service.ts` - Commission creation & management
- `backend/src/commissions/commissions.controller.ts` - API endpoints
- `backend/src/sales/sales.service.ts` - Auto-creates commissions on sale completion
- `backend/src/commissions/entities/commission.entity.ts` - Database entity

---

### 2. **Commission Payment Process**

#### Current Payment Methods:

**A. Individual Payment:**

- Endpoint: `POST /commissions/:id/mark-paid`
- Marks single commission as paid
- Sets `paid = true` and `paidAt = current timestamp`

**B. Batch Payment:**

- Endpoint: `POST /commissions/mark-paid-batch`
- Accepts array of commission IDs
- Marks multiple commissions as paid at once

#### Access Control:

- Only `SUPER_ADMIN`, `ASSOCIATION_ADMIN`, and `SALON_OWNER` can mark commissions as paid
- Employees can view their own commissions but cannot mark them as paid

#### Commission Summary:

- Endpoint: `GET /commissions/employee/:employeeId/summary`
- Returns:
  - `totalCommissions` - Sum of all commissions
  - `paidCommissions` - Sum of paid commissions
  - `unpaidCommissions` - Sum of unpaid commissions
  - `totalSales` - Total sales amount
  - `count` - Number of commission records

---

### 3. **Employee Configuration**

#### SalonEmployee Entity:

```typescript
{
  id: UUID
  userId: UUID (nullable - links to user account)
  salonId: UUID (required)
  roleTitle: string (e.g., "Senior Stylist")
  skills: string[] (array of skills)
  hireDate: DATE
  isActive: BOOLEAN (default: true)
  commissionRate: DECIMAL(5,2) (default: 0) - Percentage 0-100
}
```

**Key Points:**

- Each employee has a `commissionRate` (0-100%)
- Rate is applied to ALL sale items assigned to that employee
- No base salary field exists
- No hourly rate field exists
- No salary type field (commission-only vs salary+commission)

---

## ❌ What's Missing

### 1. **Payroll System (Database Tables Exist, But No Implementation)**

#### Database Tables Present:

```sql
-- payroll_runs table exists
CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY,
  salon_id UUID,
  period_start DATE,
  period_end DATE,
  total_amount NUMERIC(14,2),
  processed_at TIMESTAMPTZ,
  metadata JSONB
);

-- payroll_items table exists
CREATE TABLE payroll_items (
  id UUID PRIMARY KEY,
  payroll_run_id UUID,
  salon_employee_id UUID,
  gross_pay NUMERIC(14,2),
  deductions NUMERIC(14,2) DEFAULT 0,
  net_pay NUMERIC(14,2),
  paid BOOLEAN DEFAULT false
);
```

#### Missing Implementation:

- ❌ No `payroll` module in `backend/src/`
- ❌ No payroll service, controller, or entities
- ❌ No API endpoints for payroll processing
- ❌ No automatic payroll calculation
- ❌ No integration between commissions and payroll

---

### 2. **Base Salary Support**

#### Missing Fields in `salon_employees`:

- ❌ `base_salary` - Fixed monthly/weekly salary amount
- ❌ `salary_type` - Enum: `COMMISSION_ONLY`, `SALARY_ONLY`, `SALARY_PLUS_COMMISSION`
- ❌ `pay_frequency` - Enum: `WEEKLY`, `BIWEEKLY`, `MONTHLY`
- ❌ `hourly_rate` - For hourly employees
- ❌ `overtime_rate` - Overtime multiplier

#### Current Limitation:

- Employees can ONLY earn commissions
- No way to pay fixed salaries
- No way to combine salary + commission

---

### 3. **Payroll Calculation Logic**

#### Missing Features:

- ❌ **Automatic Payroll Runs**: No scheduled/automatic payroll processing
- ❌ **Period-based Aggregation**: No way to calculate total pay for a period
- ❌ **Salary + Commission Combination**: Cannot combine base salary with unpaid commissions
- ❌ **Deductions**: Table has `deductions` field but no logic to calculate them
- ❌ **Tax Calculations**: No tax withholding logic
- ❌ **Payment History**: No tracking of when payroll was actually paid

#### What Should Exist:

```typescript
// Example of what payroll calculation should do:
async calculatePayroll(
  salonId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<PayrollRun> {
  // 1. Get all active employees for salon
  // 2. For each employee:
  //    - Calculate base salary (if applicable)
  //    - Sum unpaid commissions in period
  //    - Calculate deductions (taxes, loans, etc.)
  //    - Calculate net pay = (base salary + commissions) - deductions
  // 3. Create payroll_run and payroll_items
  // 4. Mark commissions as paid (or link them to payroll)
}
```

---

### 4. **Task-Based vs Sale-Based Commissions**

#### Current System:

- ✅ Commissions are created per **sale item** (which can be a service or product)
- ✅ Each sale item can have one employee assigned
- ✅ Commission is calculated immediately when sale is completed

#### Missing:

- ❌ **Appointment-based Commissions**: Appointments have staff assigned (`appointment_staff` table), but no commissions are created from appointments
- ❌ **Task Completion Tracking**: No way to track if a task/appointment was completed successfully before paying commission
- ❌ **Service-Specific Commission Rates**: All employees use same rate for all services (no per-service rates)

---

### 5. **Commission Payment Workflow**

#### Current Issues:

- ❌ **Manual Process**: Must manually mark each commission as paid
- ❌ **No Payment Method Tracking**: No record of HOW commission was paid (cash, bank transfer, etc.)
- ❌ **No Payment Reference**: No transaction ID or reference number
- ❌ **No Bulk Payroll Integration**: Cannot pay all commissions at once via payroll

#### What's Needed:

```typescript
// Enhanced commission payment
{
  paid: boolean
  paidAt: timestamp
  paymentMethod: 'cash' | 'bank_transfer' | 'mobile_money' | 'payroll'
  paymentReference: string (transaction ID)
  paidBy: UUID (user who processed payment)
  payrollItemId: UUID (if paid via payroll)
}
```

---

### 6. **Reporting & Analytics**

#### Missing Reports:

- ❌ **Employee Earnings Report**: Total earnings (salary + commissions) by period
- ❌ **Unpaid Commissions Report**: List of all unpaid commissions by employee
- ❌ **Payroll Summary**: Total payroll costs by salon/period
- ❌ **Commission Trends**: Commission earnings over time
- ❌ **Top Performers**: Employees with highest commissions

---

## 🔧 Recommended Implementation Plan

### Phase 1: Add Base Salary Support

1. Add fields to `salon_employees` table:
   - `base_salary` (DECIMAL)
   - `salary_type` (ENUM)
   - `pay_frequency` (ENUM)
2. Update employee creation/editing forms
3. Add validation for salary configuration

### Phase 2: Implement Payroll Module

1. Create `backend/src/payroll/` module
2. Implement entities for `PayrollRun` and `PayrollItem`
3. Create payroll calculation service:
   - Calculate base salary for period
   - Aggregate unpaid commissions
   - Calculate deductions
   - Calculate net pay
4. Create API endpoints for:
   - Creating payroll runs
   - Viewing payroll history
   - Marking payroll as paid

### Phase 3: Integrate Commissions with Payroll

1. Link commissions to payroll items
2. Auto-mark commissions as paid when payroll is processed
3. Add option to pay commissions individually OR via payroll

### Phase 4: Enhanced Payment Tracking

1. Add payment method to commission payments
2. Add payment reference/transaction ID
3. Add audit trail (who paid, when, how)

### Phase 5: Reporting

1. Employee earnings reports
2. Payroll summaries
3. Commission analytics

---

## 📊 Current System Flow Diagram

```
┌─────────────────┐
│  Sale Created   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sale Items      │
│ (with employee) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sale Completed  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ processCommissions()    │
│ For each item:          │
│ - Get employee rate     │
│ - Calculate commission  │
│ - Create Commission     │
│   (paid = false)        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│ Commission      │
│ Record Created  │
│ (Unpaid)        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Manual Payment Process  │
│ (Owner marks as paid)   │
└─────────────────────────┘
```

---

## 🎯 Summary

### ✅ What Works:

1. **Per-Task Commissions**: Automatically created for each sale item with employee
2. **Commission Calculation**: Based on employee's commission rate
3. **Commission Tracking**: All commissions stored with payment status
4. **Individual Payment**: Can mark commissions as paid one by one
5. **Batch Payment**: Can mark multiple commissions as paid
6. **Employee Summary**: Can view commission totals per employee

### ❌ What's Missing:

1. **Base Salary**: No fixed salary support
2. **Payroll System**: Tables exist but no implementation
3. **Automatic Payroll**: No scheduled payroll processing
4. **Salary + Commission**: Cannot combine both payment types
5. **Payment Details**: No payment method/reference tracking
6. **Appointment Commissions**: Appointments don't generate commissions
7. **Deductions**: No tax or deduction calculations
8. **Reporting**: Limited reporting capabilities

### 🔑 Key Gaps:

- **No way to pay employees a fixed salary**
- **No way to combine salary + commissions in one payment**
- **No automated payroll processing**
- **Commissions are only from sales, not appointments**
- **Manual payment process with no payment method tracking**
