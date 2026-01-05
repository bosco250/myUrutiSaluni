# Commissions Feature Investigation Report

## Executive Summary

**Issue**: Salon employees cannot see their commissions in the employee dashboard.

**Root Cause**: The commission query logic only retrieves commissions for a single employee record, even when an employee works at multiple salons. Additionally, if no employee record is found, the system returns an empty array without proper error handling.

**Status**: Critical - Affects core functionality for salon employees.

---

## 1. Access and Visibility

### 1.1 User Roles Allowed to View Commissions

**Authorized Roles** (from `commissions.controller.ts`):

- `SUPER_ADMIN`
- `ASSOCIATION_ADMIN`
- `DISTRICT_LEADER`
- `SALON_OWNER`
- `SALON_EMPLOYEE` ✅ (Intended to see their own commissions)

### 1.2 Access Control Implementation

**Location**: `backend/src/commissions/commissions.controller.ts` (lines 47-66)

**Current Logic for SALON_EMPLOYEE**:

```typescript
if (user.role === UserRole.SALON_EMPLOYEE) {
  const employee = await this.salonsService.findEmployeeByUserId(user.id);
  if (!employee) {
    return []; // ⚠️ ISSUE: Returns empty array if no employee record found
  }
  salonEmployeeId = employee.id; // ⚠️ ISSUE: Only uses ONE employee record
  salonId = employee.salonId; // ⚠️ ISSUE: Only filters by ONE salon
}
```

**Problems Identified**:

1. **Single Employee Record Limitation**: `findEmployeeByUserId()` uses `findOne()`, which only returns the first employee record found. If a user works at multiple salons, they have multiple `salon_employees` records, but only one is retrieved.
2. **Missing Employee Record**: If no employee record exists, the system silently returns an empty array instead of providing helpful feedback.
3. **Salon Filtering**: The `salonId` filter is applied in addition to `salonEmployeeId`, which further restricts results to a single salon.

### 1.3 Frontend Access Control

**Location**: `web/app/(dashboard)/commissions/page.tsx`

- Protected route allows `SALON_EMPLOYEE` role (line 92)
- Frontend correctly relies on backend filtering (line 115 comment)
- No additional filtering that would hide commissions

---

## 2. Commission Calculation and Storage

### 2.1 Data Sources

Commissions are generated from **two sources**:

#### A. Sales-Based Commissions

- **Trigger**: When a sale is created with sale items assigned to an employee
- **Location**: `backend/src/sales/sales.service.ts` (lines 180-266)
- **Method**: `processCommissions(saleId: string)`
- **When**: Automatically called after sale creation
- **Requirements**:
  - Sale item has `salonEmployeeId` assigned
  - Sale item has `lineTotal > 0`
  - Employee has `commissionRate > 0`

#### B. Appointment-Based Commissions

- **Trigger**: When an appointment status changes to `completed`
- **Location**: `backend/src/appointments/appointments.service.ts` (lines 273-306)
- **When**: During appointment update when status becomes `completed`
- **Requirements**:
  - Appointment has `salonEmployeeId` OR `metadata.preferredEmployeeId`
  - Appointment has associated service with `basePrice > 0`
  - Employee has `commissionRate > 0`

### 2.2 Business Rules

**Calculation Formula**:

```
commissionAmount = (saleAmount × commissionRate) / 100
```

**Commission Rate Source**:

- Stored in `salon_employees.commission_rate` (DECIMAL(5,2))
- Default: 0 (no commission if not set)

**Commission Record Structure**:

```typescript
{
  salonEmployeeId: string;  // Links to salon_employees.id
  saleItemId: string | null; // null for appointment-based commissions
  amount: number;            // Calculated commission
  commissionRate: number;    // Employee's rate at time of creation
  saleAmount: number;        // Original sale/appointment amount
  paid: boolean;             // Payment status
  metadata: {
    source: 'sale' | 'appointment',
    saleId?: string,
    appointmentId?: string,
    serviceId?: string,
    productId?: string
  }
}
```

### 2.3 Storage

**Entity**: `backend/src/commissions/entities/commission.entity.ts`

- **Table**: `commissions`
- **Key Relationships**:
  - `salon_employee_id` → `salon_employees.id` (required, indexed)
  - `sale_item_id` → `sale_items.id` (nullable, for sale-based commissions)

**When Created**:

- **Sales**: Immediately after sale creation (synchronous)
- **Appointments**: Immediately when appointment status changes to `completed` (synchronous)
- **No Background Jobs**: All commission creation is synchronous

---

## 3. Assignment of Commissions to Employees

### 3.1 Employee Linking

**Primary Link**: `commission.salonEmployeeId` → `salon_employees.id`

**How It Works**:

1. **Sales**: When a sale item is created with `salonEmployeeId`, the commission is linked to that employee record.
2. **Appointments**: When an appointment is completed with `salonEmployeeId` or `metadata.preferredEmployeeId`, the commission is linked to that employee record.

**Important**: Each commission is linked to a **specific `salon_employees` record**, not directly to a user. This means:

