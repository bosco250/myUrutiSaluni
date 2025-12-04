# RBAC UI Implementation Guide

This guide explains how to use Role-Based Access Control (RBAC) in the frontend application.

## Overview

The RBAC UI system provides:
- **Role-based navigation filtering** - Only show navigation items the user can access
- **Conditional rendering** - Show/hide UI elements based on user role
- **Route protection** - Protect entire pages based on user permissions
- **Action-level permissions** - Control which actions users can perform

## Components

### 1. `usePermissions` Hook

A React hook that provides permission checking utilities.

```tsx
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/permissions';

function MyComponent() {
  const { 
    user, 
    userRole,
    hasPermission,
    hasAnyRole,
    isAdmin,
    canManageSalons,
    canViewAllSalons,
    canManageUsers,
    canAccessAccounting,
    canAccessLoans,
    canAccessReports,
    isSuperAdmin,
    isSalonOwner,
    // ... more role checks
  } = usePermissions();

  // Check specific permission
  if (hasPermission(UserRole.SUPER_ADMIN)) {
    // Show admin content
  }

  // Check multiple roles (OR)
  if (hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN])) {
    // Show admin content
  }

  // Convenience methods
  if (canManageSalons()) {
    // Show salon management UI
  }
}
```

### 2. `RoleGuard` Component

Conditionally renders children based on user role.

```tsx
import RoleGuard from '@/components/auth/RoleGuard';
import { UserRole } from '@/lib/permissions';

// Basic usage - hide if no permission
<RoleGuard requiredRoles={[UserRole.SUPER_ADMIN]}>
  <AdminPanel />
</RoleGuard>

// With fallback
<RoleGuard 
  requiredRoles={[UserRole.SALON_OWNER]}
  fallback={<div>Access Denied</div>}
>
  <SalonManagement />
</RoleGuard>

// Show error message
<RoleGuard 
  requiredRoles={[UserRole.SUPER_ADMIN]}
  showError={true}
>
  <AdminPanel />
</RoleGuard>

// Require ALL roles (AND logic)
<RoleGuard 
  requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]}
  requireAll={true}
>
  <SuperAdminPanel />
</RoleGuard>
```

### 3. `ProtectedRoute` Component

Protects entire pages/routes based on user role.

```tsx
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';

// In a page component
export default function AdminPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN]}>
      <div>
        <h1>Admin Dashboard</h1>
        {/* Admin content */}
      </div>
    </ProtectedRoute>
  );
}

// With custom redirect
<ProtectedRoute 
  requiredRoles={[UserRole.SALON_OWNER]}
  redirectTo="/dashboard"
>
  <SalonPage />
</ProtectedRoute>
```

## Navigation Filtering

Navigation items are automatically filtered based on user role. The `FloatingNav` and `CommandPalette` components use the `usePermissions` hook to show only accessible items.

### Adding Role Requirements to Navigation Items

Navigation items in `FloatingNav.tsx` and `CommandPalette.tsx` can specify `requiredRoles`:

```tsx
const navItems: NavItem[] = [
  { 
    name: 'Salons', 
    href: '/salons', 
    icon: Scissors, 
    color: 'from-purple-500 to-pink-500',
    requiredRoles: [
      UserRole.SUPER_ADMIN, 
      UserRole.ASSOCIATION_ADMIN, 
      UserRole.SALON_OWNER
    ]
  },
  // Items without requiredRoles are visible to all authenticated users
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'from-blue-500 to-cyan-500' },
];
```

## Page-Level Implementation

### Example: Salons Page

```tsx
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/lib/permissions';
import RoleGuard from '@/components/auth/RoleGuard';

export default function SalonsPage() {
  const { canManageSalons, hasAnyRole, user } = usePermissions();

  return (
    <div>
      {/* Show "Add Salon" button only to authorized roles */}
      <RoleGuard requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER]}>
        <Button onClick={handleAddSalon}>
          Add Salon
        </Button>
      </RoleGuard>

      {/* Show salons list */}
      {salons.map(salon => (
        <SalonCard 
          key={salon.id}
          salon={salon}
          canEdit={canManageSalons() && (
            hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]) ||
            user?.id === salon.ownerId
          )}
          canDelete={hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN])}
        />
      ))}
    </div>
  );
}
```

## Available Roles

```typescript
enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ASSOCIATION_ADMIN = 'association_admin',
  DISTRICT_LEADER = 'district_leader',
  SALON_OWNER = 'salon_owner',
  SALON_EMPLOYEE = 'salon_employee',
  CUSTOMER = 'customer',
}
```

## Permission Hierarchy

The role hierarchy determines which roles can access resources:

- **SUPER_ADMIN**: Can access everything
- **ASSOCIATION_ADMIN**: Can access most admin functions
- **DISTRICT_LEADER**: Can view and manage district-level resources
- **SALON_OWNER**: Can manage their own salon
- **SALON_EMPLOYEE**: Can view and manage operations for their salon
- **CUSTOMER**: Limited access, mostly viewing

## Best Practices

1. **Always check permissions on the backend** - Frontend RBAC is for UX only, not security
2. **Use RoleGuard for conditional rendering** - Keeps code clean and readable
3. **Use ProtectedRoute for entire pages** - Provides better UX than showing error messages
4. **Check ownership for resource-specific actions** - Salon owners can only edit their own salons
5. **Provide clear feedback** - Use `showError` prop or custom fallbacks to inform users why they can't access something

## Common Patterns

### Pattern 1: Show/Hide Actions

```tsx
const { hasAnyRole } = usePermissions();

{hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]) && (
  <button onClick={handleDelete}>Delete</button>
)}
```

### Pattern 2: Conditional Rendering

```tsx
<RoleGuard requiredRoles={[UserRole.SUPER_ADMIN]}>
  <AdminSection />
</RoleGuard>
```

### Pattern 3: Ownership Checks

```tsx
const canEdit = hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN]) || 
                (user?.id === resource.ownerId);

{canEdit && <EditButton />}
```

### Pattern 4: Route Protection

```tsx
// In app/(dashboard)/admin/page.tsx
export default function AdminPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN]}>
      <AdminContent />
    </ProtectedRoute>
  );
}
```

## Testing

To test RBAC UI:

1. **Login with different roles** - Test each role to see what they can access
2. **Check navigation** - Verify only authorized items appear
3. **Test actions** - Verify edit/delete buttons only show for authorized users
4. **Test route protection** - Try accessing protected routes directly

## Troubleshooting

### Navigation items not showing
- Check that `requiredRoles` is correctly set
- Verify user role matches one of the required roles
- Check browser console for errors

### Components not rendering
- Ensure `usePermissions` hook is used within authenticated context
- Verify user object has a valid `role` property
- Check that `RoleGuard` is properly imported

### Route protection not working
- Ensure `ProtectedRoute` wraps the page content
- Verify authentication is working
- Check that user role is correctly set in auth store

