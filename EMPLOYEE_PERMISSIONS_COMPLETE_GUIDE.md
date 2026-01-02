# Employee Role Management & Permissions System - Complete Guide

## Overview

This system implements a **granular permission-based access control** for salon employees. Unlike traditional role-based systems where roles have fixed permissions, this system allows salon owners to grant specific permissions to employees, giving them fine-grained control over what each employee can do.

---

## 🏗️ Architecture Overview

### Two-Level Permission System

1. **Role-Based Access (RBAC)** - Base level
   - Defines user roles: `SUPER_ADMIN`, `ASSOCIATION_ADMIN`, `DISTRICT_LEADER`, `SALON_OWNER`, `SALON_EMPLOYEE`, `CUSTOMER`
   - Owners and Admins have full access (bypass permission checks)
   - Employees need explicit permissions granted by owners

2. **Employee Permissions** - Granular level
   - 30+ specific permissions that can be granted/revoked independently
   - Salon-specific (an employee can have different permissions in different salons)
   - Tracked with audit trail (who granted, when, notes)

---

## 📋 How Permissions Are Granted (Backend)

### 1. **Permission Granting Process**

**Who Can Grant:**
- Salon Owners (for their own salons)
- Super Admins (for any salon)
- Association Admins (for salons in their association)

**API Endpoint:**
```
POST /salons/:salonId/employees/:employeeId/permissions
```

**Request Body:**
```json
{
  "permissions": [
    "MANAGE_APPOINTMENTS",
    "PROCESS_PAYMENTS",
    "MANAGE_CUSTOMERS"
  ],
  "notes": "Granted for manager role",
  "metadata": {}
}
```

**Backend Flow (`EmployeePermissionsService.grantPermissions`):**

1. **Validation:**
   - Verify employee exists in the salon
   - Verify requester is salon owner/admin
   - Validate permission codes are valid

2. **Permission Creation:**
   - Check if permission already exists (skip if active)
   - Create new `EmployeePermissionEntity` record with:
     - `salonEmployeeId` - Links to employee
     - `salonId` - Salon-specific
     - `permissionCode` - The permission type
     - `grantedBy` - User ID who granted it
     - `grantedAt` - Timestamp
     - `isActive: true`
     - `notes` - Optional notes

3. **Notification:**
   - Send in-app and push notification to employee
   - Notification includes permission names and codes

**Database Structure:**
```typescript
EmployeePermissionEntity {
  id: UUID
  salonEmployeeId: UUID  // Links to SalonEmployee
  salonId: UUID          // Salon-specific
  permissionCode: EmployeePermission  // e.g., "MANAGE_APPOINTMENTS"
  grantedBy: UUID        // User who granted
  grantedAt: Date
  revokedAt: Date | null
  revokedBy: UUID | null
  isActive: boolean      // false when revoked
  notes: string | null
  metadata: JSON
}
```

### 2. **Permission Revocation Process**

**API Endpoint:**
```
DELETE /salons/:salonId/employees/:employeeId/permissions
```

**Request Body:**
```json
{
  "permissions": ["MANAGE_APPOINTMENTS"],
  "reason": "No longer needed"
}
```

**Backend Flow:**
1. Find active permissions matching the codes
2. Set `isActive: false`
3. Set `revokedAt: new Date()`
4. Set `revokedBy: user.id`
5. Send notification to employee

**Important:** Permissions are soft-deleted (not physically removed) to maintain audit trail.

---

## 🔐 How Permissions Are Checked (Backend)

### 1. **EmployeePermissionGuard**

This NestJS guard protects API endpoints that require specific permissions.

**Usage in Controller:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard, EmployeePermissionGuard)
@EmployeePermission(EmployeePermission.MANAGE_APPOINTMENTS)
@Post('appointments')
async createAppointment() {
  // Only employees with MANAGE_APPOINTMENTS can access
}
```

**Guard Logic:**
1. Extract required permission from decorator
2. If no permission required → allow access
3. Check user role:
   - **Owners/Admins** → Always allow (bypass check)
   - **Employees** → Check if they have the permission
4. For employees:
   - Get `salonId` from request (params/body/query)
   - Find employee record by `userId` + `salonId`
   - Query `employee_permissions` table for active permission
   - If found → allow, else → throw `ForbiddenException`

**Error Message:**
```
"Permission required: MANAGE_APPOINTMENTS. Contact your salon owner to grant this permission."
```

### 2. **Permission Check Service Method**

```typescript
async hasPermission(
  employeeId: string,
  salonId: string,
  permissionCode: EmployeePermission
): Promise<boolean>
```

This queries the database:
```sql
SELECT * FROM employee_permissions
WHERE salon_employee_id = ?
  AND salon_id = ?
  AND permission_code = ?
  AND is_active = true