- If a user works at multiple salons, they have multiple `salon_employees` records
- Each commission is linked to ONE specific employee record
- Commissions from different salons are stored separately

### 3.2 Data Model

**Commission Entity**:

```typescript
@ManyToOne(() => SalonEmployee, { nullable: false })
salonEmployee: SalonEmployee;

@Column({ name: 'salon_employee_id' })
salonEmployeeId: string; // Foreign key to salon_employees.id
```

**No Direct User Link**: Commissions are not directly linked to users. The relationship is:

```
User → SalonEmployee (via user_id) → Commission (via salon_employee_id)
```

### 3.3 Multiple Salons Support

**Current Limitation**: The system supports employees working at multiple salons (multiple `salon_employees` records per user), but the commission query only retrieves commissions for ONE employee record.

**Expected Behavior**: An employee should see ALL commissions from ALL salons they work at.

**Current Behavior**: An employee only sees commissions from the first employee record found.

---

## 4. Dashboard Implementation

### 4.1 Commission Retrieval

**Frontend**: `web/app/(dashboard)/commissions/page.tsx` (lines 116-138)

**Query**:

```typescript
useQuery<Commission[]>({
  queryKey: [
    "commissions",
    statusFilter,
    employeeFilter,
    dateRange,
    user?.role,
    user?.id,
  ],
  queryFn: async () => {
    const params = new URLSearchParams();
    // ... filter params ...
    const response = await api.get(`/commissions?${params.toString()}`);
    return response.data || [];
  },
  enabled: !!user,
});
```

**Backend Endpoint**: `GET /commissions`

- **Controller**: `commissions.controller.ts` (lines 39-97)
- **Service**: `commissions.service.ts` (lines 66-108)

### 4.2 Query Parameters

**For SALON_EMPLOYEE**:

- Backend automatically sets `salonEmployeeId` (from first employee record)
- Backend automatically sets `salonId` (from first employee record)
- Frontend does NOT send `salonEmployeeId` parameter (correctly relies on backend)

**Query Filters Applied**:

1. `salonEmployeeId` filter (single employee ID) ⚠️
2. `salonId` filter (single salon ID) ⚠️
3. `paid` filter (if provided)
4. `startDate` / `endDate` filters (if provided)

### 4.3 UI Rendering

**Location**: `web/app/(dashboard)/commissions/page.tsx` (lines 487-710)

**Status**: UI correctly handles and renders commission data when returned. The issue is that the data is not being returned due to backend filtering limitations.

---

## 5. End-to-End Trace

### 5.1 Example Flow: Appointment Completion

**Scenario**: Employee completes an appointment that should generate a commission.

#### Step 1: Appointment Created

- Appointment created with `salonEmployeeId = "emp-123"` or `metadata.preferredEmployeeId = "emp-123"`
- Service has `basePrice = 10000`

#### Step 2: Appointment Completed

- **Location**: `appointments.service.ts` (line 140: `update()` method)
- Status changed to `completed`
- System extracts `salonEmployeeId` from appointment
- System gets service amount from `service.basePrice`

#### Step 3: Commission Created

- **Location**: `appointments.service.ts` (lines 280-289)
- **Method**: `commissionsService.createCommission(employeeId, null, serviceAmount, metadata)`
- **Result**: Commission record created with:
  - `salonEmployeeId = "emp-123"`
  - `amount = (10000 × commissionRate) / 100`
  - `metadata.source = "appointment"`
  - ✅ **Commission stored in database**

#### Step 4: Commission Retrieved for Dashboard

- **Location**: `commissions.controller.ts` (line 50)
- **Method**: `findEmployeeByUserId(user.id)`
- **Problem**: If user works at multiple salons:
  - Only ONE employee record returned (e.g., `emp-456` from Salon B)
  - Commission was created for `emp-123` from Salon A
  - Query filters by `salonEmployeeId = "emp-456"` ❌
  - Commission for `emp-123` is NOT returned ❌

#### Step 5: Commission Displayed

- **Result**: Empty array returned to frontend
- **UI**: Shows "You have no commissions yet" message

### 5.2 Example Flow: Sale Creation

**Scenario**: Sale created with employee assigned to sale item.

#### Step 1: Sale Created

- Sale created with items
- Sale item has `salonEmployeeId = "emp-789"` and `lineTotal = 5000`

#### Step 2: Commission Created

- **Location**: `sales.service.ts` (lines 225-235)
- **Method**: `commissionsService.createCommission(emp-789, saleItemId, 5000, metadata)`
- ✅ **Commission stored in database**

#### Step 3: Commission Retrieved

- **Same issue as appointment flow**: If user has multiple employee records, only commissions for the first record are returned.

---

## 6. Root Cause Analysis

### 6.1 Primary Issue

**Problem**: `findEmployeeByUserId()` only returns ONE employee record, but users can have multiple employee records (one per salon).

**Location**: `backend/src/commissions/commissions.controller.ts` (line 50)

**Code**:

```typescript
const employee = await this.salonsService.findEmployeeByUserId(user.id);
// This uses findOne() internally, so only returns first match
```

