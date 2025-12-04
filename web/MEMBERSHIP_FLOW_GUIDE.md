# Membership Application Flow Guide

This document explains the complete membership application process for both **Customers** and **Salon Owners**.

## Overview

The system has two main user journeys:
1. **Customer Journey**: Regular users who want to become salon owners
2. **Salon Owner Journey**: Existing salon owners who need to apply for membership

## Complete Flow

### Step 1: Initial Access (No Authentication Required)

**Location**: Home Page (`/`)

- Users can view the home page and see the membership application form
- The form is accessible to everyone (no login required to view/fill)
- Users can fill out the membership application form directly on the home page

### Step 2: Form Submission (Requires Authentication)

**What Happens**:
1. User fills out the membership application form on the home page
2. When they click "Submit Application" or "Continue to Sign Up":
   - If **NOT authenticated**: Form data is saved to `sessionStorage`
   - User is redirected to `/register?redirect=membership`
3. If user already has an account, they can click "Already have an account? Sign In" to go to login

### Step 3: Registration/Login

#### Option A: New User Registration
- **Page**: `/register?redirect=membership`
- User creates a new account
- After successful registration:
  - System checks for saved membership form data
  - If data exists → Redirects to `/membership/complete`
  - If no data → Redirects to `/dashboard`

#### Option B: Existing User Login
- **Page**: `/login?redirect=membership`
- User signs in with existing credentials
- After successful login:
  - System checks for saved membership form data
  - If data exists → Redirects to `/membership/complete`
  - If no data → Redirects to `/dashboard`

### Step 4: Complete Membership Application

**Page**: `/membership/complete`

**What Happens**:
1. Form data is automatically loaded from `sessionStorage`
2. Form is pre-filled with saved data
3. **Auto-submission**: If all required fields are valid, the form automatically submits after 500ms
4. User sees success message
5. After 2 seconds, user is redirected to `/dashboard`

**Required Fields** (must be filled for auto-submission):
- Business Name
- Business Address
- City
- District
- Phone Number
- Email (valid format)

### Step 5: Application Status

**After Submission**:
- Application status: `PENDING`
- User role: Still `CUSTOMER` (not changed yet)
- User can access dashboard but with limited features

**Dashboard Experience for Pending Applicants**:
- User sees a banner indicating their application is pending
- Limited access to features
- Cannot create salons yet (requires approval)

### Step 6: Admin Review

**Who Can Review**:
- `SUPER_ADMIN`
- `ASSOCIATION_ADMIN`

**Review Page**: `/membership/applications` (dashboard route)

**Actions Available**:
1. **Approve**:
   - Application status → `APPROVED`
   - User role automatically changes from `CUSTOMER` → `SALON_OWNER`
   - User can now create salons and add employees

2. **Reject**:
   - Application status → `REJECTED`
   - Admin can provide rejection reason
   - User role remains `CUSTOMER`
   - User can see rejection reason and reapply if needed

### Step 7: Post-Approval (Salon Owner)

**After Approval**:
- User role: `SALON_OWNER`
- Can access `/salons` page
- Can create new salons
- Can add employees to their salons
- Can manage salon operations (appointments, inventory, sales, etc.)

## User Roles Throughout the Process

| Stage | User Role | Can Create Salons? | Can Apply Again? |
|-------|----------|-------------------|------------------|
| Initial Registration | `CUSTOMER` | ❌ No | ✅ Yes |
| Application Submitted | `CUSTOMER` | ❌ No | ❌ No (pending) |
| Application Approved | `SALON_OWNER` | ✅ Yes | ❌ No (already approved) |
| Application Rejected | `CUSTOMER` | ❌ No | ✅ Yes (can reapply) |

## Key Features

### 1. Form Data Persistence
- Form data is saved in `sessionStorage` when user is not authenticated
- Data persists through registration/login process
- Data is automatically cleared after successful submission

### 2. Auto-Submission
- Form automatically submits if all required fields are valid
- Prevents user from having to click submit again after registration
- Provides seamless user experience

### 3. Multiple Entry Points
- Home page: Public access, no login required to start
- Dashboard: `/membership/apply` (requires authentication)
- Complete page: `/membership/complete` (handles post-registration)

### 4. Status Tracking
- Users can check their application status
- Dashboard shows appropriate messaging based on status
- Clear indicators for pending, approved, or rejected applications

## Technical Implementation

### Data Flow
```
Home Page Form
    ↓ (if not authenticated)
sessionStorage.save('membershipFormData')
    ↓
Register/Login
    ↓ (after auth success)
Check sessionStorage
    ↓ (if data exists)
/membership/complete
    ↓ (auto-load & validate)
Auto-submit if valid
    ↓
API: POST /memberships/apply
    ↓
Success → Dashboard
```

### Key Components
- `MembershipApplicationForm`: Reusable form component
- `/membership/complete`: Dedicated completion page
- `sessionStorage`: Data persistence mechanism
- Auto-submission logic in `useEffect` hook

## Error Handling

1. **Invalid Form Data**: Form data is cleared, user must start over
2. **Network Errors**: Error message displayed, user can retry
3. **Missing Data**: User redirected to home page with message
4. **Already Applied**: User sees existing application status

## Best Practices

1. **Always validate** form data before saving to sessionStorage
2. **Clear sessionStorage** after successful submission
3. **Provide clear feedback** at each step
4. **Handle edge cases** (already authenticated, existing application, etc.)
5. **Maintain user context** throughout the flow

