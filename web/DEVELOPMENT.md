# Development Guide

This guide covers development workflow, best practices, and conventions for the Salon Association Platform frontend.

## 📋 Table of Contents

- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Component Development](#component-development)
- [State Management](#state-management)
- [API Integration](#api-integration)
- [Error Handling](#error-handling)
- [Security](#security)
- [Testing](#testing)
- [Performance](#performance)
- [Accessibility](#accessibility)

## 🔄 Development Workflow

### Starting Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
# http://localhost:3001
```

### Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Building

```bash
# Build for production
npm run build

# Start production server
npm start

# Analyze bundle size
npm run build -- --analyze
```

## 🎨 Code Style

### TypeScript

- Use TypeScript for all files
- Define proper types and interfaces
- Avoid `any` type
- Use type inference where appropriate

```typescript
// Good
interface User {
  id: number;
  name: string;
  email: string;
}

const user: User = { id: 1, name: 'John', email: 'john@example.com' };

// Avoid
const user: any = { id: 1, name: 'John', email: 'john@example.com' };
```

### React Components

- Use functional components with hooks
- Use `'use client'` directive for client components
- Keep components small and focused
- Extract reusable logic to custom hooks

```typescript
'use client';

import { useState } from 'react';

interface Props {
  initialCount?: number;
}

export function Counter({ initialCount = 0 }: Props) {
  const [count, setCount] = useState(initialCount);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useAuth.ts`)
- Utils: `kebab-case.ts` (e.g., `format-date.ts`)
- Types: `kebab-case.ts` (e.g., `api-types.ts`)

### Import Order

```typescript
// 1. React imports
import { useState, useEffect } from 'react';

// 2. Third-party imports
import { useQuery } from '@tanstack/react-query';

// 3. Internal imports - components
import { Button } from '@/components/ui/Button';

// 4. Internal imports - hooks
import { useAuth } from '@/hooks/useAuth';

// 5. Internal imports - utils
import { formatDate } from '@/lib/utils';

// 6. Types
import type { User } from '@/types/models';

// 7. Styles
import styles from './Component.module.css';
```

## 🧩 Component Development

### Component Structure

```typescript
'use client';

// 1. Imports
import { useState } from 'react';
import { Button } from '@/components/ui/Button';

// 2. Types
interface Props {
  title: string;
  onSubmit: (value: string) => void;
}

// 3. Component
export function MyComponent({ title, onSubmit }: Props) {
  // 3.1. Hooks
  const [value, setValue] = useState('');

  // 3.2. Event handlers
  const handleSubmit = () => {
    onSubmit(value);
    setValue('');
  };

  // 3.3. Render
  return (
    <div>
      <h2>{title}</h2>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <Button onClick={handleSubmit}>Submit</Button>
    </div>
  );
}
```

### Server vs Client Components

**Server Components** (default):
- No state or effects
- No browser APIs
- Direct database access
- Better performance

```typescript
// app/salons/page.tsx
import { api } from '@/lib/api';

export default async function SalonsPage() {
  const salons = await api.get('/salons');
  
  return (
    <div>
      {salons.map((salon) => (
        <div key={salon.id}>{salon.name}</div>
      ))}
    </div>
  );
}
```

**Client Components** (with `'use client'`):
- Need state or effects
- Use browser APIs
- Event handlers
- Third-party libraries

```typescript
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

## 🗂️ State Management

### Local State (useState)

Use for component-specific state:

```typescript
const [isOpen, setIsOpen] = useState(false);
```

### Global State (Zustand)

Use for app-wide state:

```typescript
// store/settings-store.ts
import { create } from 'zustand';

interface SettingsState {
  language: string;
  setLanguage: (language: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: 'en',
  setLanguage: (language) => set({ language }),
}));

// Component
const { language, setLanguage } = useSettingsStore();
```

### Server State (React Query)

Use for API data:

```typescript
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

function SalonsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['salons'],
    queryFn: () => api.get('/salons'),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading salons</div>;

  return (
    <div>
      {data.map((salon) => (
        <div key={salon.id}>{salon.name}</div>
      ))}
    </div>
  );
}
```

## 🌐 API Integration

### API Client

Use the configured API client:

```typescript
import api from '@/lib/api';

// GET
const salons = await api.get('/salons');

// POST
const salon = await api.post('/salons', { name: 'New Salon' });

// PUT
const updated = await api.put('/salons/1', { name: 'Updated' });

// DELETE
await api.delete('/salons/1');
```

### React Query Mutations

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

function CreateSalonForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: SalonInput) => api.post('/salons', data),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['salons'] });
    },
  });

  const handleSubmit = (data: SalonInput) => {
    mutation.mutate(data);
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## ⚠️ Error Handling

### Error Boundary

Wrap components with ErrorBoundary:

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

### Error Handler Hook

Use the error handler hook:

```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const { handleError, showSuccess } = useErrorHandler();

  const handleSubmit = async (data: any) => {
    try {
      await api.post('/salons', data);
      showSuccess('Salon created successfully');
    } catch (error) {
      handleError(error, 'Failed to create salon');
    }
  };
}
```

## 🔒 Security

### Input Sanitization

Always sanitize user input:

```typescript
import { sanitizeInput, sanitizeHTML } from '@/lib/sanitize';

// Sanitize text input
const clean = sanitizeInput(userInput);

// Sanitize HTML
const cleanHTML = sanitizeHTML(richTextContent);
```

### XSS Prevention

```typescript
// Bad - vulnerable to XSS
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// Good - sanitized
import { sanitizeHTML } from '@/lib/sanitize';
<div dangerouslySetInnerHTML={{ __html: sanitizeHTML(userContent) }} />
```

### Authentication

Check authentication in Server Components:

```typescript
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const user = getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return <div>Protected content for {user.name}</div>;
}
```

## 🧪 Testing

### Component Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Counter } from './Counter';

describe('Counter', () => {
  it('increments count when button is clicked', () => {
    render(<Counter />);
    
    const button = screen.getByText('Increment');
    fireEvent.click(button);
    
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });
});
```

### Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('increments count', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });
});
```

## ⚡ Performance

### Code Splitting

Use dynamic imports for large components:

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
});
```

### Image Optimization

Use Next.js Image component:

```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={100}
  priority
/>
```

### Memoization

Use React memoization:

```typescript
import { useMemo, useCallback } from 'react';

// Memoize expensive calculations
const sortedData = useMemo(() => data.sort(), [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  console.log('clicked');
}, []);
```

## ♿ Accessibility

### Semantic HTML

Use proper HTML elements:

```typescript
// Good
<button onClick={handleClick}>Click me</button>

// Bad
<div onClick={handleClick}>Click me</div>
```

### ARIA Labels

Add labels for screen readers:

```typescript
<button aria-label="Close modal" onClick={onClose}>
  <XIcon />
</button>
```

### Keyboard Navigation

Ensure keyboard accessibility:

```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    handleClick();
  }
};

<div
  role="button"
  tabIndex={0}
  onKeyDown={handleKeyDown}
  onClick={handleClick}
>
  Click me
</div>
```

## 🎯 Best Practices

1. **Keep components small and focused**
2. **Extract reusable logic to hooks**
3. **Use TypeScript types properly**
4. **Handle loading and error states**
5. **Sanitize user input**
6. **Test critical functionality**
7. **Optimize performance**
8. **Ensure accessibility**
9. **Follow naming conventions**
10. **Document complex logic**

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest/docs/react)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
