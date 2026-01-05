# Customer Lifecycle and Rewards Flow - Technical Analysis Report

**Date:** December 2024  
**System:** Salon Management Platform  
**Scope:** End-to-end customer journey and loyalty rewards implementation

---

## Executive Summary

This report analyzes the customer lifecycle and rewards system in the salon management platform. The investigation reveals that while the system has infrastructure for loyalty points (data model, UI display), **the core functionality for earning and redeeming rewards is not implemented**. Points are stored but never automatically updated, and no redemption mechanism exists.

**Critical Finding:** The loyalty points system is **non-functional** - customers cannot earn or redeem points despite the UI displaying point balances.

---

## 1. Customer Lifecycle Flow

### 1.1 Registration and Onboarding

**Flow:**

1. Customer visits `/register` page
2. Fills registration form (email, password, fullName, phone)
3. System creates **User** account with `CUSTOMER` role
4. User is automatically logged in
5. Redirected to `/dashboard`

**Key Implementation:**

- **File:** `backend/src/auth/auth.service.ts`
- **Method:** `register()` - Creates user with default `CUSTOMER` role
- **Important:** Customer record is **NOT** created at registration

### 1.2 Customer Record Creation

**Customer records are created automatically when:**

1. **First Sale:**
   - Salon employee creates sale and links customer
   - System checks if customer exists (by phone/email)
   - If not found, creates customer record
   - Links to user account via `userId` if user exists

2. **First Appointment:**
   - Customer books appointment
   - System creates customer record if missing
   - Links to user account

3. **Manual Creation:**
   - Admin/salon owner can create customer records manually
   - Can link to existing user account

**Implementation:**

- **File:** `backend/src/customers/customers.controller.ts`
- **Method:** `findByUserId()` - Auto-creates customer record for CUSTOMER role users
- **File:** `backend/src/sales/sales.service.ts`
- **Method:** `create()` - Links customer to sale, creates record if needed

### 1.3 Key Touchpoints for Rewards Tracking

The system tracks customer activity at these points:

1. **Sales Completion:**
   - **File:** `backend/src/sales/sales.service.ts:64-84`
   - Calls `salonCustomerService.recordVisit()` after sale creation
   - Updates `visitCount`, `totalSpent`, `lastVisitDate`, `firstVisitDate`
   - **Location:** `backend/src/customers/salon-customer.service.ts:66-113`

2. **Appointment Completion:**
   - **File:** `backend/src/appointments/appointments.service.ts:326-341`
   - Calls `salonCustomerService.recordAppointmentVisit()` when status = `completed`
   - Updates visit statistics
   - **Location:** `backend/src/customers/salon-customer.service.ts:119-168`

3. **Customer Statistics:**
   - Visit count, total spent, average order value tracked per salon
   - Stored in `salon_customers` table (salon-specific customer data)

**Data Model:**

- **Customer Entity:** `backend/src/customers/entities/customer.entity.ts`
  - `loyaltyPoints: number` (integer, default: 0)
  - Linked to User via `userId`
- **SalonCustomer Entity:** `backend/src/customers/entities/salon-customer.entity.ts`
  - `visitCount: number`
  - `totalSpent: decimal`
  - `lastVisitDate: timestamp`
  - `firstVisitDate: timestamp`
  - `tags: string[]` (e.g., ['VIP', 'Regular', 'New'])

---

## 2. Rewards Earning Rules

### 2.1 Current Implementation Status

**❌ CRITICAL GAP: No automatic points earning logic exists**

**What Exists:**

- `Customer.loyaltyPoints` field in database (integer, default: 0)
- UI displays points balance in multiple locations
- VIP badge shown when `loyaltyPoints >= 1000`

**What's Missing:**

- No code that increments `loyaltyPoints` when sales are completed
- No code that increments `loyaltyPoints` when appointments are completed
- No business rules defining points per transaction amount
- No tiered earning rates (basic vs VIP)
- No bonus points for referrals, feedback, or promotions

### 2.2 Where Points Should Be Earned (But Aren't)

**Expected Touchpoints (Not Implemented):**

1. **On Sale Completion:**
   - **Location:** `backend/src/sales/sales.service.ts:64-84`
   - **Current:** Only records visit statistics
   - **Missing:** Points calculation and update
   - **Expected Logic:** `pointsEarned = (saleAmount / pointsPerCurrency) * multiplier`

