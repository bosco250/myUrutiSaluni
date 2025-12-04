# Customer Access Guide

This document explains how customers access and use the Salon Association system.

## Overview

The system has two separate entities:
1. **User** - Authentication account (email, password, role)
2. **Customer** - Customer profile record (purchase history, loyalty points, appointments)

**Important**: A user with `CUSTOMER` role does NOT automatically have a customer record. Customer records are created when:
- A customer makes their first purchase at a salon
- A customer books their first appointment
- An admin/salon owner manually creates a customer record

## Customer Access Flow

### Step 1: Registration

**URL**: `/register`

**Process**:
1. Customer visits the registration page
2. Fills out the form with:
   - Email (required)
   - Password (required, min 6 characters)
   - Full Name (required)
   - Phone (optional)
3. Submits the form
4. System creates a **User** account with `CUSTOMER` role by default
5. User is automatically logged in
6. Redirected to `/dashboard`

**Note**: At this point, the user has a User account but NO Customer record yet.

### Step 2: Login

**URL**: `/login`

**Process**:
1. Customer visits the login page
2. Enters email and password
3. System authenticates and returns JWT token
4. Redirected to `/dashboard`

**Alternative**: Customers can also login with phone number via `/auth/login/phone` endpoint.

### Step 3: Dashboard Access

**URL**: `/dashboard`

**What Customers See**:
- **If Customer Record Exists**: 
  - Customer profile information
  - Statistics (total spent, visits, average order, favorite salon)
  - Recent purchases
  - Upcoming appointments
  - Loyalty points

- **If NO Customer Record Exists**:
  - Welcome message
  - Message explaining customer profile will be created on first purchase/appointment
  - Membership application option (if they want to become salon owners)

### Step 4: Customer Record Creation

Customer records are created automatically when:

1. **Making a Purchase**:
   - Customer visits a salon
   - Salon employee creates a sale and selects/links the customer
   - System creates customer record if it doesn't exist
   - Links customer record to user account via `userId`

2. **Booking an Appointment**:
   - Customer books an appointment at a salon
   - System creates customer record if it doesn't exist
   - Links customer record to user account

3. **Manual Creation** (by Admin/Salon Owner):
   - Admin or salon owner can create customer records manually
   - Can link to existing user account via `userId`

## Customer Dashboard Features

Once a customer record exists, customers can access:

### 1. Customer Profile
- View their name, phone, email
- See loyalty points balance

### 2. Statistics
- **Total Spent**: Sum of all purchases
- **Total Visits**: Number of purchases/appointments
- **Average Order Value**: Total spent / visits
- **Favorite Salon**: Salon with most visits

### 3. Purchase History
- View recent purchases (last 5)
- See purchase details:
  - Salon name
  - Date and time
  - Total amount
  - Payment method
  - Items purchased
- Link to view all sales history

### 4. Appointments
- View upcoming appointments (next 5)
- See appointment details:
  - Service name
  - Salon name
  - Date and time
  - Status (booked, confirmed, etc.)
- Link to view all appointments

## API Endpoints for Customers

### Authentication
- `POST /auth/register` - Register new account
- `POST /auth/login` - Login with email/password
- `POST /auth/login/phone` - Login with phone/password
- `GET /auth/profile` - Get current user profile

### Customer Data
- `GET /customers/by-user/:userId` - Get customer record by user ID
- `GET /sales/customer/:customerId` - Get customer's sales history
- `GET /sales/customer/:customerId/statistics` - Get customer statistics
- `GET /appointments/customer/:customerId` - Get customer's appointments

## Role-Based Access

### Customer Role Permissions
- ✅ View own customer profile
- ✅ View own purchase history
- ✅ View own appointments
- ✅ View own statistics
- ✅ Apply for membership (to become salon owner)
- ❌ Cannot create salons
- ❌ Cannot manage employees
- ❌ Cannot access other customers' data

## Troubleshooting

### Issue: "Customer Profile Not Found" on Dashboard

**Cause**: User has a User account but no Customer record yet.

**Solution**: 
- Customer record will be created automatically on first purchase or appointment
- Or admin/salon owner can manually create customer record and link to user

### Issue: Cannot See Purchase History

**Cause**: 
- No customer record exists
- Customer record not linked to user account (`userId` is null)

**Solution**:
- Ensure customer record exists
- Ensure `userId` field in customer record matches user's ID

## Best Practices

1. **For New Customers**:
   - Register account first
   - Make first purchase or book appointment
   - Customer record will be auto-created

2. **For Salon Owners/Employees**:
   - When creating a sale, search for customer by phone/email
   - If customer has user account, link customer record to user
   - This enables customer to see their history on dashboard

3. **For Admins**:
   - Can manually create customer records
   - Should link customer records to user accounts when possible
   - This provides better customer experience

## Future Enhancements

Potential improvements:
1. Auto-create customer record on registration (optional)
2. Customer self-service profile creation
3. Customer can update their own profile
4. Email notifications for purchases/appointments
5. Customer can book appointments directly from dashboard

