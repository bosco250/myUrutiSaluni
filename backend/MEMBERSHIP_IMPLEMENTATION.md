# Membership Application System Implementation

## Overview

This document describes the backend implementation of the membership application system for the Salon Association Platform.

## Architecture

### Entity: MembershipApplication
- **Location:** `backend/src/memberships/entities/membership-application.entity.ts`
- **Purpose:** Stores membership application data
- **Key Fields:**
  - `applicantId` - Reference to the user applying
  - `status` - Application status (pending, approved, rejected)
  - `businessName`, `businessAddress`, `city`, `district`
  - `rejectionReason` - Reason if rejected
  - `reviewedById` - Admin who reviewed the application
  - `reviewedAt` - Timestamp of review

### Service: MembershipsService
- **Location:** `backend/src/memberships/memberships.service.ts`
- **Key Methods:**
  - `createApplication()` - Create new application
  - `findAll()` - Get all applications (with optional status filter)
  - `findByApplicantId()` - Get user's application
  - `reviewApplication()` - Approve/reject application
  - `checkMembershipStatus()` - Check if user is approved member

### Controller: MembershipsController
- **Location:** `backend/src/memberships/memberships.controller.ts`
- **Endpoints:**
  - `POST /memberships/apply` - Submit application (CUSTOMER, SALON_OWNER)
  - `GET /memberships/applications` - List all applications (Admin only)
  - `GET /memberships/applications/my` - Get my application
  - `GET /memberships/applications/:id` - Get specific application
  - `PATCH /memberships/applications/:id/review` - Review application (Admin)
  - `GET /memberships/status` - Check membership status

## Integration with Salons

### Salon Creation Validation
- **Location:** `backend/src/salons/salons.controller.ts`
- **Validation:** Before allowing salon creation, the system checks:
  1. User must be SALON_OWNER role
  2. User must have approved membership
  3. Admins can bypass membership check

### Error Response
If user tries to create salon without membership:
```json
{
  "statusCode": 400,
  "message": "You must be an approved member of the association to create salons. Please apply for membership first."
}
```

## Database Migration

The membership applications table needs to be created. Run this migration:

```sql
CREATE TABLE membership_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_membership_applications_applicant ON membership_applications(applicant_id);
CREATE INDEX idx_membership_applications_status ON membership_applications(status);
```

## Business Logic

### Application Creation
1. Check if user already has pending/approved application
2. If pending: Throw error "You already have a pending membership application"
3. If approved: Throw error "You are already an approved member"
4. If rejected or no application: Allow creation

### Application Review
1. Validate application exists and is pending
2. Update application status
3. If approved:
   - Update user role to SALON_OWNER
   - Set reviewedBy and reviewedAt
4. If rejected:
   - Set rejectionReason (optional)
   - Set reviewedBy and reviewedAt

### Membership Status Check
Returns:
```json
{
  "isMember": true/false,
  "application": {
    "id": "...",
    "status": "pending|approved|rejected",
    ...
  }
}
```

## Security

### Role-Based Access Control
- **Apply:** CUSTOMER, SALON_OWNER
- **View All:** SUPER_ADMIN, ASSOCIATION_ADMIN
- **View Own:** All authenticated users
- **Review:** SUPER_ADMIN, ASSOCIATION_ADMIN

### Validation
- All DTOs use class-validator decorators
- Email format validation
- Required field validation
- Enum validation for status

## Testing

### Test Cases
1. User can submit application
2. User cannot submit duplicate pending application
3. Admin can view all applications
4. Admin can approve application (role updates)
5. Admin can reject application
6. Approved user can create salons
7. Non-approved user cannot create salons
8. Application status is correctly tracked

## API Examples

### Submit Application
```bash
POST /memberships/apply
Authorization: Bearer <token>
Content-Type: application/json

{
  "businessName": "My Salon",
  "businessAddress": "123 Main St",
  "city": "Kigali",
  "district": "Nyarugenge",
  "phone": "+250788123456",
  "email": "salon@example.com",
  "businessDescription": "A great salon",
  "registrationNumber": "REG123",
  "taxId": "TAX123"
}
```

### Review Application
```bash
PATCH /memberships/applications/:id/review
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "approved"
}

# Or reject:
{
  "status": "rejected",
  "rejectionReason": "Incomplete documentation"
}
```

## Module Dependencies

- `MembershipsModule` imports `TypeOrmModule` for database access
- `SalonsModule` imports `MembershipsModule` for membership validation
- `AppModule` imports `MembershipsModule`

## Next Steps

1. Run database migration to create table
2. Test API endpoints
3. Integrate with frontend
4. Add email notifications (future)
5. Add document upload (future)

