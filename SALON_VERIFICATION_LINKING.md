# Salon Verification & Linking - Where It Happens

## Overview
This document shows exactly where salon verification and membership linking occurs in the codebase.

---

## 🔍 Where Salon Verification is Linked

### 1. **Salon Creation Verification** ✅

**Location:** `backend/src/salons/salons.controller.ts`

**Lines:** 34-42

**Code:**
```typescript
@Post()
@Roles(UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.SALON_OWNER)
@ApiOperation({ summary: 'Create a new salon' })
async create(@Body() createSalonDto: CreateSalonDto, @CurrentUser() user: any) {
  // Salon owners can only create salons for themselves
  if (user.role === UserRole.SALON_OWNER && createSalonDto.ownerId !== user.id) {
    throw new ForbiddenException('You can only create salons for yourself');
  }

  // ✅ VERIFICATION HAPPENS HERE (Lines 34-42)
  // Check membership status for salon owners (admins can bypass)
  if (user.role === UserRole.SALON_OWNER) {
    const membershipStatus = await this.membershipsService.checkMembershipStatus(user.id);
    if (!membershipStatus.isMember) {
      throw new BadRequestException(
        'You must be an approved member of the association to create salons. Please apply for membership first.'
      );
    }
  }

  return this.salonsService.create(createSalonDto);
}
```

**What it does:**
- ✅ Verifies user has **approved membership** before allowing salon creation
- ✅ Only checks for `SALON_OWNER` role (admins bypass this check)
- ✅ Calls `membershipsService.checkMembershipStatus(user.id)` to verify
- ✅ Throws error if user is not an approved member

---

### 2. **Automatic Membership Linking** ✅

**Location:** `backend/src/salons/salons.service.ts`

**Lines:** 20-37

**Code:**
```typescript
async create(salonData: Partial<Salon>): Promise<Salon> {
  const salon = this.salonsRepository.create(salonData);
  const savedSalon = await this.salonsRepository.save(salon);
  
  // ✅ AUTO-LINKING HAPPENS HERE (Lines 24-34)
  // Auto-create membership for the salon
  try {
    await this.membershipsService.createMembership({
      salonId: savedSalon.id,
      status: MembershipStatus.NEW,
      startDate: new Date().toISOString(),
    });
  } catch (error) {
    // Log error but don't fail salon creation if membership creation fails
    console.error('Failed to create membership for salon:', error);
  }
  
  return savedSalon;
}
```

**What it does:**
- ✅ **Automatically creates a membership** when salon is created
- ✅ Links membership to salon via `salonId`
- ✅ Sets membership status to `NEW`
- ✅ Sets start date to current date
- ✅ Does not fail salon creation if membership creation fails (logs error)

---

## 🔗 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              USER TRIES TO CREATE SALON                      │
│         POST /salons (with salon data)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         SalonsController.create()                            │
│         File: salons.controller.ts                          │
│                                                              │
│  1. Check user role (SALON_OWNER, ADMIN, etc.)             │
│  2. Verify ownership (salon owner can only create for self) │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         ✅ VERIFICATION STEP (Lines 34-42)                   │
│                                                              │
│  if (user.role === UserRole.SALON_OWNER) {                  │
│    membershipStatus = checkMembershipStatus(user.id)        │
│    if (!membershipStatus.isMember) {                        │
│      ❌ THROW ERROR: "Must be approved member"              │
│    }                                                         │
│  }                                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼ (If verified)
┌─────────────────────────────────────────────────────────────┐
│         SalonsService.create()                              │
│         File: salons.service.ts                              │
│                                                              │
│  1. Create salon entity                                     │
│  2. Save salon to database                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         ✅ AUTO-LINKING STEP (Lines 24-34)                   │
│                                                              │
│  membershipsService.createMembership({                       │
│    salonId: savedSalon.id,  ← Links membership to salon     │
│    status: 'NEW',                                           │
│    startDate: new Date()                                    │
│  })                                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         DATABASE                                             │
│                                                              │
│  salons table:                                               │
│    - id: "salon-uuid"                                       │
│    - owner_id: "user-uuid"                                  │
│    - name: "Salon Name"                                      │
│                                                              │
│  memberships table:                                          │
│    - id: "membership-uuid"                                  │
│    - salon_id: "salon-uuid"  ← LINKED HERE                  │
│    - status: "new"                                           │
│    - start_date: "2024-01-01"                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📍 Key Files & Locations

### 1. Verification Logic

| File | Lines | Purpose |
|------|-------|---------|
| `backend/src/salons/salons.controller.ts` | 34-42 | Verifies membership before salon creation |
| `backend/src/memberships/memberships.service.ts` | 184-198 | `checkMembershipStatus()` method |

### 2. Linking Logic

| File | Lines | Purpose |
|------|-------|---------|
| `backend/src/salons/salons.service.ts` | 24-34 | Auto-creates membership when salon is created |
| `backend/src/memberships/memberships.service.ts` | 210-237 | `createMembership()` method |