**Impact**:

- Employees working at multiple salons only see commissions from ONE salon
- If the wrong employee record is returned first, they see NO commissions

### 6.2 Secondary Issues

1. **No Method to Find All Employee Records**: `SalonsService` doesn't have a method to find ALL employee records for a user.
2. **Query Doesn't Support Multiple Employee IDs**: `CommissionsService.findAll()` only accepts a single `salonEmployeeId`.
3. **Silent Failure**: If no employee record is found, returns empty array without logging or user feedback.

### 6.3 Data Flow Issue

**Current Flow**:

```
User (user.id)
  → findEmployeeByUserId() → SalonEmployee (ONE record)
    → Query commissions WHERE salonEmployeeId = employee.id
      → Returns commissions for ONE salon only ❌
```

**Expected Flow**:

```
User (user.id)
  → findAllEmployeesByUserId() → SalonEmployee[] (ALL records)
    → Extract all employee IDs
      → Query commissions WHERE salonEmployeeId IN (employeeIds)
        → Returns commissions for ALL salons ✅
```

---

## 7. Recommended Changes

### 7.1 Backend Changes

#### A. Add Method to Find All Employee Records

**File**: `backend/src/salons/salons.service.ts`

**Add**:

```typescript
async findAllEmployeesByUserId(userId: string): Promise<SalonEmployee[]> {
  return this.salonEmployeesRepository.find({
    where: { userId },
    relations: ['user', 'salon'],
  });
}
```

#### B. Update Commissions Service to Support Multiple Employee IDs

**File**: `backend/src/commissions/commissions.service.ts`

**Modify `findAll()` method**:

```typescript
async findAll(filters?: {
  salonEmployeeId?: string;
  salonEmployeeIds?: string[]; // NEW: Support multiple IDs
  salonId?: string;
  paid?: boolean;
  startDate?: Date;
  endDate?: Date;
}): Promise<Commission[]> {
  // ... existing code ...

  if (filters?.salonEmployeeIds && filters.salonEmployeeIds.length > 0) {
    query.andWhere('commission.salonEmployeeId IN (:...salonEmployeeIds)', {
      salonEmployeeIds: filters.salonEmployeeIds,
    });
  } else if (filters?.salonEmployeeId) {
    query.andWhere('commission.salonEmployeeId = :salonEmployeeId', {
      salonEmployeeId: filters.salonEmployeeId,
    });
  }

  // Remove or make salonId filter optional when using multiple employee IDs
  // ... rest of code ...
}
```

#### C. Update Commissions Controller

**File**: `backend/src/commissions/commissions.controller.ts`

**Modify `findAll()` method**:

```typescript
if (user.role === UserRole.SALON_EMPLOYEE) {
  // Find ALL employee records for this user
  const employees = await this.salonsService.findAllEmployeesByUserId(user.id);

  if (!employees || employees.length === 0) {
    // Log warning and return empty array with helpful message
    this.logger.warn(
      `No employee records found for user ${user.id}. User may need to be added as an employee to a salon.`
    );
    return [];
  }

  // Extract all employee IDs
  const employeeIds = employees.map((emp) => emp.id);

  // Query commissions for ALL employee records
  return this.commissionsService.findAll({
    salonEmployeeIds: employeeIds, // Use new multi-ID filter
    paid: paid === "true" ? true : paid === "false" ? false : undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });
}
```

### 7.2 Frontend Changes

**No changes required** - Frontend correctly relies on backend filtering.

**Optional Enhancement**: Add better error messaging if no employee record exists:

- Show message: "No employee profile found. Please contact your salon owner to set up your employee profile."

### 7.3 Testing Recommendations

1. **Test Case 1**: Employee with single salon
   - Verify commissions are returned correctly

2. **Test Case 2**: Employee with multiple salons
   - Verify commissions from ALL salons are returned

3. **Test Case 3**: Employee with no employee record
   - Verify empty array is returned with appropriate logging

4. **Test Case 4**: Employee with commissions from sales and appointments
   - Verify both types are returned

5. **Test Case 5**: Employee with 0% commission rate
   - Verify commissions are still created (with 0 amount) and returned

---

## 8. Summary

### Current State

- ✅ Commission calculation and storage works correctly
- ✅ Commissions are properly linked to employee records
- ✅ Access control allows SALON_EMPLOYEE role
- ❌ Query only returns commissions for ONE employee record
- ❌ Employees working at multiple salons see incomplete data

### Root Cause

The `findEmployeeByUserId()` method only returns one employee record, but the commission query needs to retrieve commissions for ALL employee records associated with a user.

### Solution

1. Add `findAllEmployeesByUserId()` method to retrieve all employee records
2. Update `CommissionsService.findAll()` to support multiple employee IDs
3. Update `CommissionsController.findAll()` to query all employee records
4. Add proper logging for debugging

### Impact

- **High**: Fixes critical functionality for salon employees
- **Low Risk**: Changes are backward compatible
- **No Breaking Changes**: Existing functionality for owners/admins unchanged
