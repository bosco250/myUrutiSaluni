# Salon Services & Products Management Guide

This document explains how salon owners can add, manage, and use services and products in the Salon Association Platform.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Services vs Products](#services-vs-products)
3. [Database Structure](#database-structure)
4. [API Endpoints](#api-endpoints)
5. [Step-by-Step Guide](#step-by-step-guide)
6. [Frontend Implementation](#frontend-implementation)
7. [Common Use Cases](#common-use-cases)
8. [Integration with Sales](#integration-with-sales)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

### What are Services?

**Services** are salon offerings that are performed by employees:
- Examples: Haircut, Hair Coloring, Manicure, Pedicure, Facial Treatment
- They have a **duration** (how long the service takes)
- They have a **base price** (standard price)
- They are **performed** (not sold as physical items)
- They can be booked as **appointments**

### What are Products?

**Products** are physical items that salons sell or use:
- Examples: Shampoo, Conditioner, Hair Dye, Nail Polish, Skincare Products
- They have a **SKU** (stock keeping unit)
- They have a **unit price** (selling price)
- They can be tracked in **inventory** (stock levels)
- They are **sold** (physical items)

### Key Differences:

| Feature | Services | Products |
|---------|----------|----------|
| **Type** | Intangible (performed) | Tangible (physical item) |
| **Duration** | ✅ Yes (minutes) | ❌ No |
| **Inventory** | ❌ No | ✅ Yes (stock tracking) |
| **SKU** | ❌ No | ✅ Yes |
| **Appointments** | ✅ Can be booked | ❌ Cannot be booked |
| **Sales** | ✅ Sold as service | ✅ Sold as product |

---

## 🗄️ Database Structure

### Services Table (`services`)

**Key Fields:**
- `id` (UUID) - Primary key
- `salon_id` (UUID) - Foreign key to `salons.id` (required)
- `code` (string, optional) - Service code (e.g., "SRV-HC-M")
- `name` (string, required) - Service name
- `description` (text, optional) - Service description
- `duration_minutes` (number, default: 30) - How long service takes
- `base_price` (decimal, required) - Standard price in RWF
- `is_active` (boolean, default: true) - Whether service is available
- `metadata` (JSON) - Additional data

**Example:**
```sql
id: "service-123"
salon_id: "salon-456"
code: "SRV-HC-M"
name: "Haircut - Men"
description: "Standard men's haircut"
duration_minutes: 30
base_price: 3000.00
is_active: true
```

### Products Table (`products`)

**Key Fields:**
- `id` (UUID) - Primary key
- `salon_id` (UUID) - Foreign key to `salons.id` (required)
- `sku` (string, optional) - Stock keeping unit (e.g., "SHP-001")
- `name` (string, required) - Product name
- `description` (text, optional) - Product description
- `unit_price` (decimal, optional) - Selling price
- `tax_rate` (decimal, default: 0) - Tax percentage
- `is_inventory_item` (boolean, default: true) - Whether to track stock
- `metadata` (JSON) - Additional data

**Example:**
```sql
id: "product-123"
salon_id: "salon-456"
sku: "SHP-001"
name: "Professional Shampoo"
description: "High-quality salon shampoo"
unit_price: 5000.00
tax_rate: 18.00
is_inventory_item: true
```

### Entity Relationships:

```
salons
    ↓ (one-to-many)
services
    ↓ (used in)
sale_items (when service is sold)

salons
    ↓ (one-to-many)
products
    ↓ (used in)
sale_items (when product is sold)
    ↓ (triggers)
inventory_movements (stock reduction)
```

---

## 🔌 API Endpoints

### Services API

#### **Create Service**

```http
POST /api/services
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "salonId": "salon-uuid",
  "code": "SRV-HC-M",           // Optional
  "name": "Haircut - Men",       // Required
  "description": "Standard men's haircut",  // Optional
  "durationMinutes": 30,         // Optional, default: 30
  "basePrice": 3000,             // Required
  "isActive": true                // Optional, default: true
}

Response:
{
  "id": "service-uuid",
  "salonId": "salon-uuid",
  "code": "SRV-HC-M",
  "name": "Haircut - Men",
  "description": "Standard men's haircut",
  "durationMinutes": 30,
  "basePrice": 3000,
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

**Access Control:**
- `SALON_OWNER`: Can only create services for their own salons
- `SALON_EMPLOYEE`: Can create services for their salon (if authorized)
- `ADMIN`: Can create services for any salon

**Validation:**
- `salonId` must be valid and user must own the salon
- `name` is required
- `basePrice` must be >= 0
- `durationMinutes` must be >= 1

#### **Get All Services**

```http
GET /api/services?salonId=salon-uuid
Authorization: Bearer <token>

Response:
[
  {
    "id": "service-uuid",
    "salonId": "salon-uuid",
    "name": "Haircut - Men",
    "basePrice": 3000,
    "durationMinutes": 30,
    "isActive": true,
    "salon": {
      "id": "salon-uuid",
      "name": "Beauty Salon Kigali"
    }
  }
]
```

**Access Control:**
- `SALON_OWNER`: Only sees services for their own salons
- `SALON_EMPLOYEE`: Only sees services for their salon
- `CUSTOMER`: Can see all active services (public browsing)
- `ADMIN`: Sees all services

#### **Update Service**

```http
PATCH /api/services/:id
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "name": "Haircut - Men (Premium)",  // Optional
  "basePrice": 4000,                   // Optional
  "durationMinutes": 45,               // Optional
  "isActive": false                    // Optional
}
```

**Access Control:**
- `SALON_OWNER`: Can only update services for their own salons
- `SALON_EMPLOYEE`: Can update services for their salon
- `ADMIN`: Can update any service

#### **Delete Service**

```http
DELETE /api/services/:id
Authorization: Bearer <token>
```

**Access Control:**
- `SALON_OWNER`: Can only delete services for their own salons
- `ADMIN`: Can delete any service

**Note:** Deleting a service does NOT delete historical sales that used this service.

---

### Products API

#### **Create Product**

```http
POST /api/inventory/products
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "salonId": "salon-uuid",
  "sku": "SHP-001",                    // Optional
  "name": "Professional Shampoo",     // Required
  "description": "High-quality shampoo", // Optional
  "unitPrice": 5000,                   // Optional
  "taxRate": 18.0,                     // Optional, default: 0
  "isInventoryItem": true              // Optional, default: true
}

Response:
{
  "id": "product-uuid",
  "salonId": "salon-uuid",
  "sku": "SHP-001",
  "name": "Professional Shampoo",
  "description": "High-quality shampoo",
  "unitPrice": 5000,
  "taxRate": 18.0,
  "isInventoryItem": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

**Access Control:**
- `SALON_OWNER`: Can only create products for their own salons
- `SALON_EMPLOYEE`: Can create products for their salon
- `ADMIN`: Can create products for any salon

**Validation:**
- `salonId` must be valid and user must own the salon
- `name` is required
- `unitPrice` must be >= 0 if provided
- `taxRate` must be >= 0 if provided

#### **Get All Products**

```http
GET /api/inventory/products?salonId=salon-uuid
Authorization: Bearer <token>

Response:
[
  {
    "id": "product-uuid",
    "salonId": "salon-uuid",
    "sku": "SHP-001",
    "name": "Professional Shampoo",
    "unitPrice": 5000,
    "taxRate": 18.0,
    "isInventoryItem": true,
    "salon": {
      "id": "salon-uuid",
      "name": "Beauty Salon Kigali"
    }
  }
]
```

**Access Control:**
- `SALON_OWNER`: Only sees products for their own salons
- `SALON_EMPLOYEE`: Only sees products for their salon
- `ADMIN`: Sees all products

---

## 📝 Step-by-Step Guide

### How to Add a Service

#### **Step 1: Login as Salon Owner**

- User must have `SALON_OWNER` role
- User must have an approved membership
- User must have at least one salon created

#### **Step 2: Navigate to Services Page**

**Frontend Route:** `/services` (if implemented) or use API directly

#### **Step 3: Fill in Service Details**

**Required Fields:**
- **Salon**: Select which salon this service belongs to
- **Name**: Service name (e.g., "Haircut - Men")
- **Base Price**: Price in RWF (e.g., 3000)

**Optional Fields:**
- **Code**: Service code for reference (e.g., "SRV-HC-M")
- **Description**: Detailed description
- **Duration**: How long the service takes in minutes (default: 30)
- **Active Status**: Whether service is available (default: true)

#### **Step 4: Submit**

**API Call:**
```typescript
POST /api/services
{
  "salonId": "your-salon-id",
  "name": "Haircut - Men",
  "code": "SRV-HC-M",
  "description": "Standard men's haircut",
  "durationMinutes": 30,
  "basePrice": 3000,
  "isActive": true
}
```

#### **Step 5: Service Created**

- Service is now available for:
  - Booking appointments
  - Adding to sales
  - Viewing in service list

---

### How to Add a Product

#### **Step 1: Login as Salon Owner**

- User must have `SALON_OWNER` role
- User must have an approved membership
- User must have at least one salon created

#### **Step 2: Navigate to Inventory/Products Page**

**Frontend Route:** `/inventory` (if implemented) or use API directly

#### **Step 3: Fill in Product Details**

**Required Fields:**
- **Salon**: Select which salon this product belongs to
- **Name**: Product name (e.g., "Professional Shampoo")

**Optional Fields:**
- **SKU**: Stock keeping unit (e.g., "SHP-001")
- **Description**: Product description
- **Unit Price**: Selling price in RWF
- **Tax Rate**: Tax percentage (default: 0)
- **Is Inventory Item**: Whether to track stock (default: true)

#### **Step 4: Submit**

**API Call:**
```typescript
POST /api/inventory/products
{
  "salonId": "your-salon-id",
  "sku": "SHP-001",
  "name": "Professional Shampoo",
  "description": "High-quality salon shampoo",
  "unitPrice": 5000,
  "taxRate": 18.0,
  "isInventoryItem": true
}
```

#### **Step 5: Product Created**

- Product is now available for:
  - Adding to sales
  - Inventory tracking (if `isInventoryItem = true`)
  - Viewing in product list

**Note:** After creating a product, you may want to add initial stock via inventory movements.

---

## 💻 Frontend Implementation

### Services Management (Example)

**Location:** `web/app/(dashboard)/services/page.tsx` (if exists)

**Key Components:**

```typescript
// Service Form Component
<ServiceForm
  salonId={selectedSalonId}
  onSubmit={async (data) => {
    const response = await api.post('/services', {
      salonId: selectedSalonId,
      ...data
    });
    // Refresh services list
    queryClient.invalidateQueries(['services', selectedSalonId]);
  }}
/>

// Services List Component
const { data: services } = useQuery({
  queryKey: ['services', salonId],
  queryFn: async () => {
    const response = await api.get(`/services?salonId=${salonId}`);
    return response.data;
  },
});
```

**Form Fields:**
- Salon selector (if multiple salons)
- Name (text input, required)
- Code (text input, optional)
- Description (textarea, optional)
- Duration (number input, minutes)
- Base Price (number input, RWF)
- Active toggle (checkbox)

### Products Management (Example)

**Location:** `web/app/(dashboard)/inventory/page.tsx`

**Key Components:**

```typescript
// Product Form Component
<ProductForm
  salonId={selectedSalonId}
  onSubmit={async (data) => {
    const response = await api.post('/inventory/products', {
      salonId: selectedSalonId,
      ...data
    });
    // Refresh products list
    queryClient.invalidateQueries(['products', selectedSalonId]);
  }}
/>

// Products List Component
const { data: products } = useQuery({
  queryKey: ['products', salonId],
  queryFn: async () => {
    const response = await api.get(`/inventory/products?salonId=${salonId}`);
    return response.data;
  },
});
```

**Form Fields:**
- Salon selector (if multiple salons)
- SKU (text input, optional)
- Name (text input, required)
- Description (textarea, optional)
- Unit Price (number input, RWF)
- Tax Rate (number input, percentage)
- Is Inventory Item (checkbox)

---

## 🎯 Common Use Cases

### Use Case 1: Salon Owner Adds Haircut Service

**Scenario:** Salon owner wants to add a men's haircut service.

**Steps:**

1. **Login** as salon owner
2. **Navigate** to services page (or use API)
3. **Fill form:**
   ```json
   {
     "salonId": "salon-123",
     "name": "Haircut - Men",
     "code": "SRV-HC-M",
     "description": "Standard men's haircut with styling",
     "durationMinutes": 30,
     "basePrice": 3000,
     "isActive": true
   }
   ```
4. **Submit** → Service created
5. **Result:** Service now available for:
   - Customers to book appointments
   - Adding to sales transactions
   - Viewing in service catalog

### Use Case 2: Salon Owner Adds Shampoo Product

**Scenario:** Salon owner wants to add a shampoo product to inventory.

**Steps:**

1. **Login** as salon owner
2. **Navigate** to inventory/products page
3. **Fill form:**
   ```json
   {
     "salonId": "salon-123",
     "sku": "SHP-001",
     "name": "Professional Shampoo",
     "description": "High-quality salon shampoo 500ml",
     "unitPrice": 5000,
     "taxRate": 18.0,
     "isInventoryItem": true
   }
   ```
4. **Submit** → Product created
5. **Add initial stock** (via inventory movement):
   ```json
   POST /api/inventory/movements
   {
     "salonId": "salon-123",
     "productId": "product-uuid",
     "movementType": "purchase",
     "quantity": 50,
     "notes": "Initial stock"
   }
   ```
6. **Result:** Product now available for:
   - Adding to sales
   - Inventory tracking
   - Stock management

### Use Case 3: Salon Owner Updates Service Price

**Scenario:** Salon owner wants to increase haircut price.

**Steps:**

1. **Navigate** to services page
2. **Find** the service to update
3. **Click** "Edit"
4. **Update** base price:
   ```json
   PATCH /api/services/:id
   {
     "basePrice": 4000  // Increased from 3000
   }
   ```
5. **Submit** → Service updated
6. **Result:** New price applies to:
   - Future appointments
   - New sales
   - Service catalog display

### Use Case 4: Salon Owner Deactivates Service

**Scenario:** Salon owner temporarily stops offering a service.

**Steps:**

1. **Navigate** to services page
2. **Find** the service
3. **Click** "Edit"
4. **Toggle** `isActive` to `false`:
   ```json
   PATCH /api/services/:id
   {
     "isActive": false
   }
   ```
5. **Submit** → Service deactivated
6. **Result:**
   - Service no longer appears in active service lists
   - Cannot be booked for new appointments
   - Historical data preserved
   - Can be reactivated later

---

## 🔗 Integration with Sales

### How Services are Used in Sales

When creating a sale, services can be added as sale items:

```typescript
POST /api/sales
{
  "salonId": "salon-123",
  "customerId": "customer-456",
  "totalAmount": 3000,
  "items": [
    {
      "serviceId": "service-789",  // Service ID
      "unitPrice": 3000,            // Can override base price
      "quantity": 1,
      "salonEmployeeId": "emp-123" // Optional: assign employee
    }
  ]
}
```

**Note:** 
- `unitPrice` in sale item can override service's `basePrice`
- Service is linked via `serviceId` in `sale_items` table
- Employee can be assigned for commission tracking

### How Products are Used in Sales

When creating a sale, products can be added as sale items:

```typescript
POST /api/sales
{
  "salonId": "salon-123",
  "customerId": "customer-456",
  "totalAmount": 5000,
  "items": [
    {
      "productId": "product-789",  // Product ID
      "unitPrice": 5000,            // Can override product price
      "quantity": 1,
      "salonEmployeeId": "emp-123" // Optional: assign employee
    }
  ]
}
```

**Automatic Side Effects:**
- **Inventory Movement**: If `isInventoryItem = true`, stock is automatically reduced
- **Movement Type**: `CONSUMPTION` (negative quantity)
- **Commission**: Created if employee is assigned

**Example:**
- Product sold: 1 unit
- Inventory movement: `quantity = -1` (stock reduced)
- Stock level updated automatically

---

## 🐛 Troubleshooting

### Issue 1: "You can only create services for your own salon"

**Cause:** User trying to create service for a salon they don't own.

**Solution:**
- Verify `salonId` belongs to the current user
- Check that user has `SALON_OWNER` role
- Ensure salon exists and `salon.ownerId === user.id`

### Issue 2: Service Not Appearing in Sales

**Cause:** Service might be inactive or not properly linked.

**Check:**
1. Is service `isActive = true`?
2. Does service belong to the correct salon?
3. Is service being filtered correctly in frontend?

**Solution:**
```typescript
// Check service status
GET /api/services/:id

// Verify salon ownership
GET /api/salons/:salonId
```

### Issue 3: Product Stock Not Updating

**Cause:** Product might not be set as inventory item.

**Check:**
1. Is `isInventoryItem = true`?
2. Was inventory movement created when product was sold?
3. Check `inventory_movements` table for the product

**Solution:**
```typescript
// Update product to track inventory
PATCH /api/inventory/products/:id
{
  "isInventoryItem": true
}

// Manually create inventory movement if needed
POST /api/inventory/movements
{
  "salonId": "...",
  "productId": "...",
  "movementType": "consumption",
  "quantity": -1,
  "referenceId": "sale-id"
}
```

### Issue 4: Service Price Not Updating in Sales

**Cause:** Sale items use `unitPrice` from the sale, not service's `basePrice`.

**Explanation:**
- Service's `basePrice` is a **default** price
- Sale items can have **custom** `unitPrice`
- When creating sale, you can override the price

**Solution:**
- Update service's `basePrice` for future sales
- For existing sales, update the sale item's `unitPrice` directly
- Or update the sale with new items

### Issue 5: Cannot Delete Service/Product

**Cause:** Service or product might be used in existing sales.

**Check:**
```sql
-- Check if service is used in sales
SELECT COUNT(*) FROM sale_items WHERE service_id = 'service-id';

-- Check if product is used in sales
SELECT COUNT(*) FROM sale_items WHERE product_id = 'product-id';
```

**Solution:**
- **Don't delete** if used in sales (preserve historical data)
- **Deactivate** instead: set `isActive = false`
- Historical sales will still reference the service/product

---

## 📚 Key Files Reference

### Backend:

**Entities:**
- `backend/src/services/entities/service.entity.ts` - Service entity
- `backend/src/inventory/entities/product.entity.ts` - Product entity

**Services:**
- `backend/src/services/services.service.ts` - Service management
- `backend/src/inventory/inventory.service.ts` - Product management

**Controllers:**
- `backend/src/services/services.controller.ts` - Service API endpoints
- `backend/src/inventory/inventory.controller.ts` - Product API endpoints

**DTOs:**
- `backend/src/services/dto/create-service.dto.ts` - Service creation DTO
- `backend/src/inventory/dto/create-product.dto.ts` - Product creation DTO

### Frontend:

**Pages:**
- `web/app/(dashboard)/inventory/page.tsx` - Inventory/Products page (if exists)
- Services page (may need to be created)

**API Client:**
- `web/lib/api.ts` - Base API client

---

## ✅ Quick Reference

### Service Creation Checklist:

- [ ] User is `SALON_OWNER` or `SALON_EMPLOYEE`
- [ ] Salon exists and user owns it
- [ ] Service name provided
- [ ] Base price >= 0
- [ ] Duration >= 1 minute (if provided)
- [ ] Submit to `/api/services`

### Product Creation Checklist:

- [ ] User is `SALON_OWNER` or `SALON_EMPLOYEE`
- [ ] Salon exists and user owns it
- [ ] Product name provided
- [ ] Unit price >= 0 (if provided)
- [ ] Tax rate >= 0 (if provided)
- [ ] Submit to `/api/inventory/products`
- [ ] Add initial stock (if `isInventoryItem = true`)

---

## 🚀 Next Steps

1. **Review this document** to understand services and products
2. **Test API endpoints** using Postman or similar tool
3. **Check frontend implementation** (if exists)
4. **Create services/products** for your salon
5. **Use in sales** to see integration in action

---

**Last Updated:** Based on current codebase analysis
**Maintained By:** Development Team

