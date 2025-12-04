# Project Structure

This document outlines the complete project structure for the Salon Association Platform.

## Directory Structure

```
salon-association-platform/
├── backend/                 # NestJS Backend API
│   ├── src/
│   │   ├── auth/            # Authentication module
│   │   ├── users/           # User management
│   │   ├── salons/          # Salon management
│   │   ├── customers/       # Customer management
│   │   ├── appointments/    # Appointment scheduling
│   │   ├── services/        # Service catalog
│   │   ├── sales/           # POS and sales
│   │   ├── inventory/       # Inventory management
│   │   ├── attendance/      # Attendance tracking
│   │   ├── accounting/      # Accounting module
│   │   ├── loans/           # Micro-lending
│   │   ├── wallets/         # Digital wallets
│   │   ├── airtel/          # Airtel integration
│   │   ├── memberships/     # Membership management
│   │   ├── dashboard/       # Dashboard analytics
│   │   └── notifications/   # Notification system
│   ├── dist/                # Compiled JavaScript
│   └── package.json
│
├── web/                     # Next.js Web Application
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # Authentication routes
│   │   ├── (dashboard)/     # Protected dashboard routes
│   │   └── layout.tsx       # Root layout
│   ├── components/          # React components
│   │   ├── layout/          # Layout components
│   │   └── ui/              # UI components
│   ├── lib/                 # Utilities and helpers
│   ├── store/               # State management (Zustand)
│   ├── providers/           # React providers
│   └── package.json
│
├── mobile/                  # React Native Mobile App
│   ├── src/
│   │   ├── screens/         # Screen components
│   │   ├── components/      # Reusable components
│   │   ├── navigation/      # Navigation setup
│   │   ├── services/        # API services
│   │   ├── store/           # State management
│   │   ├── hooks/           # Custom hooks
│   │   └── utils/           # Utility functions
│   ├── android/             # Android native code
│   ├── ios/                 # iOS native code
│   └── package.json
│
├── database/                # Database files
│   ├── extended_schema.sql  # Extended database schema
│   └── salon_association_full_database_schema_postgres.sql
│
├── stitch_document_upload/  # Design files and mockups
│   └── stitch_document_upload/
│       └── [design files]  # HTML/PNG design files
│
└── [Documentation Files]
    ├── README.md
    ├── ARCHITECTURE.md
    ├── DESIGN_SYSTEM.md
    ├── PROJECT_STATUS.md
    └── ...
```

## Application Types

### 1. Backend API (`backend/`)
- **Technology**: NestJS, TypeScript, TypeORM
- **Purpose**: RESTful API for all business logic
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Port**: 3000 (default)

### 2. Web Application (`web/`)
- **Technology**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Purpose**: 
  - Admin panel for association management
  - Responsive web interface for salon owners
  - Reporting and analytics dashboard
- **Port**: 3001 (default)

### 3. Mobile Application (`mobile/`)
- **Technology**: React Native, TypeScript
- **Purpose**: 
  - Primary interface for salon owners
  - Employee operations (attendance, services)
  - Customer-facing features
- **Platforms**: Android & iOS

## Shared Resources

### Design System
- Defined in `DESIGN_SYSTEM.md`
- Colors, typography, spacing, components
- Used by both web and mobile

### API Client
- Both web and mobile use the same backend API
- Base URL: `http://localhost:3000/api` (dev)
- Authentication: JWT tokens

## Development Workflow

1. **Backend Development**
   ```bash
   cd backend
   npm run start:dev
   ```

2. **Web Development**
   ```bash
   cd web
   npm run dev
   ```

3. **Mobile Development**
   ```bash
   cd mobile
   npm start
   # Then run on device/emulator
   ```

## Build & Deployment

### Backend
```bash
npm run build:backend
```

### Web
```bash
npm run build:web
```

### Mobile
```bash
# Android
npm run build:mobile:android

# iOS
npm run build:mobile:ios
```

## Environment Variables

Each application has its own environment configuration:
- `backend/.env` - Backend API configuration
- `web/.env.local` - Web app configuration
- `mobile/.env` - Mobile app configuration (if needed)

## Code Sharing

While web and mobile are separate applications, they share:
- **API Contracts**: Same REST endpoints
- **Design System**: Same colors, typography, spacing
- **Business Logic**: Handled by backend
- **State Management Patterns**: Similar patterns (React Query, Zustand)

## Future Considerations

- Shared TypeScript types package
- Shared utility functions
- Component library (if needed)
- Storybook for component documentation

