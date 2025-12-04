# Salon Association Platform – Product Requirements Document (PRD)

## 1. Overview
The Salon Association Platform is an integrated digital system designed to manage salon business operations, streamline association member management, enable micro‑lending for salon growth, support Airtel Agent & Airtel AgentLite financial services, and provide lightweight accounting functionality. The platform empowers salon owners, employees, and association administrators with tools for productivity, compliance, financial inclusion, and revenue growth.

---

## 2. Goals & Objectives
- Digitize daily salon operations (appointments, services, inventory, employees).
- Enable proper membership management for salon owners and workers.
- Provide an accounting module for revenue, expenses, journals, invoices, and reports.
- Offer an internal micro‑lending system to support member financial needs.
- Integrate Airtel Agent & AgentLite functions so members operate as mobile money agents.
- Provide a dashboard for analytics, compliance, training, communication, and reporting.
- Create a seamless mobile and web experience.

---

## 3. Target Users
### 3.1 Primary Users
- **Salon Owners** – manage business operations and staff.
- **Salon Employees/Workers** – clock-in, request loans, perform activities.
- **Association Leadership** – manage members, compliance, benefits.

### 3.2 Secondary Users
- **Customers** – booking appointments and payments.
- **Airtel Team** – agent performance reporting.

---

## 4. High-Level Modules
1. **Membership Management**
2. **Salon Operations**
3. **Small Accounting Module**
4. **Micro‑Lending Module**
5. **Airtel Agent & AgentLite Integration**
6. **Financial Wallet & Payments**
7. **Inventory Management**
8. **Staff & HR Module**
9. **Booking & Customer Management**
10. **Reporting, Analytics & Dashboard**
11. **Notifications & Messaging**
12. **Role-Based Access Control (RBAC)**

---

## 5. Detailed Requirements

### 5.1 Membership Management
- Register salon owners and employees.
- Approve/verify salons under the association.
- Manage subscription fees and membership status.
- Store member documents, certificates, licenses.
- View member profiles and track historical activity.

### 5.2 Salon Operations
- Record daily services performed.
- Track customer check-in and checkout.
- Manage service menu (haircut, treatments, styling, etc.).
- Employee shifts, attendance, and commissions.
- Daily sales summary.

### 5.3 Small Accounting Module
#### Features
- Chart of accounts (auto‑generated templates).
- Journal entries (double entry).
- Revenue & expense tracking.
- Invoicing & receipts.
- Supplier payments.
- Tax & VAT records.
- Expense claims & approvals.

#### Reports
- Trial Balance
- Income Statement
- Balance Sheet (lightweight)
- Cash Flow Statement
- VAT Report
- Salon Profitability Report
- Daily Sales Summary

### 5.4 Micro‑Lending Module
#### Loan Products
- Define loan products per association guidelines.
- Set interest rate, term, min/max amount.

#### Loan Lifecycle
- Loan application by member.
- Automatic scoring & eligibility.
- Manual/automatic approval.
- Disbursement (mobile money or wallet).
- Repayments (manual or automated via Airtel money).
- Loan closure or default management.

#### Additional
- Guarantors feature.
- Credit scoring table.

### 5.5 Airtel Agent & AgentLite Integration
#### Airtel Agent
- Register members as Airtel agents.
- Track float, commissions, cash-ins, cash-outs.
- Receive transaction callbacks from Airtel.
- Reconcile Airtel balances.

#### AgentLite Integration
- Allow members to act as light agents.
- Airtel wallet linking.
- View transaction history.
- Commission tracking.

### 5.6 Financial Wallet & Payments
- Each member has a digital wallet.
- Wallet transactions (credit, debit).
- Support Airtel Money, cash, card (optional).
- Wallet linked to loans, commissions, and earnings.

### 5.7 Inventory Management
- Track salon products and consumables.
- Purchase orders.
- Stock alerts.
- Supplier management.

### 5.8 Staff & HR Module
- Employee onboarding.
- Attendance tracking.
- Commissions per service.
- Payroll (manual/automatic).

### 5.9 Customer & Booking
- Online booking.
- Appointment calendar.
- Customer profiles.
- Loyalty points.

### 5.10 Dashboard & Reporting
- Daily salon revenue.
- Top-performing employees.
- Loan performance.
- Airtel agent activity.
- Inventory usage.
- Financial KPIs.

### 5.11 Notifications
- SMS, WhatsApp, email, and in-app notifications.
- Loan due reminders.
- Appointment reminders.

### 5.12 RBAC (Role-Based Access Control)
- System admins
- Association admins
- Salon owners
- Salon staff
- Auditors/finance

---

## 6. System Architecture
### Components
- **Mobile App (Android/iOS)** – main interface for salon owners & employees.
- **Web Admin Panel** – association management & reporting.
- **Backend API (Node.js / NestJS)** – business logic.
- **Database (PostgreSQL)** – relational structured storage.
- **Integration Layer** – Airtel APIs.
- **Notification Gateway** – SMS, email, WhatsApp.

### Integrations
- Airtel Open API (collections, disbursement, agent services).
- Government licensing APIs (optional).

---

## 7. User Stories
### Membership
- *As an association admin, I want to verify new salons so I can ensure compliance.*
- *As a salon owner, I want to register my staff so that operations are digitized.*

### Accounting
- *As a salon owner, I want to record expenses so I can track profitability.*
- *As a finance admin, I want to generate an income statement.*

### Micro‑Lending
- *As a member, I want to apply for a loan.*
- *As an admin, I want to approve loans based on scoring.*

### Airtel Agent
- *As a member, I want to act as an Airtel Agent to earn commissions.*
- *As the association, I want to monitor agent performance.*

---

## 8. KPIs (Success Indicators)
- Increase in recorded daily salon activities.
- Reduction in manual bookkeeping.
- Number of loans issued and repaid.
- Airtel transactions processed.
- Membership growth.
- System uptime and user satisfaction.

---

## 9. Non‑Functional Requirements
- **Scalability:** Support 100,000+ members.
- **Security:** JWT auth, encryption, audit logs.
- **Performance:** <300ms API response.
- **Localization:** Support Kinyarwanda, English, French.
- **Offline mode:** Mobile app caching.

---

## 10. Release Roadmap
### Phase 1 – Core (Month 1–2)
- Membership Management
- Salon Operations Basics
- Inventory

### Phase 2 – Financial Layer (Month 3–4)
- Small Accounting
- Wallets

### Phase 3 – Micro-Lending (Month 5)
- Loan engine + scoring

### Phase 4 – Airtel Integration (Month 6)
- Agent + AgentLite

### Phase 5 – Dashboard + Analytics (Month 7)

---

# END OF PRD