2. **On Appointment Completion:**
   - **Location:** `backend/src/appointments/appointments.service.ts:326-341`
   - **Current:** Only records visit statistics
   - **Missing:** Points calculation and update

3. **On Payment Success:**
   - **Current:** Points should be granted after payment confirmation
   - **Missing:** No validation step before granting points

### 2.3 Business Rules (Not Implemented)

**No business rules are defined or enforced:**

- Points per currency unit (e.g., 1 point per RWF 100)
- Minimum transaction amount for points
- Maximum points per transaction
- Tiered earning rates (VIP customers earn more)
- Bonus multipliers for specific services/products
- Referral bonuses
- First-time customer bonuses
- Birthday/anniversary bonuses

---

## 3. Rewards Data Model and Storage

### 3.1 Database Schema

**Customer Table (`customers`):**

```typescript
{
  id: uuid (PK)
  user_id: uuid (FK to users, nullable)
  full_name: string
  phone: string (indexed)
  email: string
  loyalty_points: integer (default: 0)  // ⚠️ Stored but never updated
  preferences: json
  created_at: timestamp
  updated_at: timestamp
}
```

**SalonCustomer Table (`salon_customers`):**

```typescript
{
  id: uuid (PK)
  salon_id: uuid (FK)
  customer_id: uuid (FK)
  visit_count: integer (default: 0)
  total_spent: decimal (default: 0)
  last_visit_date: timestamp
  first_visit_date: timestamp
  tags: string[] (e.g., ['VIP'])
  notes: text
  preferences: json
}
```

### 3.2 Data Linking

**Customer-to-User:**

- `Customer.userId` links to `User.id`
- Allows customers to view their data when logged in
- One-to-one relationship (nullable)

**Customer-to-Transactions:**

- `Sale.customerId` links to `Customer.id`
- `Appointment.customerId` links to `Customer.id`
- Many-to-one relationship

**Rewards-to-Transactions:**

- **❌ NO LINKING EXISTS**
- No transaction history table for points
- No audit trail of points earned/spent
- No reference to source transaction (sale/appointment ID)

### 3.3 Balance Calculation

**Current Implementation:**

- Points balance is **persisted** in `Customer.loyaltyPoints`
- Balance is **static** - never changes after initial creation
- No real-time calculation from transactions
- No transaction history to recalculate from

**Expected Implementation (Missing):**

- Points transaction table to track all earning/redemption events
- Ability to recalculate balance from transaction history
- Audit trail for compliance and debugging

---

## 4. Redemption and Usage

### 4.1 Current Implementation Status

**❌ CRITICAL GAP: No redemption mechanism exists**

**What Exists:**

- `SaleItem.discountAmount` field for discounts
- UI allows manual discount entry in POS
- Discounts are applied to sale items

**What's Missing:**

- No code that deducts points when discounts are applied
- No validation that customer has sufficient points
- No minimum points threshold for redemption
- No expiration logic for points
- No restrictions (per service, per branch, per time period)
- No conversion rate (e.g., 100 points = RWF 10 discount)

### 4.2 Where Redemption Should Happen (But Doesn't)

**Expected Touchpoints (Not Implemented):**

1. **During Sale Creation:**
   - **Location:** `web/app/(dashboard)/sales/page.tsx:1143-1168`
   - **Current:** Manual discount entry (not linked to points)
   - **Missing:** "Redeem Points" option
   - **Missing:** Automatic points deduction

2. **Discount Application:**
   - **Location:** `backend/src/sales/sales.service.ts`
   - **Current:** Discounts stored but not validated against points
   - **Missing:** Points balance check before applying discount
   - **Missing:** Points deduction after discount applied

### 4.3 Validation Logic (Not Implemented)

**No validation exists for:**

- Sufficient points balance
- Minimum points required (e.g., must redeem in increments of 100)
- Points expiration (no expiration date field)
- Service/branch restrictions
- Maximum discount per transaction
- Points cannot be negative

### 4.4 Redemption Impact (Not Implemented)

**Missing Functionality:**

- Points deduction from `Customer.loyaltyPoints`
- Transaction record of redemption
- Link between discount and points used
- Audit trail for redemptions

---

## 5. Customer-Facing Experience

### 5.1 Points Display

**Where Points Are Shown:**

