# How to Create Salon Owner Accounts

This guide explains the different ways to create salon owner accounts in the Salon Association Platform.

## Overview

There are **two main methods** to create salon owner accounts:

1. **Membership Application Flow** - For users who register themselves
2. **Direct Admin Creation** - For admins creating accounts directly

---

## Method 1: Membership Application Flow (Self-Registration)

This is the standard workflow for users who want to become salon owners.

### Step-by-Step Process:

#### Step 1: User Registration

1. User visits `/register` page
2. User fills in registration form:
   - Full Name
   - Email
   - Phone (optional)
   - Password
3. User clicks "Register"
4. **Result**: User is created with `CUSTOMER` role by default

#### Step 2: Membership Application

1. User logs in with their credentials
2. User navigates to `/membership/apply` page
3. User fills in membership application form:
   - **Business Name** (required)
   - **Business Address** (required)
   - **City** (required)
   - **District** (required)
   - **Phone** (required)
   - **Email** (required)
   - **Business Description** (optional)
   - **Registration Number** (optional)
   - **Tax ID** (optional)
4. User submits application
5. **Result**: Application is created with `PENDING` status

#### Step 3: Admin Review & Approval

1. Admin (SUPER_ADMIN or ASSOCIATION_ADMIN) logs in
2. Admin navigates to `/membership/applications` page
3. Admin sees list of pending applications
4. Admin reviews application details
5. Admin can:
   - **Approve**: Click "Approve" button
   - **Reject**: Click "Reject" button (with optional reason)
6. **If Approved**:
   - User role automatically changes from `CUSTOMER` to `SALON_OWNER`
   - Membership number is generated (format: `MEMBER-YYYY-XXXXXX`)
   - Yearly payment structure is created (2 installments × 1500 RWF = 3000 RWF/year)
   - User can now create salons

### API Endpoints Used:

- `POST /auth/register` - User registration
- `POST /memberships/apply` - Submit membership application
- `GET /memberships/applications` - Get all applications (admin only)
- `PATCH /memberships/applications/:id/review` - Approve/Reject application (admin only)

---

## Method 2: Direct Admin Creation

Admins can create salon owner accounts directly without going through the membership application process.

### Step-by-Step Process:

#### Step 1: Access Users Management

1. Admin (SUPER_ADMIN or ASSOCIATION_ADMIN) logs in
2. Admin navigates to `/users` page
3. Admin clicks "Create User" button

#### Step 2: Create User with Salon Owner Role

1. Admin fills in the user creation form:
   - **Full Name** (required)
   - **Email** (required)
   - **Phone** (optional)
   - **Password** (required, min 6 characters)
   - **Role**: Select "Salon Owner" from dropdown
2. Admin clicks "Create User"
3. **Result**: User is created with `SALON_OWNER` role

#### Step 3: Create and Approve Membership Application (Required)

⚠️ **Important**: Even though the user has `SALON_OWNER` role, they still need an **approved membership application** to create salons.

You have two options:

**Option A: Create Membership Application Manually**

1. Admin navigates to `/membership/applications`
2. Admin creates a membership application for the user (via API or database)
3. Admin approves the application
4. **Result**: User can now create salons

**Option B: User Applies for Membership**

1. User logs in with the credentials provided by admin
2. User navigates to `/membership/apply`
3. User fills in and submits membership application
4. Admin approves the application
5. **Result**: User can now create salons

### API Endpoints Used:

- `POST /users` - Create user (admin only)
- `PATCH /users/:id` - Update user role (admin only)
- `POST /memberships/apply` - Create membership application
- `PATCH /memberships/applications/:id/review` - Approve application

---

## Important Notes

### Membership Requirement for Salon Creation

Even if a user has `SALON_OWNER` role, they **cannot create salons** until they have an **approved membership application**.

The system checks membership status when creating salons:

- If user has approved membership → Salon creation allowed
- If user doesn't have approved membership → Error: "You must be an approved member of the association to create salons"

**Exception**: Admins (SUPER_ADMIN, ASSOCIATION_ADMIN) can bypass this check when creating salons.

