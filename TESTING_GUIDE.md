# Testing Guide - Salon Employment & Payment System

## Overview
This guide provides step-by-step instructions for testing the complete flow of the salon employment and payment system, from employee creation to payroll calculation and payment tracking.

## Prerequisites

1. **Database Setup**
   ```bash
   cd backend
   npm run migration:run
   ```
   This will run the migration `1732400000000-AddPayrollSystem.ts` which:
   - Adds salary fields to `salon_employees` table
   - Adds payment tracking fields to `commissions` table
   - Creates `payroll_runs` table
   - Creates `payroll_items` table

2. **Backend Running**
   ```bash
   cd backend
   npm run start:dev
   ```

3. **Frontend Running**
   ```bash
   cd web
   npm run dev
   ```

4. **Authentication**
   - Log in as a user with `SALON_OWNER`, `SUPER_ADMIN`, or `ASSOCIATION_ADMIN` role

## Test Flow

### Step 1: Create/Update Employee with Salary Configuration

**Endpoint:** `POST /api/salons/:salonId/employees` or `PATCH /api/salons/:salonId/employees/:employeeId`

**Frontend Path:** `/salons/[id]/employees`

**Test Steps:**
1. Navigate to a salon's employees page
2. Click "Add New Employee" or edit an existing employee
3. Fill in the employee details:
   - Select a user
   - Set role title (e.g., "Hair Stylist")
   - Add skills
   - Set hire date
   - **Configure salary settings:**
     - Payment Type: Select from:
       - `COMMISSION_ONLY` - Employee earns only commissions
       - `SALARY_ONLY` - Employee earns only base salary
       - `SALARY_PLUS_COMMISSION` - Employee earns both
     - Base Salary (Annual): Enter annual salary amount (e.g., 1200000 for RWF 1,200,000/year)
     - Pay Frequency: Select `WEEKLY`, `BIWEEKLY`, or `MONTHLY`
     - Employment Type: Select `FULL_TIME`, `PART_TIME`, or `CONTRACT`
     - Hourly Rate (Optional): For hourly employees
     - Overtime Rate Multiplier: Default 1.5 (time and a half)
   - Set Commission Rate (%): e.g., 10 for 10%
   - Set Active status
4. Click "Save" or "Update Employee"

**Expected Result:**
- Employee is created/updated successfully
- Salary configuration is saved to database
- Employee appears in the employees list

**Verify in Database:**
```sql
SELECT id, base_salary, salary_type, pay_frequency, employment_type, commission_rate 
FROM salon_employees 
WHERE salon_id = '<your-salon-id>';
```

---

### Step 2: Generate Commissions (Automatic)

**How it works:**
- Commissions are automatically created when a sale is made with an employee assigned
- The commission amount = `sale_item.lineTotal * (employee.commissionRate / 100)`

**Test Steps:**
1. Create a sale with an employee assigned to a sale item
2. The system automatically creates a commission record

**Verify:**
- Navigate to `/commissions` page
- You should see the commission record with:
  - Employee name
  - Sale item details
  - Commission amount
  - Status: "Unpaid"

**Expected Commission Record:**
- `paid: false`
- `paymentMethod: null`
- `paymentReference: null`
- `payrollItemId: null`

---

### Step 3: Calculate Payroll

**Endpoint:** `POST /api/payroll/calculate`

**Frontend Path:** `/payroll`

**Test Steps:**
1. Navigate to `/payroll` page
2. Click "Calculate Payroll" button
3. In the modal:
   - Select a salon (if multiple salons)
   - Set Period Start date (e.g., first day of the month)
   - Set Period End date (e.g., last day of the month)
4. Click "Calculate Payroll"

**What Happens:**
- System fetches all active employees for the salon
- For each employee:
  - Calculates base salary for the period (based on pay frequency)
  - Aggregates all unpaid commissions within the period
  - Calculates overtime (if applicable)
  - Calculates gross pay = base salary + commissions + overtime
  - Applies deductions (currently 0, can be extended)
  - Calculates net pay = gross pay - deductions
- Creates a `PayrollRun` record with status `PROCESSED`
- Creates `PayrollItem` records for each employee
- Automatically marks commissions as paid and links them to payroll items

**Expected Result:**
- Payroll run appears in the payroll history
- Status shows as "Pending Payment"
- Total amount is displayed
- Employee count is shown

