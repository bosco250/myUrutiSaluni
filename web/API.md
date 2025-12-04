# API Documentation

This document describes how to interact with the backend API from the frontend.

## 🌐 Base Configuration

The API client is configured in `lib/api.ts` with the base URL from environment variables:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
```

## 🔐 Authentication

### Login

```typescript
import { login } from '@/lib/auth';

const user = await login({
  email: 'user@example.com',
  password: 'password123',
});
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "OWNER"
  }
}
```

### Logout

```typescript
import { logout } from '@/lib/auth';

logout();
```

### Get Current User

```typescript
import { getCurrentUser } from '@/lib/auth';

const user = getCurrentUser();
```

## 🏢 Salons

### List Salons

```typescript
import api from '@/lib/api';

const salons = await api.get('/salons');
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Beauty Salon",
    "address": "123 Main St",
    "phone": "+254700000000",
    "email": "info@beautysalon.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Get Salon

```typescript
const salon = await api.get('/salons/1');
```

### Create Salon

```typescript
const salon = await api.post('/salons', {
  name: 'New Salon',
  address: '456 Oak Ave',
  phone: '+254711111111',
  email: 'info@newsalon.com',
});
```

### Update Salon

```typescript
const salon = await api.put('/salons/1', {
  name: 'Updated Salon',
  address: '789 Elm St',
});
```

### Delete Salon

```typescript
await api.delete('/salons/1');
```

## 👥 Customers

### List Customers

```typescript
const customers = await api.get('/customers', {
  params: {
    page: 1,
    limit: 20,
    search: 'john',
  },
});
```

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+254700000000",
      "salonId": 1
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### Get Customer

```typescript
const customer = await api.get('/customers/1');
```

### Create Customer

```typescript
const customer = await api.post('/customers', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+254700000000',
  salonId: 1,
});
```

### Update Customer

```typescript
const customer = await api.put('/customers/1', {
  firstName: 'Jane',
  email: 'jane@example.com',
});
```

### Delete Customer

```typescript
await api.delete('/customers/1');
```

## 📅 Appointments

### List Appointments

```typescript
const appointments = await api.get('/appointments', {
  params: {
    salonId: 1,
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    status: 'confirmed',
  },
});
```

**Response:**
```json
[
  {
    "id": 1,
    "customerId": 1,
    "serviceId": 1,
    "startTime": "2024-01-15T10:00:00.000Z",
    "endTime": "2024-01-15T11:00:00.000Z",
    "status": "confirmed",
    "customer": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "service": {
      "name": "Haircut",
      "price": 1500
    }
  }
]
```

### Get Appointment

```typescript
const appointment = await api.get('/appointments/1');
```

### Create Appointment

```typescript
const appointment = await api.post('/appointments', {
  customerId: 1,
  serviceId: 1,
  startTime: '2024-01-15T10:00:00.000Z',
  endTime: '2024-01-15T11:00:00.000Z',
});
```

### Update Appointment

```typescript
const appointment = await api.put('/appointments/1', {
  status: 'completed',
});
```

### Cancel Appointment

```typescript
await api.delete('/appointments/1');
```

## 💇 Services

### List Services

```typescript
const services = await api.get('/services', {
  params: {
    salonId: 1,
  },
});
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Haircut",
    "description": "Professional haircut",
    "price": 1500,
    "duration": 30,
    "salonId": 1
  }
]
```

### Get Service

```typescript
const service = await api.get('/services/1');
```

### Create Service

```typescript
const service = await api.post('/services', {
  name: 'Haircut',
  description: 'Professional haircut',
  price: 1500,
  duration: 30,
  salonId: 1,
});
```

### Update Service

```typescript
const service = await api.put('/services/1', {
  price: 2000,
  duration: 45,
});
```

### Delete Service

```typescript
await api.delete('/services/1');
```

## 📦 Products

### List Products

```typescript
const products = await api.get('/inventory/products', {
  params: {
    salonId: 1,
    category: 'hair',
  },
});
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Shampoo",
    "description": "Professional shampoo",
    "category": "hair",
    "sku": "SHP-001",
    "quantity": 50,
    "price": 800,
    "salonId": 1
  }
]
```

