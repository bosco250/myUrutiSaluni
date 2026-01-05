# Salon Owner & Employee Relationship Guide

This document explains how salon owners and employees work in the Salon Association Platform, from database structure to frontend implementation.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Database Structure](#database-structure)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Employee Management Flow](#employee-management-flow)
5. [API Endpoints](#api-endpoints)
6. [Frontend Implementation](#frontend-implementation)
7. [Integration with Other Modules](#integration-with-other-modules)
8. [Step-by-Step Implementation Guide](#step-by-step-implementation-guide)
9. [Common Use Cases](#common-use-cases)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

### What is a Salon Owner?

- A **Salon Owner** is a user with the role `SALON_OWNER`
- They must be an **approved member** of the association (membership application approved)
- They can create and manage one or more salons
- They can add employees to their salons
- They have full control over their salon operations

### What is a Salon Employee?

- A **Salon Employee** is a user linked to a salon through the `salon_employees` table
- They can have the role `SALON_EMPLOYEE` (or other roles)
- They are associated with a specific salon
- They can be assigned to sales, appointments, and services
- They earn commissions based on their work

### Key Relationship:

```
User (SALON_OWNER)
    ↓ owns
Salon
    ↓ has many
SalonEmployee
    ↓ links to
User (can be any role, typically SALON_EMPLOYEE)
```

---

## 🗄️ Database Structure

### 1. Users Table (`users`)

**Key Fields:**

- `id` (UUID) - Primary key
- `email` - User email
- `phone` - User phone
- `full_name` - User's full name
- `role` - User role enum (SALON_OWNER, SALON_EMPLOYEE, CUSTOMER, etc.)
- `is_active` - Whether user account is active

**Example:**

```sql
id: "123e4567-e89b-12d3-a456-426614174000"
email: "owner@salon.com"
role: "salon_owner"
full_name: "John Doe"
```

### 2. Salons Table (`salons`)

**Key Fields:**

- `id` (UUID) - Primary key
- `owner_id` (UUID) - Foreign key to `users.id`
- `name` - Salon name
- `address`, `city`, `district` - Location info
- `status` - Salon status (active, inactive, etc.)

**Example:**

```sql
id: "salon-123"
owner_id: "123e4567-e89b-12d3-a456-426614174000"  -- Links to salon owner
name: "Beauty Salon Kigali"
status: "active"
```

### 3. Salon Employees Table (`salon_employees`)

**Key Fields:**

- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to `users.id` (the employee user)
- `salon_id` (UUID) - Foreign key to `salons.id`
- `role_title` - Job title (e.g., "Senior Stylist")
- `skills` - Array of skills (simple-array)
- `hire_date` - Date employee was hired
- `is_active` - Whether employee is currently active
- `commission_rate` - Commission percentage (0-100)

**Example:**

```sql
id: "emp-123"
user_id: "456e7890-e89b-12d3-a456-426614174001"  -- Employee user
salon_id: "salon-123"  -- The salon they work for
role_title: "Senior Stylist"
skills: ["haircutting", "coloring", "styling"]
commission_rate: 15.00
is_active: true
```

### Entity Relationships:

```
users (owner)
    ↓ (one-to-many)
salons
    ↓ (one-to-many)
salon_employees
    ↓ (many-to-one)
users (employee)
```

**Important Notes:**

- A user can be a salon owner AND an employee of another salon (different relationships)
- A salon employee can work for multiple salons (multiple `salon_employees` records)
- The `user_id` in `salon_employees` can be nullable (for employees not yet registered)

---

## 🔐 User Roles & Permissions

### Role Hierarchy:

```
SUPER_ADMIN
    ↓
ASSOCIATION_ADMIN
    ↓
DISTRICT_LEADER
    ↓
SALON_OWNER
    ↓
SALON_EMPLOYEE
    ↓
CUSTOMER
```

### Permissions by Role:

#### **SALON_OWNER:**

- ✅ Create salons (if membership approved)
- ✅ View their own salons
- ✅ Update their own salons
- ✅ Delete their own salons
- ✅ Add employees to their salons
- ✅ Update employees in their salons
- ✅ Remove employees from their salons
- ✅ View employees of their salons
- ✅ Create sales, appointments, services
- ✅ View reports for their salons

#### **SALON_EMPLOYEE:**

- ✅ View their assigned salon(s)
- ✅ View employees of their salon (if they work there)
- ✅ Create sales (for their salon)
- ✅ Create appointments (for their salon)
- ✅ Clock in/out (attendance)
- ✅ View their own commissions
- ❌ Cannot add/remove employees
- ❌ Cannot update salon settings
- ❌ Cannot view other salons' data

#### **SUPER_ADMIN / ASSOCIATION_ADMIN:**

- ✅ Full access to all salons
- ✅ Can manage any salon's employees
- ✅ Can view all data

---

## 🔄 Employee Management Flow

### Flow Diagram:

```
1. Salon Owner Creates Salon
   ↓
2. Salon Owner Adds Employee
   ├─ Option A: Employee User Already Exists
   │  └─→ Link existing user to salon
   └─ Option B: Employee User Doesn't Exist
      └─→ Create user first, then link
   ↓
3. Employee Record Created in salon_employees
   ↓
4. Employee Can Now:
   ├─→ Clock in/out (attendance)
   ├─→ Be assigned to sales
   ├─→ Be assigned to appointments
   └─→ Earn commissions
```

### Step-by-Step Process:

#### **Step 1: Salon Owner Creates Salon**

```typescript
// POST /api/salons
{
  "name": "Beauty Salon Kigali",
  "ownerId": "owner-user-id",  // Automatically set from JWT token
  "address": "KG 123 St",
  "city": "Kigali",
  "district": "Nyarugenge"
}
```

**Backend Check:**

- User must be `SALON_OWNER` role
- User must have approved membership
- Salon is created with `owner_id` = current user's ID

#### **Step 2: Salon Owner Adds Employee**

**Option A: Employee User Already Exists**

```typescript
// POST /api/salons/:salonId/employees
{
  "userId": "existing-employee-user-id",  // User already registered
  "roleTitle": "Senior Stylist",
  "skills": ["haircutting", "coloring"],
  "hireDate": "2024-01-15",
  "commissionRate": 15.0,
  "isActive": true
}
```

**Option B: Employee User Doesn't Exist**

1. First, create the user (or employee registers themselves):

```typescript
// POST /api/auth/register
{
  "email": "employee@salon.com",
  "phone": "+250788123456",
  "fullName": "Jane Employee",
  "password": "securepassword",
  "role": "salon_employee"  // Optional, defaults to CUSTOMER
}
```

2. Then, add them as an employee:

```typescript
// POST /api/salons/:salonId/employees
{
  "userId": "newly-created-user-id",
  "roleTitle": "Junior Stylist",
  "skills": ["haircutting"],
  "commissionRate": 10.0
}
```

#### **Step 3: Employee Record Created**

The system creates a record in `salon_employees`:

- Links `user_id` to the employee user
- Links `salon_id` to the salon
- Stores salon-specific info (role title, skills, commission rate)

#### **Step 4: Employee Can Now Work**

Once added, the employee can:

- Access the salon's data (if they have `SALON_EMPLOYEE` role)
- Be assigned to sales (via `salon_employee_id` in `sale_items`)
- Clock in/out for attendance
- Earn commissions automatically when sales are created

---

## 🔌 API Endpoints

### Salon Management

#### **Get All Salons**

```http
GET /api/salons
Authorization: Bearer <token>

Response:
[
  {
    "id": "salon-123",
    "name": "Beauty Salon Kigali",
    "ownerId": "owner-id",
    "owner": { "id": "...", "fullName": "John Doe" },
    "status": "active"
  }
]
```

**Access Control:**

- `SALON_OWNER`: Only sees their own salons
- `SALON_EMPLOYEE`: Only sees salons they work for
- `CUSTOMER`: Sees all active salons (public browsing)
- `ADMIN`: Sees all salons

#### **Get Single Salon**

```http
GET /api/salons/:id
Authorization: Bearer <token>
```

**Access Control:**

- `SALON_OWNER`: Can only access their own salon
- `SALON_EMPLOYEE`: Can only access salon they work for
- `CUSTOMER`: Can view any salon (public)
- `ADMIN`: Can view any salon

### Employee Management

#### **Get Salon Employees**

```http
GET /api/salons/:salonId/employees
Authorization: Bearer <token>

Response:
[
  {
    "id": "emp-123",
    "userId": "user-456",
    "salonId": "salon-123",
    "roleTitle": "Senior Stylist",
    "skills": ["haircutting", "coloring"],
    "hireDate": "2024-01-15",
    "isActive": true,
    "commissionRate": 15.0,
    "user": {
      "id": "user-456",
      "fullName": "Jane Employee",
      "email": "jane@salon.com",
      "phone": "+250788123456"
    }
  }
]
```

**Access Control:**

- `SALON_OWNER`: Can view employees of their own salons
- `SALON_EMPLOYEE`: Can view employees of salon they work for
- `ADMIN`: Can view all employees

#### **Add Employee to Salon**

```http
POST /api/salons/:salonId/employees
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "userId": "user-id-of-employee",
  "roleTitle": "Senior Stylist",
  "skills": ["haircutting", "coloring", "styling"],
  "hireDate": "2024-01-15",  // ISO date string
  "commissionRate": 15.0,     // 0-100
  "isActive": true
}

Response:
{
  "id": "emp-123",
  "userId": "user-id-of-employee",
  "salonId": "salon-123",
  "roleTitle": "Senior Stylist",
  "skills": ["haircutting", "coloring", "styling"],
  "hireDate": "2024-01-15",
  "isActive": true,
  "commissionRate": 15.0,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**Access Control:**

- `SALON_OWNER`: Can only add employees to their own salons
- `ADMIN`: Can add employees to any salon

**Validation:**

- User must exist (userId must be valid)
- User cannot already be an employee of this salon
- Salon must exist

#### **Update Employee**

```http
PATCH /api/salons/:salonId/employees/:employeeId
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "roleTitle": "Lead Stylist",  // Optional
  "skills": ["haircutting", "coloring", "styling", "extensions"],  // Optional
  "commissionRate": 20.0,  // Optional
  "isActive": false  // Optional (to deactivate)
}
```

**Access Control:**

- `SALON_OWNER`: Can only update employees of their own salons
- `ADMIN`: Can update any employee

#### **Remove Employee from Salon**

```http
DELETE /api/salons/:salonId/employees/:employeeId
Authorization: Bearer <token>
```

**Access Control:**

- `SALON_OWNER`: Can only remove employees from their own salons
- `ADMIN`: Can remove any employee

**Note:** This does NOT delete the user account, only removes the employee relationship.

---

## 💻 Frontend Implementation

### Employee Management Page

**Location:** `web/app/(dashboard)/salons/[id]/employees/page.tsx`

**Features:**

- List all employees of a salon
- Add new employee (modal form)
- Edit employee details
- Remove employee
- View employee details (name, role, skills, commission rate)

**Key Components:**

```typescript
// Employee Card Component
<EmployeeCard
  employee={employee}
  salonId={salonId}
  onEdit={() => setEditingEmployee(employee)}
  onDelete={() => deleteEmployee(employee.id)}
/>

// Add/Edit Employee Modal
<EmployeeFormModal
  salonId={salonId}
  employee={editingEmployee}  // null for new, employee object for edit
  onClose={() => setShowAddModal(false)}
  onSuccess={() => {
    queryClient.invalidateQueries(['salon-employees', salonId]);
    setShowAddModal(false);
  }}
/>
```

**Form Fields:**

- User selection (search/select existing user)
- Role Title (text input)
- Skills (multi-select or tags)
- Hire Date (date picker)
- Commission Rate (number input, 0-100)
- Active Status (toggle)

### API Client Functions

**Location:** `web/lib/api.ts` (base client) + custom hooks

```typescript
// Using React Query
const { data: employees } = useQuery({
  queryKey: ["salon-employees", salonId],
  queryFn: async () => {
    const response = await api.get(`/salons/${salonId}/employees`);
    return response.data;
  },
});

// Add Employee Mutation
const addEmployeeMutation = useMutation({
  mutationFn: async (employeeData: CreateEmployeeDto) => {
    const response = await api.post(
      `/salons/${salonId}/employees`,
      employeeData
    );
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries(["salon-employees", salonId]);
  },
});
```

---

## 🔗 Integration with Other Modules

### 1. Sales Module

**How Employees are Used in Sales:**

When a sale is created with items, each `sale_item` can have a `salon_employee_id`:

```typescript
// Creating a sale with employee assignment
POST /api/sales
{
  "salonId": "salon-123",
  "customerId": "customer-456",
  "totalAmount": 5000,
  "items": [
    {
      "serviceId": "service-789",
      "salonEmployeeId": "emp-123",  // Employee assigned to this sale item
      "unitPrice": 5000,
      "quantity": 1
    }
  ]
}
```

**Automatic Commission Creation:**

When a sale item has a `salon_employee_id`, the system automatically:

1. Creates a commission record in `commissions` table
2. Links commission to the `salon_employee`
3. Calculates commission based on `commission_rate` and `line_total`

**Commission Calculation:**

```typescript
commissionAmount = (lineTotal * commissionRate) / 100;
```

**Example:**

- Sale item: `lineTotal = 5000 RWF`
- Employee commission rate: `15%`
- Commission created: `5000 * 0.15 = 750 RWF`

### 2. Attendance Module

**How Employees Clock In/Out:**

```typescript
POST /api/attendance/clock-in
{
  "salonEmployeeId": "emp-123",  // Employee ID (not user ID)
  "source": "mobile_app",  // mobile_app | ussd | web
  "latitude": -1.9441,
  "longitude": 30.0619
}
```

**Note:** Uses `salon_employee_id`, not `user_id`, because:

- An employee can work for multiple salons
- Attendance is tracked per salon
- Same user, different `salon_employee` records

### 3. Appointments Module

**Future Integration:**

- Appointments can be assigned to specific employees
- `appointment_staff` table links appointments to `salon_employees`
- Employees can see their assigned appointments

---

## 📝 Step-by-Step Implementation Guide

### For Developers: How to Add Employee Management to a New Feature

#### **Step 1: Check if Employee is Needed**

Ask yourself:

- Does this feature need to know which employee performed the action?
- Should commissions be tracked?
- Is this salon-specific?

If yes → Use `salon_employee_id`

#### **Step 2: Get Employee List**

```typescript
// In your component/service
const { data: employees } = useQuery({
  queryKey: ["salon-employees", salonId],
  queryFn: async () => {
    const response = await api.get(`/salons/${salonId}/employees`);
    return response.data;
  },
});
```

#### **Step 3: Add Employee Selection to Form**

```typescript
<select
  name="salonEmployeeId"
  value={formData.salonEmployeeId}
  onChange={(e) => setFormData({ ...formData, salonEmployeeId: e.target.value })}
>
  <option value="">Select Employee (Optional)</option>
  {employees?.map((emp) => (
    <option key={emp.id} value={emp.id}>
      {emp.user?.fullName} - {emp.roleTitle}
    </option>
  ))}
</select>
```

#### **Step 4: Include Employee ID in API Call**

```typescript
// When creating sale/appointment/etc.
const response = await api.post("/api/sales", {
  salonId,
  items: [
    {
      serviceId: "...",
      salonEmployeeId: formData.salonEmployeeId, // Include employee ID
      unitPrice: 5000,
      quantity: 1,
    },
  ],
});
```

#### **Step 5: Handle Commission (if applicable)**

If creating a sale with employee:

- Commission is automatically created by `SalesService`
- No additional code needed
- Commission appears in employee's commission list

---

## 🎯 Common Use Cases

### Use Case 1: Salon Owner Adds New Employee

**Scenario:** Salon owner wants to add a new stylist to their salon.

**Steps:**

1. Navigate to `/salons/[salonId]/employees`
2. Click "Add Employee"
3. Search for existing user OR create new user first
4. Fill in employee details:
   - Role Title: "Senior Stylist"
   - Skills: ["haircutting", "coloring"]
   - Commission Rate: 15%
   - Hire Date: Today
5. Click "Save"
6. Employee appears in list

**Backend Flow:**

```
POST /api/salons/:salonId/employees
→ SalonsService.addEmployee()
→ Check if employee already exists
→ Create salon_employees record
→ Return employee with user details
```

### Use Case 2: Employee Assigned to Sale

**Scenario:** A customer comes in, employee performs service, sale is created.

**Steps:**

1. Create sale via POS or `/quick-sale`
2. Add sale items
3. For each item, select employee from dropdown
4. Complete sale
5. System automatically:
   - Creates commission for employee
   - Updates employee's total earnings
   - Links sale item to employee

**Backend Flow:**

```
POST /api/sales
→ SalesService.create()
→ For each item with salonEmployeeId:
   → Create commission record
   → Calculate: commissionAmount = lineTotal * (commissionRate / 100)
→ Return sale with commissions
```

### Use Case 3: Employee Views Their Commissions

**Scenario:** Employee wants to see how much they've earned.

**Steps:**

1. Employee logs in (role: `SALON_EMPLOYEE`)
2. Navigate to `/commissions`
3. System shows:
   - All commissions for their `salon_employee_id`
   - Total earned
   - Paid vs unpaid commissions
   - By date range

**Backend Flow:**

```
GET /api/commissions?salonEmployeeId=emp-123
→ CommissionsService.findBySalonEmployeeId()
→ Filter by salonEmployeeId
→ Return commissions with sale details
```

### Use Case 4: Salon Owner Deactivates Employee

**Scenario:** Employee leaves, but owner wants to keep historical data.

**Steps:**

1. Navigate to `/salons/[salonId]/employees`
2. Click "Edit" on employee
3. Toggle "Is Active" to false
4. Save

**Result:**

- Employee is deactivated (`is_active = false`)
- Historical data preserved (sales, commissions, attendance)
- Employee cannot clock in/out
- Employee won't appear in active employee lists
- Can be reactivated later

---

## 🐛 Troubleshooting

### Issue 1: "You can only add employees to your own salon"

**Cause:** User is trying to add employee to a salon they don't own.

**Solution:**

- Check that `salon.ownerId === user.id`
- Verify JWT token has correct user ID
- Ensure user has `SALON_OWNER` role

### Issue 2: "This user is already an employee of this salon"

**Cause:** Trying to add the same user twice to the same salon.

**Solution:**

- Check existing employees: `GET /api/salons/:salonId/employees`
- If employee exists, use `PATCH` to update instead of `POST` to create
- Or remove existing employee first, then re-add

### Issue 3: Employee Not Earning Commissions

**Cause:** Commission not being created automatically.

**Check:**

1. Does sale item have `salonEmployeeId`?
2. Does employee have `commissionRate > 0`?
3. Check `SalesService.create()` - commission creation logic
4. Check `CommissionsService.createCommission()` - should be called from sales

**Solution:**

```typescript
// In SalesService.create()
if (item.salonEmployeeId && item.lineTotal) {
  await this.commissionsService.createCommission(
    item.salonEmployeeId,
    item.id,
    Number(item.lineTotal)
  );
}
```

### Issue 4: Employee Cannot Access Salon Data

**Cause:** Employee user doesn't have correct role or isn't linked properly.

**Check:**

1. User role should be `SALON_EMPLOYEE` (or have access permissions)
2. `salon_employees` record exists with correct `salon_id` and `user_id`
3. Employee is active (`is_active = true`)

**Solution:**

```sql
-- Check employee record
SELECT * FROM salon_employees
WHERE user_id = 'employee-user-id'
AND salon_id = 'salon-id';

-- Check user role
SELECT role FROM users WHERE id = 'employee-user-id';
```

### Issue 5: Multiple Salons for Same Employee

**Scenario:** Employee works for multiple salons.

**Solution:**

- This is supported! Create multiple `salon_employees` records:
  - One record per salon
  - Same `user_id`, different `salon_id`
- Employee can switch between salons in UI
- Commissions tracked per salon

---

## 📚 Key Files Reference

### Backend:

**Entities:**

- `backend/src/salons/entities/salon.entity.ts` - Salon entity
- `backend/src/salons/entities/salon-employee.entity.ts` - Employee entity
- `backend/src/users/entities/user.entity.ts` - User entity with roles

**Services:**

- `backend/src/salons/salons.service.ts` - Salon and employee management
- `backend/src/sales/sales.service.ts` - Sales with employee assignment
- `backend/src/commissions/commissions.service.ts` - Commission tracking

**Controllers:**

- `backend/src/salons/salons.controller.ts` - Employee API endpoints
- `backend/src/sales/sales.controller.ts` - Sales with employee support

**DTOs:**

- `backend/src/salons/dto/create-employee.dto.ts` - Employee creation DTO
- `backend/src/salons/dto/update-employee.dto.ts` - Employee update DTO

### Frontend:

**Pages:**

- `web/app/(dashboard)/salons/[id]/employees/page.tsx` - Employee management page

**Components:**

- Employee cards, forms, modals (in employees page)

**Hooks:**

- `web/hooks/usePermissions.ts` - Role-based access checks

**API Client:**

- `web/lib/api.ts` - Base API client with auth

---

## ✅ Checklist for Adding Employee Support

When implementing a new feature that needs employees:

- [ ] Add `salonEmployeeId` field to entity/DTO
- [ ] Add employee selection to frontend form
- [ ] Fetch employees list for dropdown
- [ ] Include `salonEmployeeId` in API request
- [ ] Handle employee in backend service
- [ ] Create commission if applicable
- [ ] Add employee filter to queries
- [ ] Test with different employee scenarios
- [ ] Add role-based access checks
- [ ] Update documentation

---

## 🚀 Next Steps

1. **Review this document** to understand the system
2. **Test the employee management flow** in the application
3. **Check existing implementations** in sales, attendance modules
4. **Implement new features** following the patterns shown
5. **Ask questions** if anything is unclear!

---

**Last Updated:** Based on current codebase analysis
**Maintained By:** Development Team
