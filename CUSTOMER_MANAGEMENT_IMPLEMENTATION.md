# Customer Management System Implementation

## Overview

This document describes the comprehensive customer management system implemented for salons. The system provides salon-specific customer tracking, analytics, segmentation, and CRM features.

## ✅ Completed Features

### 1. Salon-Specific Customer Filtering ✅
- **Endpoint**: `GET /salons/:salonId/customers`
- **Features**:
  - Filter customers by salon (only shows customers who have visited that salon)
  - Advanced search by name, phone, email
  - Filter by tags, visit count, total spent, days since last visit
  - Sorting options (last visit, total spent, visit count, name)
  - Pagination support

### 2. Customer Visit Tracking Per Salon ✅
- **Automatic Tracking**:
  - Visit count increments when sales are made
  - Last visit date updates automatically
  - First visit date recorded
  - Total spent per salon tracked
- **Database**: `salon_customers` table stores salon-specific customer data
- **Integration**: Automatically records visits when:
  - Sales are created (via SalesService)
  - Appointments are completed (via AppointmentsService)

### 3. Customer Segmentation and Tags ✅
- **Features**:
  - Add/remove tags per customer per salon
  - Salon-specific notes
  - Custom preferences per salon
  - Endpoints:
    - `POST /salons/:salonId/customers/:customerId/tags` - Add tags
    - `DELETE /salons/:salonId/customers/:customerId/tags` - Remove tags
    - `PATCH /salons/:salonId/customers/:customerId` - Update notes, preferences, etc.

### 4. Customer Communication History ✅
- **Entity**: `CustomerCommunication`
- **Features**:
  - Track SMS, Email, Phone, and In-App communications
  - Record communication purpose (appointment reminder, marketing, follow-up, etc.)
  - Status tracking (pending, sent, delivered, failed)
  - Endpoints:
    - `GET /salons/:salonId/customers/:customerId/communications` - Get history
    - `POST /salons/:salonId/customers/:customerId/communications` - Record communication

### 5. Advanced Customer Analytics ✅
- **Endpoint**: `GET /salons/:salonId/customers/analytics`
- **Metrics**:
  - Total customers
  - Active customers (visited in last 30 days)
  - New customers (first visit in last 30 days)
  - Churned customers (no visit in last 90 days)
  - Average Customer Lifetime Value (CLV)
  - Average visit frequency
  - Top customers by spending

### 6. Customer Export Functionality ✅
- **Endpoint**: `GET /salons/:salonId/customers/export`
- **Format**: CSV export
- **Includes**: Name, phone, email, visit count, total spent, last visit, first visit, tags, notes

### 7. Salon-Specific Customer Preferences ✅
- **Storage**: JSONB field in `salon_customers` table
- **Features**:
  - Preferred employee
  - Allergies/sensitivities
  - Special requests
  - Preferred appointment times
  - Any custom preferences

### 8. Customer Activity Timeline ✅
- **Endpoint**: `GET /salons/:salonId/customers/:customerId/timeline`
- **Features**:
  - Unified view of all customer activities
  - Sales and appointments in chronological order
  - Shows date, type, title, and description
  - Sorted by date (newest first)

### 9. Enhanced Search and Filtering ✅
- **Search**: By name, phone, email
- **Filters**:
  - By tags (multiple selection)
  - Minimum visit count
  - Minimum total spent
  - Days since last visit (for churn detection)
- **Sorting**: Multiple options with ascending/descending order
- **Pagination**: Configurable page size

### 10. CRM Features ✅
- **Birthday Tracking**: Store and display customer birthdays
- **Anniversary Tracking**: Track first visit anniversary
- **Follow-up Reminders**: Set follow-up dates
- **Communication Preferences**: Store customer communication preferences
- **Notes**: Salon-specific notes about customers

## Database Schema

### New Tables

1. **salon_customers**
   - Stores salon-specific customer data
   - Tracks visits, spending, tags, notes, preferences
   - Unique constraint on (salon_id, customer_id)

2. **customer_communications**
   - Tracks all communications with customers
   - Stores type, purpose, status, metadata

### Migration Files

1. `backend/migrations/create_salon_customers_table.sql`
   - Creates `salon_customers` table
   - Migrates existing data from sales and appointments
   - Creates necessary indexes

2. `backend/migrations/create_customer_communications_table.sql`
   - Creates `customer_communications` table
   - Creates indexes for efficient querying

## Backend Implementation

### New Services

1. **SalonCustomerService** (`backend/src/customers/salon-customer.service.ts`)
   - Manages salon-customer relationships
   - Handles visit tracking
   - Provides analytics
   - Exports customer data

