# Salon Association Platform

An integrated digital system designed to manage salon business operations, streamline association member management, enable micro‑lending for salon growth, support Airtel Agent & Airtel AgentLite financial services, and provide lightweight accounting functionality.

## 🎯 Features

- **Membership Management** - Register, verify, and manage salon owners and employees
- **Salon Operations** - Appointments, services, inventory, employees, POS
- **Accounting Module** - Chart of accounts, journals, invoices, financial reports
- **Micro-Lending** - Loan products, applications, credit scoring, repayments
- **Airtel Integration** - Agent & AgentLite services for mobile money operations
- **Financial Wallet** - Digital wallet with transaction tracking
- **Dashboard & Analytics** - Comprehensive reporting and KPIs
- **Staff & HR** - Attendance, commissions, payroll management

## 🏗️ Architecture

- **Backend**: NestJS with TypeORM
- **Web**: Next.js with React, TypeScript (Admin Panel & Responsive Web)
- **Mobile**: React Native (Android/iOS for Salon Owners & Employees)
- **Database**: SQLite (Development) / PostgreSQL (Production)
- **Authentication**: JWT
- **API**: RESTful API

## 📁 Project Structure

```
salon-association-platform/
├── backend/          # NestJS backend API
├── web/             # Next.js web application (Admin Panel)
├── mobile/          # React Native mobile app (Android/iOS)
├── database/        # Database migrations and schemas
└── docs/            # Documentation
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- **Development**: SQLite (automatic, no setup needed)
- **Production**: PostgreSQL 14+ (optional, for production deployment)

### Installation

1. Install dependencies:
```bash
npm run install:all
```

2. Set up environment variables:
- Copy `backend/.env.example` to `backend/.env`
- Copy `web/.env.example` to `web/.env.local`
- For development, SQLite is configured by default (no database setup needed!)

3. Start development servers:
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Web Application
npm run dev:web

# Terminal 3 - Mobile App (optional)
cd mobile && npm install && npm start
```

### Mobile App Setup

For React Native mobile app:

1. Install React Native CLI:
```bash
npm install -g react-native-cli
```

2. For Android:
   - Install Android Studio
   - Set up Android SDK
   - Run: `npm run build:mobile:android`

3. For iOS (macOS only):
   - Install Xcode
   - Install CocoaPods: `sudo gem install cocoapods`
   - Run: `npm run build:mobile:ios`

## 📚 Documentation

### Getting Started
- [Quick Start Guide](./QUICK_START.md) - Get started in 5 minutes
- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Pre-deployment checklist

### Technical Documentation
- [Database Migration](./DATABASE_MIGRATION.md) - SQLite ↔ PostgreSQL migration
- [SQLite Compatibility](./SQLITE_COMPATIBILITY.md) - SQLite compatibility guide
- [Project Status](./PROJECT_STATUS.md) - Current implementation status
- [Architecture](./ARCHITECTURE.md) - System architecture overview

### Requirements & Design
- [Product Requirements Document](./salon_association_prd.md)
- [Design System](./DESIGN_SYSTEM.md) - Shared design system for web and mobile
- [Database Schema](./salon_association_full_database_schema_postgres.sql)
- [User Journey Maps](./salon_association_user_journey_maps.md)
- [Wireframes](./salon_association_wireframes.md)

## 🔐 Roles & Permissions

- **super_admin** - Full system access
- **association_admin** - Association management
- **district_leader** - District-level oversight
- **salon_owner** - Salon operations management
- **salon_employee** - Employee operations
- **customer** - Customer access

## 🌍 Localization

Supports Kinyarwanda, English, and French.

## 📝 License

ISC