**Verify in Database:**
```sql
-- Check payroll run
SELECT id, salon_id, period_start, period_end, total_amount, status 
FROM payroll_runs 
ORDER BY created_at DESC 
LIMIT 1;

-- Check payroll items
SELECT id, salon_employee_id, base_salary, commission_amount, gross_pay, net_pay 
FROM payroll_items 
WHERE payroll_run_id = '<payroll-run-id>';

-- Check commissions are marked as paid
SELECT id, paid, payment_method, payroll_item_id 
FROM commissions 
WHERE paid = true AND payroll_item_id IS NOT NULL;
```

---

### Step 4: View Payroll Details

**Endpoint:** `GET /api/payroll/:id`

**Frontend Path:** `/payroll` (click "View Details" on a payroll run)

**Test Steps:**
1. On the payroll page, click "View Details" on any payroll run
2. Review the breakdown:
   - Total amount
   - Number of employees
   - Status
   - Individual employee breakdown showing:
     - Base salary
     - Commission amount
     - Overtime
     - Deductions
     - Net pay

**Expected Result:**
- Modal opens showing detailed breakdown
- All employee payroll items are listed
- Amounts are correctly calculated

---

### Step 5: Mark Payroll as Paid

**Endpoint:** `POST /api/payroll/:id/mark-paid`

**Frontend Path:** `/payroll` (click "Mark as Paid" button)

**Test Steps:**
1. On a payroll run with status "Pending Payment", click "Mark as Paid"
2. In the payment modal:
   - Select Payment Method: `cash`, `bank_transfer`, or `mobile_money`
   - Enter Payment Reference (optional): Transaction ID or reference number
3. Click "Mark as Paid"

**What Happens:**
- Payroll run status changes to `PAID`
- All payroll items are marked as paid
- Payment method and reference are recorded
- `paidAt` timestamp is set

**Expected Result:**
- Payroll run status updates to "Paid"
- Payment details are displayed
- Payroll items show as paid

**Verify in Database:**
```sql
-- Check payroll run is marked as paid
SELECT id, status, processed_at 
FROM payroll_runs 
WHERE id = '<payroll-run-id>';

-- Check payroll items are marked as paid
SELECT id, paid, paid_at, payment_method, payment_reference 
FROM payroll_items 
WHERE payroll_run_id = '<payroll-run-id>';
```

---

### Step 6: View Commission Payment Details

**Frontend Path:** `/commissions`

**Test Steps:**
1. Navigate to `/commissions` page
2. Review commission records:
   - Paid commissions show:
     - Payment method
     - Payment reference (if provided)
     - "Via Payroll" indicator (if paid through payroll)
   - Unpaid commissions can be marked as paid individually

**Expected Result:**
- Commissions paid through payroll show "Via Payroll"
- Payment method and reference are displayed
- Individual commission payments can be recorded

---

## API Endpoint Verification

### Payroll Endpoints

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| POST | `/api/payroll/calculate` | Calculate payroll for a period | SALON_OWNER, SUPER_ADMIN, ASSOCIATION_ADMIN |
| GET | `/api/payroll/salon/:salonId` | Get payroll history for a salon | SALON_OWNER, SUPER_ADMIN, ASSOCIATION_ADMIN |
| GET | `/api/payroll/:id` | Get single payroll run details | SALON_OWNER, SUPER_ADMIN, ASSOCIATION_ADMIN |
| POST | `/api/payroll/:id/mark-paid` | Mark payroll as paid | SALON_OWNER, SUPER_ADMIN, ASSOCIATION_ADMIN |
| GET | `/api/payroll/summary` | Get payroll summary for period | SALON_OWNER, SUPER_ADMIN, ASSOCIATION_ADMIN |

### Commission Endpoints

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| POST | `/api/commissions/:id/mark-paid` | Mark single commission as paid | SALON_OWNER, SUPER_ADMIN, ASSOCIATION_ADMIN |
| POST | `/api/commissions/mark-paid-batch` | Mark multiple commissions as paid | SALON_OWNER, SUPER_ADMIN, ASSOCIATION_ADMIN |

