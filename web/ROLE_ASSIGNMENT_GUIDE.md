# Role Assignment Guide

This guide explains how to assign roles to users in the Salon Association Platform.

## Overview

User roles control what features and resources users can access. Roles are assigned in several ways:

1. **During Registration** - Default role is `CUSTOMER`
2. **Via Admin Interface** - Admins can create users and assign roles
3. **Via User Management Page** - Admins can update existing user roles

## Available Roles

| Role | Description | Who Can Assign |
|------|-------------|----------------|
| `SUPER_ADMIN` | Full system access | Only existing SUPER_ADMIN |
| `ASSOCIATION_ADMIN` | Association-level admin | SUPER_ADMIN, ASSOCIATION_ADMIN |
| `DISTRICT_LEADER` | District-level management | SUPER_ADMIN, ASSOCIATION_ADMIN |
| `SALON_OWNER` | Salon business owner | SUPER_ADMIN, ASSOCIATION_ADMIN |
| `SALON_EMPLOYEE` | Salon employee | SUPER_ADMIN, ASSOCIATION_ADMIN, SALON_OWNER |
| `CUSTOMER` | Regular customer | Default for registration |

## Methods to Assign Roles

### Method 1: User Management Page (Recommended)

**Access:** `/users` (Only for SUPER_ADMIN and ASSOCIATION_ADMIN)

**Steps:**
1. Log in as an admin (SUPER_ADMIN or ASSOCIATION_ADMIN)
2. Navigate to the "Users" page from the navigation menu
3. Find the user you want to update
4. Click on the role dropdown in the "Role" column
5. Select the new role
6. The role will be updated automatically

**Features:**
- View all users
- Filter by role and status
- Search users by name, email, or phone
- Create new users with specific roles
- Update user roles
- Activate/deactivate users
- Delete users (admins only)

### Method 2: Create New User (Admin Only)

**Access:** `/users` → Click "Create User" button

**Steps:**
1. Click the "Create User" button on the Users page
2. Fill in the user details:
   - Full Name (required)
   - Email (required)
   - Phone (optional)
   - Password (required, min 6 characters)
   - Role (select from dropdown)
3. Click "Create User"
4. The user will be created with the selected role

### Method 3: Registration (Default Role)

**Access:** `/register`

**Note:** During public registration, users are automatically assigned the `CUSTOMER` role. The registration form does not allow role selection for security reasons.

**To assign a different role after registration:**
- Use the User Management page (Method 1) to update the role

### Method 4: Backend API (For Developers)

**Endpoint:** `POST /users` (Admin only)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "hashed_password",
  "fullName": "John Doe",
  "phone": "+250788123456",
  "role": "salon_owner",
  "isActive": true
}
```

**Update Role Endpoint:** `PATCH /users/:id`

**Request Body:**
```json
{
  "role": "salon_owner"
}
```

## Role Assignment Rules

### Who Can Assign Roles?

1. **SUPER_ADMIN**
   - Can assign any role to any user
   - Can create other SUPER_ADMIN users (use with caution!)

2. **ASSOCIATION_ADMIN**
   - Can assign: ASSOCIATION_ADMIN, DISTRICT_LEADER, SALON_OWNER, SALON_EMPLOYEE, CUSTOMER
   - Cannot assign SUPER_ADMIN role
   - Cannot modify other ASSOCIATION_ADMIN or SUPER_ADMIN users

3. **DISTRICT_LEADER**
   - Cannot assign roles (read-only access to users)

4. **SALON_OWNER**
   - Cannot assign roles directly
   - Can create SALON_EMPLOYEE users through salon management (if implemented)

5. **SALON_EMPLOYEE & CUSTOMER**
   - Cannot assign roles

### Self-Modification Restrictions

- Users **cannot** change their own role
- Users **cannot** deactivate themselves
- Users **cannot** delete themselves

## Best Practices

1. **Start with SUPER_ADMIN**
   - Create the first SUPER_ADMIN user via database or seed script
   - Use this account to create other admin users

2. **Limit SUPER_ADMIN Creation**
   - Only create SUPER_ADMIN users when absolutely necessary
   - Prefer ASSOCIATION_ADMIN for most administrative tasks

3. **Role Assignment Workflow**
   - New salon owners: Create user → Assign SALON_OWNER role → Create salon for them
   - Salon employees: Create user → Assign SALON_EMPLOYEE role → Link to salon
   - District leaders: Create user → Assign DISTRICT_LEADER role → Assign district

4. **User Status Management**
   - Deactivate users instead of deleting (preserves data)
   - Only delete users if absolutely necessary
   - Inactive users cannot log in but their data is preserved

## Example Scenarios

### Scenario 1: Onboarding a New Salon Owner

1. Admin logs in and goes to `/users`
2. Clicks "Create User"
3. Enters:
   - Name: "Jane Smith"
   - Email: "jane@salon.com"
   - Phone: "+250788123456"
   - Password: "securepassword"
   - Role: "Salon Owner"
4. Clicks "Create User"
5. User is created with SALON_OWNER role
6. Admin can now create a salon and assign this user as the owner

### Scenario 2: Promoting a Customer to Salon Owner

1. Admin logs in and goes to `/users`
2. Searches for the customer
3. Finds the user in the table
4. Clicks the role dropdown in the "Role" column
5. Changes from "Customer" to "Salon Owner"
6. Role is updated automatically

### Scenario 3: Deactivating a User

1. Admin logs in and goes to `/users`
2. Finds the user
3. Clicks the status badge (Active/Inactive)
4. Status toggles automatically
5. Inactive users cannot log in

## Troubleshooting

### "Access Denied" when trying to access Users page
- **Solution:** You need SUPER_ADMIN or ASSOCIATION_ADMIN role
- Check your current role in the header user menu

### Cannot change role dropdown
- **Solution:** You cannot change your own role
- Have another admin change it for you

### Role not updating
- **Solution:** Check browser console for errors
- Verify you have permission to update users
- Ensure the backend API is running

### Users page not showing in navigation
- **Solution:** Only admins see the Users page
- Your role might not have permission
- Check navigation menu visibility based on your role

## Security Notes

⚠️ **Important Security Considerations:**

1. **Role Assignment is Protected**
   - Only admins can assign roles
   - Backend validates all role assignments
   - Frontend restrictions are for UX only, not security

2. **SUPER_ADMIN Privileges**
   - SUPER_ADMIN has full system access
   - Use sparingly and protect these accounts
   - Consider using 2FA for admin accounts (if implemented)

3. **Default Registration**
   - Public registration always creates CUSTOMER role
   - Prevents privilege escalation through registration

4. **Self-Modification Prevention**
   - Users cannot elevate their own privileges
   - Prevents accidental or malicious role changes

## API Reference

### Create User (Admin Only)
```http
POST /users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "phone": "+250788123456",
  "role": "salon_owner",
  "isActive": true
}
```

### Update User Role (Admin Only)
```http
PATCH /users/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role": "salon_owner"
}
```

### Get All Users (Admin Only)
```http
GET /users
Authorization: Bearer <admin_token>
```

## Next Steps

After assigning roles:
1. Users will see different navigation items based on their role
2. Users will have access to different features and pages
3. Backend APIs will enforce role-based access control
4. Users can only perform actions allowed by their role

For more information, see:
- [RBAC Guide](./RBAC_UI_GUIDE.md) - Frontend RBAC implementation
- [Backend RBAC Guide](../backend/RBAC_GUIDE.md) - Backend RBAC implementation

