# Comprehensive Functional Requirements Specification (FRS)
## URUTI Saluni Platform - Complete System Analysis

**Document Version:** 2.0  
**Last Updated:** January 2026  
**Status:** Production-Ready System Analysis  
**Scope:** Backend API, Web Application, Mobile Application

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [User Roles & Permission System](#3-user-roles--permission-system)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Salon Management System](#5-salon-management-system)
6. [Customer Management & CRM](#6-customer-management--crm)
7. [Service & Product Management](#7-service--product-management)
8. [Appointment Scheduling System](#8-appointment-scheduling-system)
9. [Point of Sale (POS) System](#9-point-of-sale-pos-system)
10. [Inventory Management](#10-inventory-management)
11. [Employee Management & HR](#11-employee-management--hr)
12. [Financial Management & Accounting](#12-financial-management--accounting)
13. [Micro-Lending System](#13-micro-lending-system)
14. [Digital Wallet System](#14-digital-wallet-system)
15. [Airtel Integration](#15-airtel-integration)
16. [Membership Management](#16-membership-management)
17. [Loyalty & Rewards System](#17-loyalty--rewards-system)
18. [Communication & Notifications](#18-communication--notifications)
19. [Reporting & Analytics](#19-reporting--analytics)
20. [Mobile Application Features](#20-mobile-application-features)
21. [Web Application Features](#21-web-application-features)
22. [Integration & API Features](#22-integration--api-features)
23. [Security & Compliance](#23-security--compliance)
24. [Performance & Scalability](#24-performance--scalability)
25. [Data Management](#25-data-management)

---

## 1. Executive Summary

### 1.1 Platform Overview

URUTI Saluni is a comprehensive digital ecosystem designed for salon associations and beauty businesses in Rwanda. The platform integrates salon operations, membership management, financial services, and micro-lending into a unified system.

### 1.2 Technology Stack

**Backend:**
- Framework: NestJS 10.x with TypeScript
- Database: PostgreSQL 14+ (SQLite for development)
- ORM: TypeORM 0.3.x
- Authentication: JWT with passport-jwt
- API Documentation: Swagger/OpenAPI

**Web Application:**
- Framework: Next.js 14.x with React 18.x
- Styling: Tailwind CSS
- State Management: Zustand
- Data Fetching: React Query
- Forms: React Hook Form

**Mobile Application:**
- Framework: React Native with Expo
- Navigation: React Navigation
- State Management: Context API + React Query
- Push Notifications: Expo Notifications

### 1.3 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Web App       │  │  Mobile App     │  │  Admin      │ │
│  │   (Next.js)     │  │  (React Native) │  │  Panel      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API Layer                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  NestJS Application Server (Port 3000)                 ││
│  │  - REST API Endpoints                                  ││
│  │  - JWT Authentication                                  ││
│  │  - Role-Based Access Control                           ││
│  │  - Business Logic Modules                              ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  PostgreSQL Database                                    ││
│  │  - 50+ Tables with Relationships                       ││
│  │  - ACID Transactions                                   ││
│  │  - Complex Queries & Reporting                         ││
│  │  - Audit Trails & Logging                              ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Integrations                      │
│  - Airtel Open API (Mobile Money)                          │
│  - SMS Providers (Twilio, etc.)                            │
│  - Email Services (SendGrid, AWS SES)                      │
│  - Push Notifications (Firebase/Expo)                      │
│  - Payment Gateways                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. System Architecture Overview

### 2.1 Core Modules

The system consists of 25+ integrated modules:

| Module | Purpose | Status |
|--------|---------|--------|
| **Authentication** | User login, registration, password management | ✅ Complete |
| **Users** | User account management | ✅ Complete |
| **Salons** | Salon business management | ✅ Complete |
| **Customers** | Customer relationship management | ✅ Complete |
| **Services** | Service catalog management | ✅ Complete |
| **Appointments** | Booking and scheduling system | ✅ Complete |
| **Sales** | Point of sale transactions | ✅ Complete |
| **Inventory** | Stock and product management | ✅ Complete |
| **Attendance** | Employee time tracking | ✅ Complete |
| **Accounting** | Double-entry bookkeeping | ✅ Complete |
| **Loans** | Micro-lending system | ✅ Complete |
| **Wallets** | Digital wallet management | ✅ Complete |
| **Airtel** | Mobile money integration | ✅ Complete |
| **Memberships** | Association membership | ✅ Complete |
| **Notifications** | Multi-channel messaging | ✅ Complete |
| **Reports** | Analytics and reporting | ✅ Complete |
| **Commissions** | Employee commission tracking | ✅ Complete |
| **Payroll** | Staff payment management | ✅ Complete |
| **Communications** | Customer communication history | ✅ Complete |
| **Reviews** | Customer feedback system | ✅ Complete |
| **Payments** | Payment processing | ✅ Complete |
| **Chat** | Real-time messaging | ✅ Complete |
| **Uploads** | File and document management | ✅ Complete |
| **Search** | Global search functionality | ✅ Complete |
| **Dashboard** | Analytics and KPIs | ✅ Complete |

### 2.2 Database Schema

**Core Tables (50+ tables):**

**User Management:**
- `users` - User accounts and authentication
- `salons` - Salon business entities
- `salon_employees` - Employee-salon relationships
- `customers` - Customer profiles

**Operations:**
- `services` - Service catalog
- `appointments` - Booking system
- `sales` - Transaction records
- `sale_items` - Transaction line items
- `products` - Inventory items
- `inventory_movements` - Stock tracking

**Financial:**
- `chart_of_accounts` - Accounting structure
- `journal_entries` - Double-entry records
- `journal_entry_lines` - Journal line items
- `invoices` - Invoice management
- `wallets` - Digital wallets
- `wallet_transactions` - Wallet activity

**Lending:**
- `loan_products` - Loan product definitions
- `loans` - Loan applications and management
- `loan_repayments` - Repayment schedules
- `credit_scores` - Credit assessment

**Integration:**
- `airtel_agents` - Airtel agent registrations
- `airtel_transactions` - Mobile money transactions
- `notifications` - Message delivery
- `audit_logs` - System activity tracking

---

## 3. User Roles & Permission System

### 3.1 Role Hierarchy

The system implements a sophisticated 6-tier role hierarchy:

| Level | Role | Description | Access Level |
|-------|------|-------------|--------------|
| 1 | `SUPER_ADMIN` | System administrator | Full system access |
| 2 | `ASSOCIATION_ADMIN` | Association management | Association-wide access |
| 3 | `DISTRICT_LEADER` | Regional oversight | District-level access |
| 4 | `SALON_OWNER` | Business owner | Salon-specific full access |
| 5 | `SALON_EMPLOYEE` | Staff member | Permission-based access |
| 6 | `CUSTOMER` | End user | Personal data access |

### 3.2 Employee Permission System

**Granular Permissions (30+ permissions):**

**Appointment Management:**
- `MANAGE_APPOINTMENTS` - Create, update, cancel appointments
- `ASSIGN_APPOINTMENTS` - Assign appointments to staff
- `VIEW_ALL_APPOINTMENTS` - View salon appointment calendar
- `MODIFY_APPOINTMENT_STATUS` - Change appointment status

**Customer Management:**
- `MANAGE_CUSTOMERS` - Create, update customer records
- `VIEW_CUSTOMER_HISTORY` - Access transaction history
- `VIEW_CUSTOMER_LOYALTY` - View loyalty points
- `UPDATE_CUSTOMER_INFO` - Modify customer data

**Sales & Financial:**
- `PROCESS_PAYMENTS` - Handle transactions
- `APPLY_DISCOUNTS` - Apply promotional discounts
- `VIEW_SALES_REPORTS` - Access sales analytics
- `VOID_TRANSACTIONS` - Cancel transactions

**Service & Product Management:**
- `MANAGE_SERVICES` - Service catalog management
- `MANAGE_PRODUCTS` - Product inventory management
- `UPDATE_SERVICE_PRICING` - Modify service prices
- `UPDATE_PRODUCT_PRICING` - Modify product prices

**Staff Management:**
- `MANAGE_EMPLOYEE_SCHEDULES` - Staff scheduling
- `VIEW_EMPLOYEE_PERFORMANCE` - Performance metrics
- `VIEW_EMPLOYEE_COMMISSIONS` - Commission tracking

**Inventory Management:**
- `MANAGE_INVENTORY` - Stock management
- `VIEW_INVENTORY_REPORTS` - Inventory analytics
- `PROCESS_STOCK_ADJUSTMENTS` - Stock adjustments

**Salon Operations:**
- `VIEW_SALON_SETTINGS` - Settings access (read-only)
- `UPDATE_SALON_SETTINGS` - Settings modification
- `MANAGE_BUSINESS_HOURS` - Operating hours
- `MANAGE_SALON_PROFILE` - Salon profile updates

### 3.3 Permission Management

**Permission Granting Process:**
1. Salon owners access employee management
2. Select specific permissions to grant
3. System creates permission records with audit trail
4. Employee receives notification
5. Permissions take effect immediately

**Permission Enforcement:**
- Backend: NestJS guards validate permissions on API endpoints
- Frontend: UI elements hidden/shown based on permissions
- Mobile: Screen access controlled by permission checks

---

## 4. Authentication & Authorization

### 4.1 Authentication Methods

**Supported Login Methods:**
- Email + Password
- Phone Number + Password
- JWT Token-based sessions

**Registration Process:**
1. User provides: email, password, full name, phone (optional), role
2. System validates email uniqueness
3. Password hashed with bcrypt (10 rounds)
4. Account created with specified role
5. Automatic login with JWT token generation

### 4.2 Password Management

**Password Reset Flow:**
1. User requests reset via email
2. System generates secure token (32-byte random)
3. Token hashed and stored with 1-hour expiration
4. Reset email sent with secure link
5. User clicks link, enters new password
6. Token validated and password updated

**Email Change Process:**
1. User requests email change
2. Verification token generated (15-minute expiration)
3. Verification email sent to current address
4. User clicks link, enters new email
5. System validates new email availability
6. Email updated with audit trail

### 4.3 Session Management

**JWT Token Structure:**
```json
{
  "email": "user@example.com",
  "phone": "+250788123456",
  "sub": "user-uuid",
  "role": "salon_owner",
  "iat": 1640995200,
  "exp": 1641081600
}
```

**Session Features:**
- Token stored in localStorage (web) / SecureStore (mobile)
- Automatic token injection in API requests
- 401 handling with automatic logout
- Session persistence across app restarts

---

## 5. Salon Management System

### 5.1 Salon Registration & Profile

**Salon Creation Requirements:**
- Business name (required)
- Owner assignment (required)
- Business type selection
- Target clientele (men/women/both)
- Contact information (phone, email, website)
- Physical address and location coordinates
- Business registration number
- Operating hours configuration

**Business Types Supported:**
- Hair Salon
- Beauty Spa
- Nail Salon
- Barbershop
- Full Service
- Mobile Salon

### 5.2 Salon Operations Management

**Location Management:**
- GPS coordinates for map display
- Address standardization
- City and district classification
- Service area definition

**Operating Hours:**
- Day-specific hours configuration
- Holiday schedule management
- Break time definitions
- Seasonal hour adjustments

**Salon Settings:**
- Business profile customization
- Service categories configuration
- Pricing structure setup
- Commission rate definitions

### 5.3 Multi-Salon Support

**Features:**
- Single owner can manage multiple salons
- Salon-specific data isolation
- Cross-salon reporting capabilities
- Centralized owner dashboard

**Data Segregation:**
- Employees assigned to specific salons
- Services and pricing per salon
- Customer data salon-specific
- Financial reporting per salon

---

## 6. Customer Management & CRM

### 6.1 Customer Profile System

**Customer Data Structure:**
- Personal information (name, phone, email)
- Salon-specific visit history
- Service preferences and allergies
- Communication preferences
- Birthday and anniversary tracking
- Custom notes per salon

**Salon-Customer Relationship:**
- Visit count tracking
- Total spending calculation
- First and last visit dates
- Customer lifetime value (CLV)
- Loyalty status determination

### 6.2 Customer Segmentation

**Segmentation Criteria:**
- Visit frequency (new, regular, VIP, churned)
- Spending levels (low, medium, high value)
- Service preferences
- Custom tags per salon
- Behavioral patterns

**Tag Management:**
- Custom tags per customer per salon
- Bulk tag operations
- Tag-based filtering and search
- Marketing campaign targeting

### 6.3 Customer Analytics

**Key Metrics:**
- Total customers per salon
- Active customers (30-day window)
- New customer acquisition rate
- Customer churn rate
- Average customer lifetime value
- Visit frequency analysis
- Revenue per customer

**Customer Timeline:**
- Unified activity view
- Sales and appointment history
- Communication history
- Service preferences evolution
- Loyalty point transactions

### 6.4 Communication History

**Communication Tracking:**
- SMS, email, phone, in-app messages
- Communication purpose categorization
- Delivery status tracking
- Response rate monitoring
- Follow-up scheduling

**Communication Types:**
- Appointment reminders
- Marketing campaigns
- Follow-up messages
- Birthday/anniversary wishes
- Service recommendations

---

## 7. Service & Product Management

### 7.1 Service Catalog

**Service Attributes:**
- Service name and description
- Category classification
- Duration in minutes
- Base pricing
- Target gender specification
- Skill requirements
- Equipment needs

**Service Categories:**
- Hair services (cut, color, styling)
- Nail services (manicure, pedicure, nail art)
- Makeup services (bridal, event, daily)
- Spa services (facial, massage, treatments)
- Barber services (cut, shave, beard)

### 7.2 Pricing Management

**Pricing Features:**
- Base price per service
- Salon-specific price overrides
- Dynamic pricing capabilities
- Discount management
- Package pricing
- Seasonal pricing adjustments

**Price Override System:**
- Service-specific overrides per salon
- Effective date ranges
- Automatic price updates
- Price history tracking

### 7.3 Service Availability

**Availability Rules:**
- Employee skill matching
- Equipment availability
- Time slot requirements
- Seasonal service availability
- Special occasion services

---

## 8. Appointment Scheduling System

### 8.1 Booking Flow

**3-Step Booking Process:**

**Step 1: Service Selection**
- Browse service catalog
- View service details and pricing
- Select desired service
- View service duration

**Step 2: Staff Selection**
- View available staff members
- Staff skill and rating display
- "No preference" option for maximum availability
- Staff availability preview

**Step 3: Date & Time Selection**
- Calendar view with availability
- Time slot grid (30-minute intervals)
- Real-time availability checking
- Alternative time suggestions

**Step 4: Confirmation**
- Booking summary review
- Customer notes addition
- Final confirmation
- Booking confirmation notification

### 8.2 Availability Management

**Availability Calculation:**
- Staff working hours
- Existing appointment conflicts
- Service duration requirements
- Break time considerations
- Equipment availability

**Real-time Updates:**
- Live availability checking
- Conflict prevention
- Automatic rescheduling suggestions
- Waitlist management

### 8.3 Appointment Status Management

**Status Workflow:**
```
booked → confirmed → in_progress → completed
  ↓         ↓           ↓
cancelled  cancelled   cancelled
  ↓
no_show
```

**Status Triggers:**
- Automatic confirmations
- Staff status updates
- Customer cancellations
- No-show detection
- Completion processing

### 8.4 Appointment Notifications

**Notification Types:**
- Booking confirmation
- Appointment reminders (24h, 2h before)
- Status change notifications
- Cancellation notices
- Rescheduling confirmations

**Multi-channel Delivery:**
- In-app notifications
- SMS messages
- Email notifications
- Push notifications (mobile)

---

## 9. Point of Sale (POS) System

### 9.1 Sales Transaction Processing

**Transaction Components:**
- Service sales
- Product sales
- Mixed transactions (services + products)
- Multiple payment methods
- Discount applications
- Tax calculations

**Payment Methods Supported:**
- Cash payments
- Mobile money (Airtel integration)
- Card payments
- Bank transfers
- Wallet payments
- Split payments

### 9.2 Sales Item Management

**Line Item Features:**
- Service or product selection
- Quantity specification
- Unit price display
- Discount application
- Line total calculation
- Employee assignment for commissions

**Discount System:**
- Percentage discounts
- Fixed amount discounts
- Service-specific discounts
- Customer loyalty discounts
- Promotional codes
- Manager override discounts

### 9.3 Commission Tracking

**Commission Calculation:**
- Employee-specific commission rates
- Service-based commission rules
- Product-based commission rules
- Automatic commission calculation
- Commission payment tracking

**Commission Features:**
- Real-time commission calculation
- Commission history tracking
- Payment status management
- Bulk commission payments
- Commission reporting

### 9.4 Receipt Management

**Receipt Features:**
- Digital receipt generation
- Email receipt delivery
- SMS receipt delivery
- Receipt reprinting
- Transaction lookup
- Refund processing

---

## 10. Inventory Management

### 10.1 Product Catalog

**Product Attributes:**
- Product name and description
- SKU (Stock Keeping Unit)
- Category classification
- Unit pricing
- Tax rate specification
- Supplier information
- Reorder levels

**Product Categories:**
- Hair care products
- Nail care products
- Makeup products
- Spa products
- Equipment and tools
- Retail products

### 10.2 Stock Management

**Inventory Movements:**
- Purchase receipts
- Sales consumption
- Stock adjustments
- Transfers between locations
- Returns and refunds
- Waste/damage recording

**Stock Tracking:**
- Real-time stock levels
- Low stock alerts
- Reorder point notifications
- Stock valuation
- Movement history
- Audit trails

### 10.3 Supplier Management

**Supplier Features:**
- Supplier contact information
- Purchase history
- Payment terms
- Product catalogs
- Performance tracking
- Order management

### 10.4 Inventory Reporting

**Reports Available:**
- Stock level reports
- Movement reports
- Valuation reports
- Reorder reports
- Supplier performance
- Usage analytics

---

## 11. Employee Management & HR

### 11.1 Employee Onboarding

**Employee Registration:**
- Personal information collection
- Role assignment
- Skill documentation
- Schedule preferences
- Commission rate setup
- Permission assignment

**Employee Profiles:**
- Contact information
- Skills and certifications
- Work schedule
- Performance metrics
- Commission history
- Training records

### 11.2 Attendance Tracking

**Time Tracking:**
- Clock in/out functionality
- Break time tracking
- Overtime calculation
- Attendance history
- Schedule compliance
- Mobile app integration

**Attendance Sources:**
- Mobile app check-in
- Web portal
- USSD integration
- Manual entry (manager override)

### 11.3 Schedule Management

**Scheduling Features:**
- Weekly schedule creation
- Shift assignment
- Availability management
- Schedule conflicts detection
- Schedule optimization
- Staff coverage planning

### 11.4 Performance Management

**Performance Metrics:**
- Service completion rates
- Customer satisfaction scores
- Revenue generation
- Appointment punctuality
- Skill development progress
- Goal achievement

---

## 12. Financial Management & Accounting

### 12.1 Double-Entry Bookkeeping

**Chart of Accounts:**
- Asset accounts
- Liability accounts
- Equity accounts
- Revenue accounts
- Expense accounts
- Account hierarchy support

**Journal Entries:**
- Automatic entry generation
- Manual entry creation
- Entry approval workflow
- Posting to ledger
- Entry reversal capability
- Audit trail maintenance

### 12.2 Invoice Management

**Invoice Features:**
- Invoice creation and customization
- Customer billing
- Payment tracking
- Overdue management
- Invoice templates
- Tax calculation

**Invoice Status Workflow:**
```
draft → sent → paid
  ↓       ↓      ↑
cancelled overdue → paid
```

### 12.3 Financial Reporting

**Standard Reports:**
- Income Statement (P&L)
- Balance Sheet
- Cash Flow Statement
- Trial Balance
- Aged Receivables
- Expense Reports

**Custom Reports:**
- Date range filtering
- Account-specific reports
- Comparative analysis
- Trend analysis
- Export capabilities

### 12.4 Expense Management

**Expense Tracking:**
- Expense claim submission
- Receipt attachment
- Approval workflow
- Reimbursement processing
- Expense categorization
- Budget tracking

---

## 13. Micro-Lending System

### 13.1 Loan Products

**Product Types:**
- Working capital loans
- Equipment financing
- Business expansion loans
- Emergency loans
- Seasonal loans

**Product Configuration:**
- Minimum/maximum amounts
- Interest rates
- Term lengths
- Eligibility criteria
- Guarantor requirements
- Collateral requirements

### 13.2 Credit Scoring

**Scoring Factors:**
- Business performance metrics
- Payment history
- Cash flow analysis
- Salon membership status
- Association standing
- External credit data

**Score Calculation:**
- Automated scoring algorithm
- Manual score adjustments
- Score history tracking
- Risk level classification
- Score validity periods

### 13.3 Loan Application Process

**Application Workflow:**
```
draft → pending → approved → disbursed → active → completed
  ↓       ↓         ↓          ↓         ↓
cancelled rejected cancelled  cancelled defaulted
```

**Application Requirements:**
- Business information
- Financial statements
- Loan purpose documentation
- Guarantor information
- Collateral documentation
- Credit score assessment

### 13.4 Loan Management

**Loan Servicing:**
- Repayment schedule generation
- Payment processing
- Late fee calculation
- Default management
- Loan restructuring
- Early payment handling

**Repayment Methods:**
- Automatic wallet deduction
- Mobile money payments
- Bank transfers
- Cash payments
- Payroll deduction

---

## 14. Digital Wallet System

### 14.1 Wallet Management

**Wallet Features:**
- Multi-currency support (RWF primary)
- Real-time balance tracking
- Transaction history
- Security controls
- Spending limits
- Account linking

**Wallet Types:**
- Personal wallets (customers)
- Business wallets (salons)
- Employee wallets
- Commission wallets
- Loan disbursement wallets

### 14.2 Transaction Processing

**Transaction Types:**
- Deposits
- Withdrawals
- Transfers
- Loan disbursements
- Loan repayments
- Commission payments
- Refunds
- Fee deductions

**Transaction Features:**
- Atomic transactions
- Balance validation
- Transaction reversal
- Fraud detection
- Transaction limits
- Audit trails

### 14.3 Wallet Security

**Security Measures:**
- PIN-based authentication
- Biometric authentication
- Transaction limits
- Suspicious activity detection
- Account freezing capabilities
- Multi-factor authentication

---

## 15. Airtel Integration

### 15.1 Agent Registration

**Agent Types:**
- Airtel Agent (full service)
- Airtel AgentLite (limited service)

**Registration Process:**
- Agent application submission
- Airtel verification
- Float allocation
- Training completion
- Service activation

### 15.2 Mobile Money Services

**Services Offered:**
- Cash in/cash out
- Money transfers
- Bill payments
- Merchant payments
- Balance inquiries
- Transaction history

**Transaction Processing:**
- Real-time transaction processing
- Transaction status tracking
- Commission calculation
- Float management
- Reconciliation processes

### 15.3 Float Management

**Float Operations:**
- Float balance monitoring
- Float replenishment
- Float reconciliation
- Float transfer between agents
- Float usage analytics

---

## 16. Membership Management

### 16.1 Association Membership

**Membership Categories:**
- Standard membership
- Premium membership
- Corporate membership
- Student membership
- Honorary membership

**Membership Status:**
- New applications
- Active memberships
- Pending renewals
- Expired memberships
- Suspended memberships

### 16.2 Membership Benefits

**Standard Benefits:**
- Platform access
- Basic support
- Community features
- Training access
- Networking opportunities

**Premium Benefits:**
- Advanced features
- Priority support
- Exclusive training
- Marketing support
- Financial services access

### 16.3 Membership Payments

**Payment Processing:**
- Membership fee collection
- Payment method flexibility
- Automatic renewals
- Payment reminders
- Payment history tracking

---

## 17. Loyalty & Rewards System

### 17.1 Points System

**Points Earning:**
- Service-based points (1 point per RWF 100)
- Product purchase points
- Referral bonuses
- Birthday bonuses
- Special promotion points

**Points Management:**
- Automatic points calculation
- Manual points adjustment
- Points expiration handling
- Points transfer capabilities
- Points history tracking

### 17.2 Rewards Configuration

**Salon-Specific Settings:**
- Points earning rates
- Redemption rates
- Minimum redemption amounts
- Points expiration periods
- VIP thresholds
- Special rewards

### 17.3 Redemption System

**Redemption Options:**
- Service discounts
- Product discounts
- Free services
- Gift vouchers
- Special privileges

---

## 18. Communication & Notifications

### 18.1 Notification System

**Notification Channels:**
- In-app notifications
- Push notifications (mobile)
- SMS messages
- Email notifications
- WhatsApp messages (future)

**Notification Types:**
- Appointment confirmations
- Appointment reminders
- Status updates
- Marketing messages
- System alerts
- Payment confirmations

### 18.2 Communication Templates

**Template Categories:**
- Appointment-related
- Marketing campaigns
- System notifications
- Payment reminders
- Birthday wishes
- Service recommendations

**Template Features:**
- Dynamic content insertion
- Multi-language support
- Personalization
- A/B testing capabilities
- Performance tracking

### 18.3 Communication History

**History Tracking:**
- Message delivery status
- Response rates
- Engagement metrics
- Communication preferences
- Opt-out management
- Compliance tracking

---

## 19. Reporting & Analytics

### 19.1 Business Intelligence

**Dashboard Metrics:**
- Revenue trends
- Customer acquisition
- Service performance
- Employee productivity
- Inventory turnover
- Financial health indicators

**Real-time Analytics:**
- Live sales tracking
- Appointment status
- Staff performance
- Customer satisfaction
- System usage metrics

### 19.2 Financial Reports

**Standard Reports:**
- Daily sales reports
- Monthly revenue reports
- Profit & loss statements
- Cash flow reports
- Commission reports
- Tax reports

**Custom Reports:**
- Date range selection
- Filter customization
- Export capabilities
- Scheduled reports
- Report sharing
- Visualization options

### 19.3 Operational Reports

**Operations Reports:**
- Appointment analytics
- Service popularity
- Staff utilization
- Customer retention
- Inventory reports
- Marketing effectiveness

---

## 20. Mobile Application Features

### 20.1 Customer Mobile App

**Core Features:**
- Salon discovery and search
- Service browsing
- Appointment booking
- Payment processing
- Loyalty points tracking
- Review and rating system

**User Experience:**
- Intuitive navigation
- Offline capability
- Push notifications
- Location-based services
- Social sharing
- Personalized recommendations

### 20.2 Staff Mobile App

**Employee Features:**
- Schedule management
- Appointment handling
- Customer information access
- Sales processing
- Commission tracking
- Performance metrics

**Manager Features:**
- Staff oversight
- Sales monitoring
- Inventory management
- Customer management
- Reporting access
- System administration

### 20.3 Owner Mobile App

**Business Management:**
- Multi-salon dashboard
- Financial overview
- Staff management
- Customer analytics
- Inventory control
- Marketing tools

**Advanced Features:**
- Real-time notifications
- Remote system access
- Performance monitoring
- Financial reporting
- Strategic planning tools

---

## 21. Web Application Features

### 21.1 Public Website

**Public Features:**
- Salon directory
- Service catalog
- Online booking
- Membership application
- Contact information
- About the association

**SEO Optimization:**
- Search engine friendly URLs
- Meta tag optimization
- Sitemap generation
- Schema markup
- Performance optimization

### 21.2 Admin Dashboard

**Administrative Features:**
- User management
- Salon oversight
- System configuration
- Report generation
- Content management
- Security monitoring

**System Administration:**
- Database management
- Backup and recovery
- Performance monitoring
- Security auditing
- Update management
- Integration monitoring

### 21.3 Salon Management Portal

**Salon Owner Features:**
- Business dashboard
- Staff management
- Customer management
- Financial reporting
- Inventory control
- Marketing tools

**Operational Tools:**
- Appointment calendar
- POS system
- Commission management
- Performance analytics
- Communication tools
- Settings configuration

---

## 22. Integration & API Features

### 22.1 RESTful API

**API Architecture:**
- RESTful design principles
- JSON request/response format
- HTTP status code compliance
- Rate limiting (100 requests/minute)
- API versioning support
- Comprehensive documentation

**Authentication:**
- JWT token-based authentication
- Role-based access control
- Permission-based authorization
- API key management
- OAuth 2.0 support (future)

### 22.2 Third-Party Integrations

**Payment Gateways:**
- Airtel Money integration
- MTN Mobile Money (future)
- Bank payment gateways
- International payment processors

**Communication Services:**
- SMS providers (Twilio, etc.)
- Email services (SendGrid, AWS SES)
- Push notification services
- WhatsApp Business API (future)

### 22.3 Webhook System

**Webhook Events:**
- Payment confirmations
- Appointment status changes
- User registrations
- System alerts
- Integration events

**Webhook Features:**
- Event filtering
- Retry mechanisms
- Signature verification
- Delivery tracking
- Error handling

---

## 23. Security & Compliance

### 23.1 Data Security

**Security Measures:**
- Data encryption at rest and in transit
- Secure password hashing (bcrypt)
- JWT token security
- SQL injection prevention
- XSS protection
- CSRF protection

**Access Control:**
- Role-based access control (RBAC)
- Permission-based authorization
- Multi-factor authentication
- Session management
- Account lockout policies
- Audit logging

### 23.2 Privacy Compliance

**Data Protection:**
- Personal data encryption
- Data minimization principles
- Consent management
- Right to deletion
- Data portability
- Privacy by design

**Compliance Features:**
- GDPR compliance measures
- Local data protection laws
- Audit trail maintenance
- Data retention policies
- Breach notification procedures

### 23.3 System Security

**Infrastructure Security:**
- Secure hosting environment
- Regular security updates
- Vulnerability scanning
- Penetration testing
- Backup and recovery
- Disaster recovery planning

---

## 24. Performance & Scalability

### 24.1 Performance Optimization

**Database Optimization:**
- Query optimization
- Index management
- Connection pooling
- Caching strategies
- Database partitioning
- Read replicas

**Application Performance:**
- Code optimization
- Memory management
- Caching layers
- CDN integration
- Image optimization
- Lazy loading

### 24.2 Scalability Features

**Horizontal Scaling:**
- Load balancing
- Microservices architecture
- Container deployment
- Auto-scaling capabilities
- Database sharding
- Distributed caching

**Monitoring & Alerting:**
- Performance monitoring
- Error tracking
- Uptime monitoring
- Resource utilization
- Alert notifications
- Performance analytics

---

## 25. Data Management

### 25.1 Data Architecture

**Database Design:**
- Normalized data structure
- Referential integrity
- ACID compliance
- Transaction management
- Backup strategies
- Data archiving

**Data Flow:**
- ETL processes
- Data synchronization
- Real-time updates
- Batch processing
- Data validation
- Error handling

### 25.2 Backup & Recovery

**Backup Strategy:**
- Automated daily backups
- Point-in-time recovery
- Cross-region replication
- Backup verification
- Recovery testing
- Disaster recovery procedures

**Data Retention:**
- Retention policies
- Data archiving
- Legal compliance
- Storage optimization
- Data lifecycle management

---

## Conclusion

The URUTI Saluni platform represents a comprehensive digital ecosystem that successfully integrates salon operations, financial services, and association management into a unified system. With 25+ modules, 50+ database tables, and support for web and mobile applications, the platform provides a complete solution for salon businesses in Rwanda.

**Key Achievements:**
- ✅ Complete backend API with 200+ endpoints
- ✅ Responsive web application with 20+ feature modules
- ✅ Native mobile application with role-based access
- ✅ Comprehensive permission system with 30+ granular permissions
- ✅ Integrated financial services including micro-lending
- ✅ Real-time notifications and communication system
- ✅ Advanced analytics and reporting capabilities
- ✅ Scalable architecture ready for production deployment

**Production Readiness:**
The system is fully functional and ready for production deployment, with comprehensive testing, security measures, and scalability features in place.

---

**Document Prepared By:** Senior System Analyst  
**Review Date:** January 2026  
**Next Review:** June 2026  
**Classification:** Internal Use