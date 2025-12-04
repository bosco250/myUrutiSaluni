# Membership Application Workflow

This document describes the membership application workflow for the Salon Association Platform.

## Overview

The system implements a membership-based workflow where:
1. **Association Admins** manage the system at the association level
2. **Salon Owners** must apply to become members of the association
3. **After Approval**, salon owners can add salons and employees

## Workflow Steps

### Step 1: User Registration
- Users register through the public registration page (`/register`)
- All new users are assigned the `CUSTOMER` role by default
- Users can log in immediately after registration

### Step 2: Membership Application
- **Who can apply:** Users with `CUSTOMER` or `SALON_OWNER` role
- **How to apply:** Navigate to `/membership/apply`
- **Required information:**
  - Business Name
  - Business Address
  - City and District
  - Contact Information (Phone, Email)
  - Business Description (optional)
  - Registration Number (optional)
  - Tax ID (optional)

### Step 3: Application Review
- **Who can review:** `SUPER_ADMIN` and `ASSOCIATION_ADMIN` roles
- **Review interface:** `/membership/applications`
- **Actions available:**
  - **Approve:** User role is automatically updated to `SALON_OWNER`
  - **Reject:** Requires a rejection reason (optional but recommended)

### Step 4: Post-Approval
- **Automatic role update:** User role changes from `CUSTOMER` to `SALON_OWNER`
- **New capabilities:**
  - Can create salons (`/salons`)
  - Can add employees to their salons
  - Can manage salon operations

## User Roles in the Workflow

| Role | Can Apply? | Can Review? | Can Create Salons? |
|------|------------|-------------|-------------------|
| CUSTOMER | ✅ Yes | ❌ No | ❌ No (must be approved first) |
| SALON_OWNER | ✅ Yes (if not already approved) | ❌ No | ✅ Yes (if approved member) |
| ASSOCIATION_ADMIN | ❌ No | ✅ Yes | ✅ Yes |
| SUPER_ADMIN | ❌ No | ✅ Yes | ✅ Yes |

## Application Statuses

1. **PENDING** - Application submitted, awaiting review
2. **APPROVED** - Application approved, user can now add salons
3. **REJECTED** - Application rejected, user can reapply

## API Endpoints

### For Applicants
- `POST /memberships/apply` - Submit membership application
- `GET /memberships/applications/my` - Get my application
- `GET /memberships/status` - Check membership status

### For Admins
- `GET /memberships/applications` - Get all applications (with optional status filter)
- `GET /memberships/applications/:id` - Get specific application
- `PATCH /memberships/applications/:id/review` - Approve/Reject application

## Frontend Pages

### For Applicants
- `/membership/apply` - Application form
- `/membership/status` - Check application status (to be created)

### For Admins
- `/membership/applications` - Review applications dashboard

## Business Rules

1. **One Active Application Per User**
   - Users can only have one pending application at a time
   - If rejected, users can submit a new application
   - If approved, users cannot submit another application

2. **Membership Requirement for Salon Creation**
   - Salon owners must have an approved membership to create salons
   - Backend validates membership status before allowing salon creation
   - Admins can bypass this check

3. **Role Assignment**
   - Role is automatically updated to `SALON_OWNER` upon approval
   - Role change is permanent (unless manually changed by admin)

4. **Application Review**
   - Only admins can review applications
   - Rejection requires a reason (optional but recommended)
   - Review actions are logged with reviewer and timestamp

## Error Handling

### Common Scenarios

1. **User tries to create salon without membership**
   - Error: "You must be an approved member of the association to create salons"
   - Solution: Apply for membership first

2. **User tries to submit duplicate application**
   - Error: "You already have a pending membership application"
   - Solution: Wait for review or check application status

3. **User tries to apply when already approved**
   - Error: "You are already an approved member"
   - Solution: User can proceed to add salons

## Database Schema

### Membership Applications Table
```sql
CREATE TABLE membership_applications (
  id UUID PRIMARY KEY,
  applicant_id UUID REFERENCES users(id),
  business_name TEXT,
  business_address TEXT,
  city VARCHAR(100),
  district VARCHAR(100),
  phone VARCHAR(32),
  email VARCHAR(255),
  business_description TEXT,
  registration_number VARCHAR(128),
  tax_id VARCHAR(128),
  status VARCHAR(32) DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Security Considerations

1. **Role-Based Access Control**
   - Only admins can review applications
   - Only applicants can view their own applications
   - Backend validates all permissions

2. **Data Validation**
   - All application fields are validated
   - Email format validation
   - Required fields enforcement

3. **Audit Trail**
   - Review actions are logged with reviewer ID and timestamp
   - Application history is preserved

## Future Enhancements

1. **Email Notifications**
   - Notify applicants when application is reviewed
   - Send approval/rejection emails

2. **Application Documents**
   - Allow file uploads (business license, registration documents)
   - Document verification workflow

3. **District-Based Filtering**
   - District leaders can review applications in their district
   - District assignment for salon owners

4. **Application History**
   - Track all application attempts
   - Show application history to admins

5. **Bulk Operations**
   - Approve/reject multiple applications at once
   - Export application data

## Testing Checklist

- [ ] User can submit membership application
- [ ] User cannot submit duplicate pending application
- [ ] Admin can view all applications
- [ ] Admin can approve application
- [ ] Admin can reject application with reason
- [ ] User role updates automatically upon approval
- [ ] Approved user can create salons
- [ ] Non-approved user cannot create salons
- [ ] Application status is correctly displayed
- [ ] Rejection reason is shown to applicant

## Support

For issues or questions about the membership workflow, contact the system administrator.