```

---

## 📱 How Permissions Work in Mobile App

### 1. **Permission Fetching**

**Hook: `useEmployeePermissionCheck`**

This hook automatically:
1. Detects if user is an employee
2. Finds employee record(s) across all salons
3. Fetches permissions for the employee
4. Provides permission checking functions

**Flow:**
```typescript
// Auto-detects salonId and employeeId
const {
  checkPermission,
  hasPermission,
  activePermissions,
  isOwner,
  isAdmin,
  hasOwnerLevelPermissions
} = useEmployeePermissionCheck({
  autoFetch: true
});

// Check a permission
if (checkPermission(EmployeePermission.MANAGE_APPOINTMENTS)) {
  // Show appointment management UI
}
```

**API Call:**
```
GET /salons/:salonId/employees/:employeeId/permissions
```

**Response:**
```json
[
  {
    "id": "uuid",
    "permissionCode": "MANAGE_APPOINTMENTS",
    "isActive": true,
    "grantedAt": "2024-01-15T10:00:00Z",
    "grantedBy": "owner-user-id",
    "salonId": "salon-uuid",
    "salonEmployeeId": "employee-uuid"
  }
]
```

### 2. **Screen Access Control**

**Navigation Guard (`permissionNavigation.ts`):**

Before navigating to a screen, the app checks:

```typescript
canAccessScreen(
  screen: "SalonAppointments",
  userRole: "salon_employee",
  hasPermission: (perm) => checkPermission(perm),
  isOwner: false,
  isAdmin: false,
  hasOwnerLevelPermissions: true
)
```

**Logic:**
1. **Owners/Admins** → Always allowed
2. **Employees with owner-level permissions** → Can access owner screens
3. **Public screens** → Always accessible (e.g., `StaffDashboard`, `Profile`)
4. **Permission-required screens** → Check if employee has required permission

**Screen-to-Permission Mapping:**
```typescript
PERMISSION_TO_SCREEN_MAP = {
  MANAGE_APPOINTMENTS: [
    'SalonAppointments',
    'CreateAppointment',
    'AppointmentDetail'
  ],
  PROCESS_PAYMENTS: ['Sales', 'SaleDetail'],
  // ... etc
}
```

### 3. **UI Element Control**

**Component: `EmployeePermissionGate`**

Wraps UI elements that require permissions:

```tsx
<EmployeePermissionGate
  permission={EmployeePermission.MANAGE_APPOINTMENTS}
  fallback={<Text>No permission</Text>}
>
  <Button onPress={createAppointment}>
    Create Appointment
  </Button>
</EmployeePermissionGate>
```

**Hook Usage:**
```tsx
const { checkPermission } = useEmployeePermissionCheck();

{checkPermission(EmployeePermission.MANAGE_APPOINTMENTS) && (
  <TouchableOpacity onPress={handleCreate}>
    <Text>Create Appointment</Text>
  </TouchableOpacity>
)}
```

---

## 👥 How Employees Use Permissions

### 1. **Viewing Their Permissions**

**Screen: `MyPermissions`**

Employees can see:
- All active permissions granted to them
- When each permission was granted
- Who granted it
- Permission descriptions

**Navigation:**
- From `StaffDashboard` → "My Permissions" button
- From notification when permission is granted/revoked

### 2. **Using Permissions in Daily Work**

**Example: Managing Appointments**

1. Employee opens app → `StaffDashboard`
2. Taps "Appointments" → Navigation checks `MANAGE_APPOINTMENTS` permission
3. If granted → Shows `SalonAppointments` screen
4. Can create, edit, cancel appointments
5. Backend API validates permission on each request

**Example: Processing Payments**

1. Employee navigates to "Sales" screen
2. Requires `PROCESS_PAYMENTS` permission
3. If granted → Can process payments, apply discounts
4. Backend validates on `POST /sales` endpoint

### 3. **Permission-Based Navigation**

**Bottom Navigation Tabs:**

The app shows different tabs based on permissions:

```typescript
// Employee with MANAGE_APPOINTMENTS sees:
- Dashboard
- Appointments  ✅ (has permission)
- Customers     ❌ (no permission - hidden)
- Sales         ❌ (no permission - hidden)
- Profile

// Employee with multiple permissions sees:
- Dashboard
- Appointments  ✅
- Customers     ✅
- Sales         ✅
- Inventory     ✅
- Profile
```

**Owner-Level Permissions:**

If employee has 5+ permissions or key management permissions:
- Can see owner navigation tabs
- Can access `OwnerDashboard`, `Operations`, `Finance` screens
- Gets elevated UI experience

---

## 🔄 Permission Lifecycle

### 1. **Granting Flow**

```
Owner → Opens Employee Detail Screen
     → Taps "Manage Permissions"
     → Selects permissions to grant
     → Taps "Grant Permissions"
     → Backend creates permission records
     → Notification sent to employee
     → Employee sees new permissions in app
```

### 2. **Revoking Flow**

```
Owner → Opens Employee Detail Screen
     → Taps "Manage Permissions"
     → Unchecks permissions to revoke
     → Taps "Revoke Permissions"
     → Backend marks permissions inactive
     → Notification sent to employee
     → Employee loses access to related screens