### Employee Endpoints

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| POST | `/api/salons/:salonId/employees` | Create employee | SALON_OWNER, SUPER_ADMIN, ASSOCIATION_ADMIN |
| PATCH | `/api/salons/:salonId/employees/:employeeId` | Update employee | SALON_OWNER, SUPER_ADMIN, ASSOCIATION_ADMIN |

---

## Test Scenarios

### Scenario 1: Commission-Only Employee
1. Create employee with `salaryType: COMMISSION_ONLY`
2. Make sales with employee assigned
3. Calculate payroll - should only include commissions
4. Verify no base salary in payroll item

### Scenario 2: Salary-Only Employee
1. Create employee with `salaryType: SALARY_ONLY`, `baseSalary: 1200000`, `payFrequency: MONTHLY`
2. Calculate payroll for one month
3. Verify payroll item shows base salary only (no commissions)
4. Net pay should equal base salary (assuming no deductions)

### Scenario 3: Salary + Commission Employee
1. Create employee with `salaryType: SALARY_PLUS_COMMISSION`, `baseSalary: 1200000`, `payFrequency: MONTHLY`, `commissionRate: 10`
2. Make sales with employee assigned
3. Calculate payroll
4. Verify payroll item shows both base salary and commission amounts
5. Gross pay = base salary + commissions

### Scenario 4: Multiple Payroll Runs
1. Create payroll for January
2. Create payroll for February
3. Verify each payroll run is independent
4. Verify commissions are not double-counted

### Scenario 5: Partial Period Payroll
1. Create employee mid-month
2. Calculate payroll for the full month
3. Verify salary is prorated correctly

---

## Common Issues & Solutions

### Issue: Migration fails
**Solution:** 
- Check database connection
- Ensure all previous migrations have run
- Check for existing columns/tables that might conflict

### Issue: Payroll calculation returns 0
**Solution:**
- Verify employees are marked as `isActive: true`
- Check that employees have salary configuration or commission rate
- Verify there are unpaid commissions in the period

### Issue: Commissions not showing in payroll
**Solution:**
- Check commission `createdAt` is within the payroll period
- Verify commissions are not already marked as paid
- Check `salonEmployeeId` matches

### Issue: Frontend not displaying data
**Solution:**
- Check browser console for API errors
- Verify API endpoints match backend routes
- Check authentication token is valid
- Verify user has required role

---

## Database Verification Queries

```sql
-- Check employee salary configuration
SELECT 
  se.id,
  u.full_name,
  se.base_salary,
  se.salary_type,
  se.pay_frequency,
  se.commission_rate
FROM salon_employees se
LEFT JOIN users u ON se.user_id = u.id
WHERE se.salon_id = '<salon-id>';

-- Check unpaid commissions
SELECT 
  c.id,
  c.amount,
  c.paid,
  se.role_title,
  u.full_name
FROM commissions c
JOIN salon_employees se ON c.salon_employee_id = se.id
LEFT JOIN users u ON se.user_id = u.id
WHERE c.paid = false
ORDER BY c.created_at DESC;

-- Check payroll runs
SELECT 
  pr.id,
  pr.period_start,
  pr.period_end,
  pr.total_amount,
  pr.status,
  COUNT(pi.id) as employee_count
FROM payroll_runs pr
LEFT JOIN payroll_items pi ON pr.id = pi.payroll_run_id
WHERE pr.salon_id = '<salon-id>'
GROUP BY pr.id
ORDER BY pr.created_at DESC;

-- Check payroll items with employee details
SELECT 
  pi.id,
  u.full_name,
  pi.base_salary,
  pi.commission_amount,
  pi.gross_pay,
  pi.net_pay,
  pi.paid
FROM payroll_items pi
JOIN salon_employees se ON pi.salon_employee_id = se.id
LEFT JOIN users u ON se.user_id = u.id
WHERE pi.payroll_run_id = '<payroll-run-id>';
```

---

## Next Steps After Testing

1. **Extend Deductions Logic**
   - Add tax calculations
   - Add benefit deductions
   - Add loan deductions

2. **Add Overtime Tracking**
   - Integrate with attendance system
   - Calculate overtime hours
   - Apply overtime rates

3. **Add Payroll Reports**
   - Generate PDF payslips
   - Export payroll data
   - Generate tax reports

4. **Add Notifications**
   - Notify employees when payroll is processed
   - Send payment confirmations
   - Alert on payroll due dates