### Role vs Membership Status

- **Role** (`SALON_OWNER`): Determines what features the user can access
- **Membership Status** (`APPROVED`): Determines if the user can create salons

These are separate concepts:

- A user can have `SALON_OWNER` role but no approved membership
- A user needs both `SALON_OWNER` role AND approved membership to create salons

### Quick Reference

| Action                     | Who Can Do It                        | Result                                             |
| -------------------------- | ------------------------------------ | -------------------------------------------------- |
| Register as customer       | Anyone                               | User created with `CUSTOMER` role                  |
| Apply for membership       | CUSTOMER, SALON_OWNER                | Application created with `PENDING` status          |
| Review/Approve application | SUPER_ADMIN, ASSOCIATION_ADMIN       | Role updated to `SALON_OWNER`, membership approved |
| Create user directly       | SUPER_ADMIN, ASSOCIATION_ADMIN       | User created with selected role                    |
| Create salon               | SALON_OWNER with approved membership | Salon created                                      |

---

## Best Practices

### For Admins Creating Salon Owners Directly:

1. **Create User First**
   - Go to `/users`
   - Click "Create User"
   - Select "Salon Owner" role
   - Provide credentials to the user

2. **Create Membership Application**
   - Option A: Have the user apply at `/membership/apply`
   - Option B: Create application via API/database

3. **Approve Application Immediately**
   - Go to `/membership/applications`
   - Find the application
   - Click "Approve"
   - User can now create salons

### For Users Applying Themselves:

1. **Register First**
   - Visit `/register`
   - Create account (gets `CUSTOMER` role)

2. **Apply for Membership**
   - Log in
   - Go to `/membership/apply`
   - Fill in business details
   - Submit application

3. **Wait for Approval**
   - Admin reviews application
   - Upon approval, role changes to `SALON_OWNER`
   - Can now create salons

---

## Troubleshooting

### "You must be an approved member to create salons" Error

**Problem**: User has `SALON_OWNER` role but cannot create salons.

**Solution**:

1. Check if user has a membership application
2. If no application exists, create one
3. Approve the application
4. User can now create salons

### User Created but Cannot Access Salon Features

**Problem**: Admin created user with `SALON_OWNER` role but user sees limited features.

**Solution**:

1. Check membership status at `/membership/applications`
2. Create and approve membership application if missing
3. User should now have full access

### Cannot Find User in Membership Applications

**Problem**: User exists but no application found.

**Solution**:

1. User needs to apply at `/membership/apply`
2. Or admin can create application via API
3. Then approve the application

---

## API Examples

### Create User (Admin Only)

```http
POST /users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "salonowner@example.com",
  "password": "securepassword123",
  "fullName": "Jane Smith",
  "phone": "+250788123456",
  "role": "salon_owner",
  "isActive": true
}
```

### Create Membership Application

```http
POST /memberships/apply
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "businessName": "Jane's Beauty Salon",
  "businessAddress": "KG 11 Ave, Kimihurura",
  "city": "Kigali",
  "district": "Gasabo",
  "phone": "+250788123456",
  "email": "salonowner@example.com",
  "businessDescription": "Full service beauty salon",
  "registrationNumber": "SAL-2024-001",
  "taxId": "TAX-123456"
}
```

### Approve Application (Admin Only)

```http
PATCH /memberships/applications/:id/review
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "approved"
}
```

---

## Summary

**To create a salon owner account:**

1. **Method 1 (Self-Registration)**:
   - User registers → Applies for membership → Admin approves → Can create salons

2. **Method 2 (Admin Creation)**:
   - Admin creates user with SALON_OWNER role → Create/Approve membership application → Can create salons

**Key Point**: Both methods require an **approved membership application** for the user to create salons, regardless of their role.

---

**Last Updated**: Based on current system implementation
**For Questions**: Contact system administrator or refer to:

- [Membership Workflow Guide](./web/MEMBERSHIP_WORKFLOW.md)
- [Role Assignment Guide](./web/ROLE_ASSIGNMENT_GUIDE.md)