```

### 3. **Real-Time Updates**

- Permissions are cached in mobile app
- When permissions change, employee receives notification
- App can refresh permissions on:
  - App foreground
  - Notification tap
  - Manual refresh in `MyPermissions` screen

---

## 📊 Available Permissions

### Appointment Management
- `MANAGE_APPOINTMENTS` - Create, update, cancel any appointment
- `ASSIGN_APPOINTMENTS` - Assign appointments to employees
- `VIEW_ALL_APPOINTMENTS` - View all salon appointments
- `MODIFY_APPOINTMENT_STATUS` - Change appointment status

### Service & Product Management
- `MANAGE_SERVICES` - Create, update, delete services
- `MANAGE_PRODUCTS` - Create, update, delete products
- `UPDATE_SERVICE_PRICING` - Modify service prices
- `UPDATE_PRODUCT_PRICING` - Modify product prices

### Customer Management
- `MANAGE_CUSTOMERS` - Create, update customer records
- `VIEW_CUSTOMER_HISTORY` - View transaction history
- `VIEW_CUSTOMER_LOYALTY` - View loyalty points
- `UPDATE_CUSTOMER_INFO` - Modify customer information

### Sales & Financial
- `PROCESS_PAYMENTS` - Process payments and refunds
- `APPLY_DISCOUNTS` - Apply discounts to sales
- `VIEW_SALES_REPORTS` - View sales analytics
- `EXPORT_SALES_DATA` - Export sales data
- `VOID_TRANSACTIONS` - Void/cancel transactions

### Staff Management
- `MANAGE_EMPLOYEE_SCHEDULES` - Create/edit schedules
- `VIEW_EMPLOYEE_PERFORMANCE` - View employee metrics
- `VIEW_EMPLOYEE_COMMISSIONS` - View all commissions

### Inventory Management
- `MANAGE_INVENTORY` - Add/remove stock
- `VIEW_INVENTORY_REPORTS` - View inventory analytics
- `PROCESS_STOCK_ADJUSTMENTS` - Make inventory adjustments
- `VIEW_LOW_STOCK_ALERTS` - Access inventory alerts

### Salon Operations
- `VIEW_SALON_SETTINGS` - View settings (read-only)
- `UPDATE_SALON_SETTINGS` - Modify salon settings
- `MANAGE_BUSINESS_HOURS` - Update operating hours
- `MANAGE_SALON_PROFILE` - Update salon profile

---

## 🛡️ Security Considerations

### Backend Security

1. **Always Validate on Backend**
   - Mobile app checks are for UX only
   - Backend guards enforce actual security
   - Never trust client-side permission checks

2. **Salon-Specific Permissions**
   - Permissions are scoped to specific salons
   - Employee must have permission for the salon they're working in
   - `salonId` is required in all permission checks

3. **Audit Trail**
   - All permission grants/revocations are logged
   - Track who granted, when, and why
   - Historical data preserved (soft deletes)

### Mobile Security

1. **Permission Caching**
   - Permissions cached in app state
   - Refreshed on app start and when needed
   - Session expiration handled gracefully

2. **Offline Handling**
   - App works with cached permissions when offline
   - Backend will reject requests if permissions revoked
   - User sees error message if permission revoked

---

## 🎯 Best Practices

### For Salon Owners

1. **Grant Minimum Required Permissions**
   - Only grant what employee needs for their role
   - Review permissions periodically
   - Revoke unused permissions

2. **Use Permission Categories**
   - Group related permissions together
   - Grant entire categories for specific roles
   - Document why permissions were granted

### For Developers

1. **Always Use Guards**
   - Protect all employee-accessible endpoints
   - Use `@EmployeePermission()` decorator
   - Provide clear error messages

2. **Check Permissions in UI**
   - Hide/show UI elements based on permissions
   - Use `EmployeePermissionGate` component
   - Provide fallback UI for unauthorized users

3. **Handle Permission Changes**
   - Listen for permission notifications
   - Refresh permission cache when needed
   - Show user-friendly messages when access denied

---

## 📝 Summary

**How Permissions Work:**

1. **Granting:** Owner selects permissions → Backend creates records → Employee notified
2. **Checking:** Employee tries to access feature → Mobile checks cache → Backend validates → Access granted/denied
3. **Using:** Employee sees UI based on permissions → Can perform allowed actions → Backend enforces on every request
4. **Revoking:** Owner removes permissions → Backend marks inactive → Employee loses access → Notification sent

**Key Points:**
- Permissions are **granular** (30+ specific permissions)
- Permissions are **salon-specific** (different per salon)
- Permissions are **audited** (track who/when/why)
- Permissions are **enforced** (backend always validates)
- Permissions are **real-time** (notifications update app)

This system provides flexible, secure, and user-friendly permission management for salon employees! 🎉

