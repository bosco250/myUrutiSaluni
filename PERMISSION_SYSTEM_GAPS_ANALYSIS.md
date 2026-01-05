# Permission System Gaps Analysis
## Issues Preventing Employees from Performing Assigned Work

This document identifies **critical gaps** in the permission system that prevent employees from performing their assigned work, even when they have been granted the necessary permissions.

---

## 🔴 CRITICAL GAPS

### 1. **Salon ID Missing in API Requests**

**Problem:**
- Backend `EmployeePermissionGuard` requires `salonId` from request (params/body/query)
- Many API endpoints don't include `salonId` in the request
- Employee has permission but request fails with: `"Salon ID required for permission check"`

**Impact:**
- Employee cannot perform actions even with correct permissions
- Affects endpoints that don't naturally include `salonId` in URL

**Example:**
```typescript
// ❌ FAILS: No salonId in request
POST /appointments
Body: { customerId, serviceId, date }

// ✅ WORKS: salonId in URL
POST /salons/:salonId/appointments
```

**Affected Endpoints:**
- `/appointments` (create without salonId in URL)
- `/services` (create/update)
- `/customers` (create/update)
- `/sales` (create transaction)

**Solution:**
1. Ensure all employee-accessible endpoints include `salonId` in URL path
2. OR: Extract `salonId` from related entities (appointment.salonId, service.salonId)
3. OR: Use employee's default salon from employee record

---

### 2. **Employee Record Not Found**

**Problem:**
- Employee has permissions granted
- But employee record lookup fails: `"Employee record not found for this salon"`
- Can happen if:
  - Employee was deactivated but permissions still active
  - Employee works in multiple salons, wrong `salonId` used
  - Employee record deleted but permissions not cleaned up

**Impact:**
- Employee cannot access any features requiring permissions
- Even though permissions exist in database

**Root Causes:**
```typescript
// Guard checks:
const employee = await this.permissionsService.getEmployeeRecordByUserId(
  user.id,
  salonId,
);

if (!employee) {
  throw new ForbiddenException('Employee record not found for this salon');
}
```

**Solution:**
1. Validate employee record exists before granting permissions
2. Auto-cleanup permissions when employee deactivated
3. Better error message: "Employee record not found. Contact admin."
4. Allow employee to see which salon they're associated with

---

### 3. **Multi-Salon Confusion**

**Problem:**
- Employee works in multiple salons
- Has different permissions per salon
- Mobile app might use wrong `salonId` when checking permissions
- Backend uses wrong `salonId` from request

**Impact:**
- Employee has `MANAGE_APPOINTMENTS` in Salon A
- But app/backend checks permissions for Salon B
- Access denied even though permission exists

**Example Scenario:**
```
Employee works at:
- Salon A: Has MANAGE_APPOINTMENTS ✅
- Salon B: No permissions ❌

Employee tries to create appointment in Salon A
But system checks permissions for Salon B → DENIED
```

**Solution:**
1. Mobile app should clearly show which salon is active
2. Auto-select salon with most permissions
3. Allow employee to switch salons
4. Backend should validate `salonId` matches the resource being accessed

---

### 4. **Permission Loading State**

**Problem:**
- Permissions are fetched asynchronously on app start
- Employee tries to access feature before permissions loaded
- UI shows "No permission" even though permission exists

**Impact:**
- Employee sees locked features during loading
- Confusion about whether they have access
- Poor user experience

**Current Behavior:**
```typescript
// Hook shows loading state
if (loading) {
  return <Text>Checking permissions...</Text>;
}

// But some components don't wait
{!hasPermission(perm) && <LockedFeature />} // Shows before loaded!
```

**Solution:**
1. Show loading spinner until permissions loaded
2. Cache permissions in local storage
3. Pre-fetch permissions on login
4. Show "Loading permissions..." instead of "No permission"

---

### 5. **Screen-to-Permission Mapping Gaps**

**Problem:**
- Some screens require permissions but aren't mapped
- Employee has permission but screen shows as inaccessible
- Missing mappings in `PERMISSION_TO_SCREEN_MAP`

**Impact:**
- Employee cannot navigate to screens they should access
- Navigation blocked even with correct permissions

**Example:**
```typescript
// Screen exists but not mapped
Screen: "EditAppointment"
Permission: MANAGE_APPOINTMENTS

// Missing in PERMISSION_TO_SCREEN_MAP
// Employee can't access screen even with permission
```