1. **Customer Dashboard:**
   - **File:** `web/components/dashboards/CustomerDashboard.tsx:247-255`
   - Displays `customer.loyaltyPoints` with star icon
   - Shows "Loyalty Points" label
   - **Issue:** Points never change (always 0 or initial value)

2. **Customer Profile Page:**
   - **File:** `web/app/(dashboard)/profile/page.tsx:149-156`
   - Shows points balance
   - Message: "Earn points with every purchase and redeem them for discounts!"
   - **Issue:** Message is misleading - points cannot be earned or redeemed

3. **Customer List (Admin View):**
   - **File:** `web/app/(dashboard)/customers/page.tsx:432-437`
   - VIP badge shown if `loyaltyPoints >= 1000`
   - **Issue:** No way to reach 1000 points

4. **Salon Customer Detail:**
   - **File:** `web/app/(dashboard)/salons/[id]/customers/[customerId]/page.tsx:327-341`
   - Displays customer's loyalty points
   - **Issue:** Static value, never updates

### 5.2 UI/UX Issues

**Inconsistencies:**

1. **Misleading Messaging:**
   - UI says "Earn points with every purchase" but points are never earned
   - No indication that rewards system is non-functional

2. **No Earning Indicators:**
   - No "You earned X points!" notification after purchase
   - No points breakdown in receipt
   - No progress bar to next reward tier

3. **No Redemption Interface:**
   - No "Redeem Points" button in POS
   - No way to see how many points needed for discount
   - No redemption history

4. **VIP Status Confusion:**
   - VIP badge shown at 1000 points
   - No way to earn 1000 points
   - No explanation of VIP benefits

### 5.3 Backend vs Frontend Mismatch

**Frontend Assumptions:**

- Points can be earned (displayed, tracked)
- Points can be redeemed (mentioned in UI)
- VIP status is meaningful (badge shown)

**Backend Reality:**

- Points are never incremented
- No redemption endpoints exist
- VIP status is cosmetic only

---

## 6. Gaps, Inconsistencies, and Bugs

### 6.1 Critical Gaps

1. **No Points Earning Logic:**
   - Points field exists but is never updated
   - No business rules implemented
   - Customers cannot earn points

2. **No Points Redemption Logic:**
   - No way to convert points to discounts
   - Discounts exist but are manual only
   - No validation or deduction

3. **No Transaction History:**
   - No audit trail of points earned/spent
   - Cannot recalculate balance
   - No compliance tracking

4. **No Business Rules:**
   - No earning rates defined
   - No redemption rates defined
   - No tiered benefits
   - No expiration policies

### 6.2 Inconsistencies

1. **UI Promises vs Reality:**
   - UI suggests points can be earned/redeemed
   - Backend has no implementation
   - Misleading customer experience

2. **VIP Status:**
   - Badge shown at 1000 points
   - No way to reach 1000 points
   - No benefits defined for VIP

3. **Data Model vs Usage:**
   - Points field exists and is displayed
   - But field is never written to (except manual admin updates)

### 6.3 Potential Bugs

1. **Points Balance Staleness:**
   - If points were manually updated, balance could be incorrect
   - No way to verify balance accuracy

2. **Race Conditions (If Implemented):**
   - Multiple concurrent sales could cause incorrect point calculations
   - No locking mechanism for balance updates

3. **Negative Balance (If Redemption Implemented):**
   - No validation to prevent negative points
   - Could allow over-redemption

---

## 7. Recommended Improvements

### 7.1 Immediate Fixes (Critical)

1. **Implement Points Earning:**

   ```typescript
   // In SalesService.create() after sale creation:
   if (sale.customerId) {
     const pointsEarned = Math.floor(sale.totalAmount / 100); // 1 point per RWF 100
     await this.customersService.addPoints(sale.customerId, pointsEarned, {
       source: "sale",
       saleId: sale.id,
       amount: sale.totalAmount,
     });
   }
   ```

