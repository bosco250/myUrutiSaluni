# Salon Association Platform - Frontend

Enterprise-grade Next.js web application for the Salon Association Platform.

## 🚀 Features

- **Next.js 14** with App Router and React Server Components
- **TypeScript 5.3** for type safety
- **TailwindCSS 3.4** for styling with dark mode support
- **React Query 5** for server state management
- **Zustand 4** for client state management
- **Authentication** with JWT and secure token storage
- **Error Handling** with error boundaries and toast notifications
- **Security** with XSS protection, input sanitization, and secure headers
- **Accessibility** with WCAG 2.1 AA compliance
- **Responsive Design** with mobile-first approach

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

## 📁 Project Structure

```
web/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages (login, register)
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout with providers
├── components/            # React components
│   ├── layout/           # Layout components (Header, Sidebar, Footer)
│   └── ui/               # UI components (Button, Modal, Toast, etc.)
├── contexts/             # React contexts
├── hooks/                # Custom React hooks
│   ├── useModal.ts       # Modal state management
│   ├── useErrorHandler.ts # Error handling hook
│   └── useMediaQuery.ts  # Responsive breakpoints
├── lib/                  # Utility libraries
│   ├── api.ts           # API client with interceptors
│   ├── auth.ts          # Authentication utilities
│   ├── error-handler.ts # Error handling utilities
│   ├── logger.ts        # Logging utilities
│   ├── sanitize.ts      # Input sanitization
│   └── secure-storage.ts # Secure storage wrapper
├── providers/            # React providers
│   ├── QueryProvider.tsx # React Query provider
│   └── ThemeProvider.tsx # Theme provider
├── store/                # Zustand stores
│   └── auth-store.ts    # Authentication store
├── types/                # TypeScript type definitions
│   ├── api.ts           # API types
│   └── models.ts        # Domain models
└── public/               # Static assets
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