**Solution:**
1. Audit all screens and ensure mapping exists
2. Add default fallback: if screen not mapped, check if employee has any permission
3. Log unmapped screen access attempts
4. Auto-generate mappings from screen names

---

### 6. **Missing Permission Guards on Endpoints**

**Problem:**
- Some endpoints require permissions but don't have `@RequireEmployeePermission` decorator
- Employee can access endpoint without permission check
- OR: Endpoint blocks employee even with permission (no guard)

**Impact:**
- Inconsistent behavior
- Some features work, others don't
- Security gaps or over-restrictive access

**Example:**
```typescript
// ❌ Missing guard
@Post('services')
async createService() {
  // No permission check!
}

// ✅ Has guard
@RequireEmployeePermission(EmployeePermission.MANAGE_SERVICES)
@Post('salons/:salonId/services')
async createService() {
  // Permission checked
}
```

**Solution:**
1. Audit all employee-accessible endpoints
2. Add `@RequireEmployeePermission` where needed
3. Document which endpoints require which permissions
4. Add integration tests for permission checks

---

### 7. **Error Messages Not Actionable**

**Problem:**
- Error messages don't tell employee what to do
- Generic "Permission required" without context
- No way to request permission from app

**Current Error:**
```
"Permission required: MANAGE_APPOINTMENTS. Contact your salon owner to grant this permission."
```

**Issues:**
- Employee doesn't know who salon owner is
- No way to contact owner from app
- No permission request feature

**Solution:**
1. Show salon owner contact info in error
2. Add "Request Permission" button
3. Show which permissions employee currently has
4. Link to "My Permissions" screen

---

### 8. **Permission Sync Issues**

**Problem:**
- Owner grants permission
- Employee's app doesn't refresh permissions
- Employee still sees old permission state
- Requires app restart or manual refresh

**Impact:**
- Employee cannot use newly granted permissions
- Confusion about permission status
- Poor real-time experience

**Solution:**
1. Auto-refresh permissions on app foreground
2. Listen for permission change notifications
3. Show notification when permissions updated
4. Auto-refresh when returning to app

---

### 9. **Data Access Gaps**

**Problem:**
- Employee has permission to manage appointments
- But cannot access related data (customer info, service details)
- Permission grants access to action but not to view data

**Example:**
```
Permission: MANAGE_APPOINTMENTS
Can: Create, edit appointments
Cannot: View customer details (needs MANAGE_CUSTOMERS)
Cannot: View service pricing (needs VIEW_SERVICES)
```

**Impact:**
- Employee can't complete tasks
- Need multiple permissions for single workflow
- Frustrating user experience

**Solution:**
1. Grant related permissions together (permission bundles)
2. Allow read-only access to related data
3. Show what data is accessible with current permissions
4. Request additional permissions from within workflow

---

### 10. **UI/UX Gaps - Employee Doesn't Know What They Can Do**

**Problem:**
- Employee has permissions but doesn't know what they can access
- No clear indication of available features
- Hidden features, no discovery mechanism

**Impact:**
- Employee doesn't use granted permissions
- Underutilization of system
- Poor productivity

**Solution:**
1. Show "What Can I Do?" screen listing all accessible features
2. Highlight new permissions when granted
3. Show permission badges on accessible screens
4. Provide onboarding tour for new permissions

---

## 🟡 MEDIUM PRIORITY GAPS

### 11. **Permission Expiration Not Handled**

**Problem:**
- Permissions can be revoked but employee might not know immediately
- No graceful handling of permission revocation during active session

**Solution:**
- Real-time permission revocation notifications
- Auto-logout or redirect when critical permissions revoked
- Show warning when permission about to expire

---

### 12. **Offline Permission Checking**

**Problem:**
- App works offline but permissions not cached properly
- Employee can't access features offline even with cached permissions

**Solution:**
- Cache permissions in local storage
- Validate cached permissions on app start
- Show offline indicator when using cached permissions

---

### 13. **Permission Dependency Issues**

**Problem:**
- Some permissions depend on others
- Employee has permission A but needs permission B to complete task
- No indication of missing dependencies

**Example:**
```
Has: MANAGE_APPOINTMENTS
Needs: VIEW_ALL_APPOINTMENTS (to see appointments to manage)
Needs: MANAGE_CUSTOMERS (to create customer for appointment)
```