### Get Product

```typescript
const product = await api.get('/inventory/products/1');
```

### Create Product

```typescript
const product = await api.post('/inventory/products', {
  name: 'Shampoo',
  description: 'Professional shampoo',
  category: 'hair',
  sku: 'SHP-001',
  quantity: 50,
  price: 800,
  salonId: 1,
});
```

### Update Product

```typescript
const product = await api.put('/inventory/products/1', {
  quantity: 45,
  price: 900,
});
```

### Delete Product

```typescript
await api.delete('/inventory/products/1');
```

## 💰 Sales

### List Sales

```typescript
const sales = await api.get('/sales', {
  params: {
    salonId: 1,
    startDate: '2024-01-01',
    endDate: '2024-01-31',
  },
});
```

**Response:**
```json
[
  {
    "id": 1,
    "customerId": 1,
    "salonId": 1,
    "total": 3500,
    "paymentMethod": "cash",
    "status": "completed",
    "items": [
      {
        "serviceId": 1,
        "quantity": 1,
        "price": 1500
      },
      {
        "productId": 1,
        "quantity": 2,
        "price": 1000
      }
    ],
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
]
```

### Get Sale

```typescript
const sale = await api.get('/sales/1');
```

### Create Sale

```typescript
const sale = await api.post('/sales', {
  customerId: 1,
  salonId: 1,
  items: [
    {
      serviceId: 1,
      quantity: 1,
      price: 1500,
    },
    {
      productId: 1,
      quantity: 2,
      price: 1000,
    },
  ],
  paymentMethod: 'cash',
  total: 3500,
});
```

## 👤 Users

### List Users

```typescript
const users = await api.get('/users', {
  params: {
    salonId: 1,
    role: 'STAFF',
  },
});
```

**Response:**
```json
[
  {
    "id": 1,
    "email": "staff@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "STAFF",
    "salonId": 1
  }
]
```

### Get User

```typescript
const user = await api.get('/users/1');
```

### Create User

```typescript
const user = await api.post('/users', {
  email: 'staff@example.com',
  firstName: 'Jane',
  lastName: 'Smith',
  role: 'STAFF',
  salonId: 1,
});
```

### Update User

```typescript
const user = await api.put('/users/1', {
  firstName: 'Janet',
  role: 'MANAGER',
});
```

### Delete User

```typescript
await api.delete('/users/1');
```

## 📊 Dashboard

### Get Dashboard Stats

```typescript
const stats = await api.get('/dashboard/stats', {
  params: {
    salonId: 1,
    startDate: '2024-01-01',
    endDate: '2024-01-31',
  },
});
```

**Response:**
```json
{
  "revenue": {
    "total": 150000,
    "change": 12.5
  },
  "appointments": {
    "total": 45,
    "change": 8.3
  },
  "customers": {
    "total": 120,
    "change": 15.0
  },
  "products": {
    "lowStock": 5
  }
}
```

## 🎫 Memberships

### List Memberships

```typescript
const memberships = await api.get('/memberships', {
  params: {
    salonId: 1,
    status: 'active',
  },
});
```

### Get Membership

```typescript
const membership = await api.get('/memberships/1');
```

### Create Membership

```typescript
const membership = await api.post('/memberships', {
  customerId: 1,
  tierId: 1,
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});
```

### Update Membership

```typescript
const membership = await api.put('/memberships/1', {
  status: 'expired',
});
```

## ⚠️ Error Handling

All API calls return errors in a consistent format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

Use the error handler to handle errors:

```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';

const { handleError } = useErrorHandler();

try {
  await api.post('/salons', data);
} catch (error) {
  handleError(error, 'Failed to create salon');
}
```

## 📝 Notes

- All timestamps are in ISO 8601 format (UTC)
- Dates should be in `YYYY-MM-DD` format
- Phone numbers should include country code (e.g., +254700000000)
- Prices are in cents (e.g., 1500 = KES 15.00)
- All authenticated endpoints require a valid JWT token
- Tokens are automatically included in requests by the API client