2. **CustomerCommunicationService** (`backend/src/customers/customer-communication.service.ts`)
   - Manages communication history
   - Tracks communication status

### New Entities

1. **SalonCustomer** (`backend/src/customers/entities/salon-customer.entity.ts`)
2. **CustomerCommunication** (`backend/src/customers/entities/customer-communication.entity.ts`)

### Updated Services

1. **SalesService**: Automatically records customer visits when sales are created
2. **AppointmentsService**: Records visits when appointments are completed

### New Endpoints

All endpoints are under `/salons/:salonId/customers`:

- `GET /salons/:salonId/customers` - List customers with filtering
- `GET /salons/:salonId/customers/analytics` - Get analytics
- `GET /salons/:salonId/customers/:customerId/timeline` - Get activity timeline
- `PATCH /salons/:salonId/customers/:customerId` - Update customer data
- `POST /salons/:salonId/customers/:customerId/tags` - Add tags
- `DELETE /salons/:salonId/customers/:customerId/tags` - Remove tags
- `GET /salons/:salonId/customers/export` - Export to CSV
- `GET /salons/:salonId/customers/:customerId/communications` - Get communications
- `POST /salons/:salonId/customers/:customerId/communications` - Record communication

## Frontend Implementation

### New Pages

1. **Salon Customers List** (`web/app/(dashboard)/salons/[id]/customers/page.tsx`)
   - Displays all customers for a salon
   - Advanced filtering and search
   - Analytics dashboard
   - Export functionality

2. **Customer Detail Page** (`web/app/(dashboard)/salons/[id]/customers/[customerId]/page.tsx`)
   - Customer overview
   - Activity timeline
   - Communication history
   - Tag management
   - Notes and preferences editing

### Features

- Real-time search and filtering
- Tag management UI
- Activity timeline visualization
- Communication history tracking
- Export to CSV
- Analytics dashboard with key metrics

## Setup Instructions

### 1. Run Database Migrations

```bash
# Connect to your PostgreSQL database and run:
psql -U your_user -d your_database -f backend/migrations/create_salon_customers_table.sql
psql -U your_user -d your_database -f backend/migrations/create_customer_communications_table.sql
```

### 2. Update TypeORM Configuration

The new entities are already registered in `CustomersModule`. Ensure your TypeORM configuration includes:

```typescript
entities: [
  // ... other entities
  'dist/customers/entities/salon-customer.entity.js',
  'dist/customers/entities/customer-communication.entity.js',
]
```

### 3. Restart Backend

```bash
cd backend
npm run start:dev
```

### 4. Access Frontend

Navigate to:
- Salon Customers: `/salons/[salonId]/customers`
- Customer Detail: `/salons/[salonId]/customers/[customerId]`

## Usage Examples

### Adding a Tag to a Customer

```typescript
POST /salons/{salonId}/customers/{customerId}/tags
{
  "tags": ["VIP", "Regular"]
}
```

### Recording a Communication

```typescript
POST /salons/{salonId}/customers/{customerId}/communications
{
  "type": "sms",
  "purpose": "appointment_reminder",
  "subject": "Appointment Reminder",
  "message": "Your appointment is tomorrow at 2 PM",
  "recipient": "+250788123456"
}
```

### Getting Customer Analytics

```typescript
GET /salons/{salonId}/customers/analytics
```

Returns:
```json
{
  "totalCustomers": 150,
  "activeCustomers": 45,
  "newCustomers": 12,
  "churnedCustomers": 8,
  "averageCLV": 125000,
  "averageVisitFrequency": 3.2,
  "topCustomers": [...]
}
```

## Key Benefits

1. **Salon-Specific Data**: Each salon only sees their own customers
2. **Automatic Tracking**: Visits are tracked automatically when sales/appointments occur
3. **Rich Analytics**: Comprehensive insights into customer behavior
4. **Segmentation**: Easy customer categorization with tags
5. **Communication History**: Track all customer interactions
6. **Export Capability**: Easy data export for marketing/analysis
7. **CRM Features**: Birthday tracking, follow-ups, notes

## Future Enhancements

Potential improvements:
- Email/SMS integration for automated communications
- Customer satisfaction surveys
- Review/rating system
- Automated birthday/anniversary messages
- Customer retention campaigns
- Advanced reporting and dashboards
- Customer lifetime value predictions

## Notes

- All endpoints require authentication
- Salon owners and employees can only access their own salon's customers
- Admins can access all salons' customer data
- Visit tracking is automatic and cannot be manually adjusted (ensures data integrity)
- Communication history is read-only (status updates can be made via update endpoint)

