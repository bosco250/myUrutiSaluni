# Salon Association Frontend

Modern Next.js frontend for the Salon Association Platform.

## Features

- 🎨 Beautiful, responsive UI with Tailwind CSS
- 🔐 Authentication with JWT
- 📊 Dashboard with statistics and charts
- 📱 Mobile-friendly design
- ⚡ Fast with React Query for data fetching
- 🎯 TypeScript for type safety

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running on http://localhost:3000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

3. Update `.env.local` with your API URL:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3001](http://localhost:3001) in your browser.

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── dashboard/
│   │   ├── salons/
│   │   ├── appointments/
│   │   ├── sales/
│   │   ├── accounting/
│   │   ├── loans/
│   │   ├── wallets/
│   │   ├── memberships/
│   │   ├── inventory/
│   │   ├── airtel/
│   │   ├── reports/
│   │   └── settings/
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
│   ├── layout/           # Layout components
│   └── ui/               # UI components
├── lib/                  # Utilities
│   ├── api.ts           # API client
│   └── auth.ts          # Auth service
├── store/               # State management
│   └── auth-store.ts    # Auth store (Zustand)
└── providers/           # React providers
    └── QueryProvider.tsx # React Query provider
```

## Pages

### Authentication
- **Login** (`/login`) - User login
- **Register** (`/register`) - User registration

### Dashboard
- **Dashboard** (`/dashboard`) - Main dashboard with statistics
- **Salons** (`/salons`) - Salon management
- **Appointments** (`/appointments`) - Appointment calendar and management
- **Sales & POS** (`/sales`) - Point of sale and sales management
- **Inventory** (`/inventory`) - Product and stock management
- **Accounting** (`/accounting`) - Financial management
- **Loans** (`/loans`) - Micro-lending management
- **Wallets** (`/wallets`) - Digital wallet management
- **Memberships** (`/memberships`) - Association membership management
- **Airtel** (`/airtel`) - Airtel agent management
- **Reports** (`/reports`) - Analytics and reports
- **Settings** (`/settings`) - User settings

## Technologies

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Query** - Data fetching and caching
- **Zustand** - State management
- **Axios** - HTTP client
- **Lucide React** - Icons
- **Recharts** - Charts and graphs
- **date-fns** - Date formatting

## Development

### Running in Development

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## API Integration

The frontend communicates with the backend API. Make sure the backend is running and accessible at the URL specified in `NEXT_PUBLIC_API_URL`.

### Authentication Flow

1. User logs in/registers
2. JWT token is stored in localStorage
3. Token is automatically added to API requests via axios interceptor
4. On 401 errors, user is redirected to login

### State Management

- **Zustand** for authentication state (persisted to localStorage)
- **React Query** for server state (caching, refetching, etc.)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3000/api` |

## Contributing

1. Follow the existing code structure
2. Use TypeScript for all new files
3. Use Tailwind CSS for styling
4. Follow React best practices
5. Test your changes before committing

## License

See root LICENSE file.