2. **Create Points Transaction Table:**

   ```sql
   CREATE TABLE loyalty_point_transactions (
     id UUID PRIMARY KEY,
     customer_id UUID REFERENCES customers(id),
     points INTEGER NOT NULL, -- positive for earned, negative for redeemed
     balance_after INTEGER NOT NULL,
     source_type VARCHAR(50), -- 'sale', 'appointment', 'redemption', 'bonus'
     source_id UUID, -- sale_id, appointment_id, etc.
     description TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

3. **Implement Points Redemption:**
   ```typescript
   // In SalesService, before creating sale:
   if (redemptionRequest?.pointsToRedeem > 0) {
     const customer = await this.customersService.findOne(sale.customerId);
     if (customer.loyaltyPoints < redemptionRequest.pointsToRedeem) {
       throw new BadRequestException("Insufficient points");
     }
     const discountAmount = redemptionRequest.pointsToRedeem * 0.1; // 100 points = RWF 10
     // Apply discount and deduct points
   }
   ```

### 7.2 Business Rules Implementation

1. **Configurable Earning Rates:**
   - Store rates in database (config table)
   - Support tiered rates (VIP earns 2x)
   - Support service/product-specific multipliers

2. **Redemption Rules:**
   - Minimum points threshold (e.g., 100 points minimum)
   - Conversion rate (e.g., 100 points = RWF 10)
   - Maximum discount per transaction
   - Expiration policy (points expire after 12 months)

3. **Tiered Benefits:**
   - Define tiers (Bronze, Silver, Gold, VIP)
   - Different earning rates per tier
   - Different redemption rates per tier
   - Automatic tier upgrades

### 7.3 Data Model Enhancements

1. **Points Transaction History:**
   - Track all earning/redemption events
   - Enable balance recalculation
   - Provide audit trail

2. **Points Expiration:**
   - Add `pointsExpirationDate` to Customer
   - Track expiration per transaction
   - Auto-deduct expired points

3. **Redemption Tracking:**
   - Link discounts to points used
   - Store redemption details in sale metadata
   - Track redemption history

### 7.4 UX Improvements

1. **Earning Feedback:**
   - Show "You earned X points!" notification after purchase
   - Display points breakdown in receipt
   - Show progress to next tier

2. **Redemption Interface:**
   - Add "Redeem Points" button in POS
   - Show available points and discount amount
   - Display redemption history

3. **Transparency:**
   - Explain earning rules clearly
   - Show redemption rates
   - Display expiration dates
   - Provide points transaction history

4. **Remove Misleading Messages:**
   - Update UI text to reflect actual functionality
   - Or implement the functionality to match UI promises

### 7.5 Technical Improvements

1. **Atomic Operations:**
   - Use database transactions for points updates
   - Prevent race conditions
   - Ensure data consistency

2. **Validation:**
   - Validate points balance before redemption
   - Prevent negative balances
   - Validate expiration dates

3. **Error Handling:**
   - Graceful degradation if points system fails
   - Don't block sales if points update fails
   - Log all points operations

4. **Performance:**
   - Index `customer_id` in points transaction table
   - Cache customer points balance (with invalidation)
   - Batch points updates if needed

---

## 8. Implementation Priority

### Phase 1: Critical (Immediate)

1. ✅ Implement basic points earning on sale completion
2. ✅ Create points transaction table
3. ✅ Implement basic points redemption
4. ✅ Add validation and error handling

### Phase 2: Essential (Short-term)

1. ✅ Points earning on appointment completion
2. ✅ Redemption UI in POS
3. ✅ Points transaction history view
4. ✅ Earning/redemption notifications

### Phase 3: Enhancement (Medium-term)

1. ✅ Configurable earning rates
2. ✅ Tiered benefits system
3. ✅ Points expiration
4. ✅ Referral bonuses

### Phase 4: Advanced (Long-term)

1. ✅ Promotional campaigns
2. ✅ Birthday/anniversary bonuses
3. ✅ Points sharing/gifting
4. ✅ Analytics and reporting

---

## 9. Conclusion

The salon management system has **infrastructure for a loyalty rewards program** (data model, UI display) but **lacks the core functionality** to make it operational. Customers cannot earn or redeem points, despite the UI suggesting otherwise.

**Key Findings:**

- Points are stored but never automatically updated
- No earning logic exists
- No redemption mechanism exists
- No transaction history or audit trail
- UI is misleading about functionality

**Impact:**

- Poor customer experience (expectations not met)
- Potential trust issues (system appears broken)
- Missed revenue opportunity (loyalty programs drive retention)

**Recommendation:**
Implement the rewards system fully or remove misleading UI elements. The current state creates false expectations and damages user trust.

---

**Report Generated:** December 2024  
**Next Review:** After implementation of Phase 1 improvements