**Solution:**
- Define permission dependencies
- Auto-grant dependent permissions
- Show missing dependencies in UI

---

## 🟢 LOW PRIORITY GAPS

### 14. **Permission Audit Trail Not Visible**

**Problem:**
- Employee can't see who granted permissions, when, why
- No transparency in permission management

**Solution:**
- Show permission history in "My Permissions" screen
- Display granted by, granted at, notes

---

### 15. **Bulk Permission Operations**

**Problem:**
- Owner must grant permissions one by one
- No role-based permission templates
- Time-consuming for multiple employees

**Solution:**
- Create permission templates (Manager, Receptionist, etc.)
- Bulk grant permissions to multiple employees
- Copy permissions from one employee to another

---

## 📊 Gap Impact Summary

| Gap | Impact | Frequency | Priority |
|-----|--------|-----------|----------|
| Salon ID Missing | High | Common | 🔴 Critical |
| Employee Record Not Found | High | Occasional | 🔴 Critical |
| Multi-Salon Confusion | High | Common | 🔴 Critical |
| Permission Loading State | Medium | Always | 🔴 Critical |
| Screen Mapping Gaps | Medium | Occasional | 🔴 Critical |
| Missing Guards | High | Rare | 🔴 Critical |
| Error Messages | Low | Always | 🟡 Medium |
| Permission Sync | Medium | Common | 🟡 Medium |
| Data Access Gaps | High | Common | 🟡 Medium |
| UI/UX Gaps | Medium | Always | 🟡 Medium |

---

## 🛠️ Recommended Fixes (Priority Order)

### Phase 1: Critical Fixes (Week 1-2)

1. **Fix Salon ID Extraction**
   - Ensure all endpoints include `salonId` in URL
   - Add fallback to extract from related entities
   - Update mobile app to always send `salonId`

2. **Fix Employee Record Lookup**
   - Validate employee record exists before permission check
   - Better error handling for missing records
   - Auto-cleanup orphaned permissions

3. **Fix Multi-Salon Handling**
   - Add salon selector in mobile app
   - Auto-detect active salon
   - Validate `salonId` matches resource

4. **Fix Permission Loading**
   - Show loading state properly
   - Cache permissions locally
   - Pre-fetch on login

### Phase 2: Important Fixes (Week 3-4)

5. **Complete Screen Mappings**
   - Audit all screens
   - Add missing mappings
   - Add fallback logic

6. **Add Missing Guards**
   - Audit all endpoints
   - Add `@RequireEmployeePermission` where needed
   - Test permission checks

7. **Improve Error Messages**
   - Add actionable error messages
   - Show salon owner contact
   - Add "Request Permission" feature

### Phase 3: Enhancements (Week 5-6)

8. **Real-time Permission Sync**
   - Add WebSocket/SSE for permission updates
   - Auto-refresh on permission changes
   - Show notifications

9. **Data Access Improvements**
   - Grant related permissions together
   - Allow read-only access to related data
   - Show permission dependencies

10. **UI/UX Improvements**
    - Add "What Can I Do?" screen
    - Highlight accessible features
    - Add permission onboarding

---

## 🧪 Testing Checklist

For each gap fix, test:

- [ ] Employee with permission can access feature
- [ ] Employee without permission sees proper error
- [ ] Multi-salon employees work correctly
- [ ] Permissions load before UI renders
- [ ] Permission changes reflect immediately
- [ ] Error messages are actionable
- [ ] All screens are mapped correctly
- [ ] All endpoints have proper guards

---

## 📝 Notes

- **Most Critical:** Salon ID missing and employee record lookup failures
- **Most Common:** Multi-salon confusion and permission loading states
- **Easiest to Fix:** Error messages and UI/UX improvements
- **Hardest to Fix:** Multi-salon handling and permission dependencies

---

## 🎯 Success Metrics

After fixes, measure:
- **Permission Access Success Rate:** % of permission checks that succeed
- **Error Rate:** % of "permission denied" errors (should decrease)
- **Time to Access:** Time from login to permissions loaded
- **User Satisfaction:** Employee feedback on permission system
- **Feature Utilization:** % of granted permissions actually used

---

**Last Updated:** [Current Date]
**Status:** 🔴 Critical gaps identified, fixes recommended

