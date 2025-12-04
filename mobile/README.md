# Salon Association Mobile App

React Native mobile application for salon owners and employees.

## Features

- **Salon Operations**: Appointments, services, inventory, employees
- **Attendance Tracking**: Clock in/out functionality
- **Customer Management**: Customer profiles and booking
- **Financial**: Wallet, loans, commissions
- **Airtel Integration**: Agent services and transactions

## Tech Stack

- React Native 0.73
- TypeScript
- React Navigation
- React Query
- Zustand
- Axios

## Getting Started

### Prerequisites

- Node.js 18+
- React Native CLI
- Android Studio (for Android)
- Xcode (for iOS - macOS only)

### Installation

```bash
npm install
```

### Running the App

#### Android
```bash
npm run android
```

#### iOS
```bash
npm run ios
```

### Development

Start Metro bundler:
```bash
npm start
```

## Project Structure

```
mobile/
├── src/
│   ├── screens/        # Screen components
│   ├── components/    # Reusable components
│   ├── navigation/     # Navigation setup
│   ├── services/       # API services
│   ├── store/          # State management
│   ├── hooks/          # Custom hooks
│   └── utils/          # Utility functions
├── android/            # Android native code
└── ios/                # iOS native code
```