---

## 🔍 Detailed Code Analysis

### Verification Method

**File:** `backend/src/memberships/memberships.service.ts`

**Method:** `checkMembershipStatus(userId: string)`

**Lines:** 184-198

```typescript
async checkMembershipStatus(userId: string): Promise<{ isMember: boolean; application: MembershipApplication | null }> {
  // Optimized query - only fetch what we need for status check
  const application = await this.applicationsRepository.findOne({
    where: { applicantId: userId },
    select: ['id', 'status', 'applicantId', 'businessName', 'createdAt', 'reviewedAt'],
    order: { createdAt: 'DESC' },
  });
  
  if (!application) {
    return { isMember: false, application: null };
  }

  const isMember = application.status === ApplicationStatus.APPROVED;
  return { isMember, application };
}
```

**What it checks:**
- ✅ Finds user's most recent membership application
- ✅ Returns `isMember: true` only if application status is `APPROVED`
- ✅ Returns `isMember: false` if no application or status is `PENDING`/`REJECTED`

### Linking Method

**File:** `backend/src/memberships/memberships.service.ts`

**Method:** `createMembership(createDto: CreateMembershipDto)`

**Lines:** 210-237

```typescript
async createMembership(createDto: CreateMembershipDto): Promise<Membership> {
  // Check if salon exists
  const salon = await this.salonsRepository.findOne({ where: { id: createDto.salonId } });
  if (!salon) {
    throw new NotFoundException(`Salon with ID ${createDto.salonId} not found`);
  }

  // Check if salon already has an active membership
  const existingMembership = await this.membershipsRepository.findOne({
    where: { salonId: createDto.salonId },
    order: { createdAt: 'DESC' },
  });

  if (existingMembership && existingMembership.status === MembershipStatus.ACTIVE) {
    throw new BadRequestException('Salon already has an active membership');
  }

  // Generate membership number if not provided
  const membershipNumber = createDto.membershipNumber || this.generateMembershipNumber();

  const membership = this.membershipsRepository.create({
    ...createDto,
    membershipNumber,
    status: createDto.status || MembershipStatus.NEW,
  });

  return this.membershipsRepository.save(membership);
}
```

**What it does:**
- ✅ Verifies salon exists
- ✅ Prevents duplicate active memberships
- ✅ Generates membership number
- ✅ Creates membership linked to salon via `salonId`

---

## 🔗 Database Relationships

### Entity Relationships

**Salon Entity:**
```typescript
// backend/src/salons/entities/salon.entity.ts
@Entity('salons')
export class Salon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_id' })
  ownerId: string;  // Links to User

  // ... other fields
}
```

**Membership Entity:**
```typescript
// backend/src/memberships/entities/membership.entity.ts
@Entity('memberships')
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Salon)
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Column({ name: 'salon_id' })
  salonId: string;  // ← THIS LINKS TO SALON

  // ... other fields
}
```

**Database Schema:**
```sql
-- salons table
CREATE TABLE salons (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES users(id),
  name VARCHAR(255),
  -- ... other fields
);

-- memberships table
CREATE TABLE memberships (
  id UUID PRIMARY KEY,
  salon_id UUID REFERENCES salons(id),  -- ← FOREIGN KEY LINK
  status VARCHAR(32),
  membership_number VARCHAR(128),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  -- ... other fields
);
```

---

## ✅ Summary

### Where Verification Happens:

1. **Before Salon Creation:**
   - **File:** `backend/src/salons/salons.controller.ts`
   - **Lines:** 34-42
   - **Method:** `create()` in `SalonsController`
   - **Checks:** User must have approved membership application

### Where Linking Happens:

1. **After Salon Creation:**
   - **File:** `backend/src/salons/salons.service.ts`
   - **Lines:** 24-34
   - **Method:** `create()` in `SalonsService`
   - **Action:** Automatically creates membership linked to salon

### The Connection:

```
User Creates Salon
    ↓
Controller verifies membership (checkMembershipStatus)
    ↓
Service creates salon
    ↓
Service auto-creates membership (createMembership)
    ↓
Membership.salonId = Salon.id  ← LINKED HERE
```

---

## 🧪 Testing the Link

### Verify Salon-Membership Link:

```sql
-- Check if salon has linked membership
SELECT 
  s.id as salon_id,
  s.name as salon_name,
  m.id as membership_id,
  m.status as membership_status,
  m.membership_number
FROM salons s
LEFT JOIN memberships m ON m.salon_id = s.id
WHERE s.id = 'your-salon-id';
```

### Verify Verification Works:

```bash
# Try to create salon without approved membership
# Should get error:
# "You must be an approved member of the association to create salons"
```

---

**Last Updated:** Based on current codebase analysis
**Status:** ✅ Verification and Linking Fully Implemented

