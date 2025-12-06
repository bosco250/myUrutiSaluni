# Commission Sources - Complete Guide

## Overview
Employee commissions can come from **two main sources** in the system:

1. **Sales** - When services or products are sold and assigned to an employee
2. **Appointments** - When appointments are completed and assigned to an employee

---

## 1. Sales-Based Commissions

### How It Works
- When a **sale is created** with items (services/products) assigned to an employee
- The system automatically creates a commission record
- Commission amount = `(Sale Item Line Total × Employee Commission Rate) / 100`

### When Commissions Are Created
- ✅ Sale is created with `salonEmployeeId` assigned to sale items
- ✅ Sale item has `lineTotal > 0`
- ✅ Employee has `commissionRate > 0`

### Commission Record Details
```json
{
  "salonEmployeeId": "employee-uuid",
  "saleItemId": "sale-item-uuid",
  "saleAmount": 10000,
  "commissionRate": 15,
  "amount": 1500,
  "metadata": {
    "source": "sale",
    "saleId": "sale-uuid",
    "serviceId": "service-uuid",
    "productId": null
  }
}
```

### Where to See It
- **Commissions Page**: Shows all commissions with "Sale" badge
- **Sales Detail Page**: Shows commissions linked to the sale
- **Employee Profile**: Shows all commissions for that employee

---

## 2. Appointment-Based Commissions

### How It Works
- When an **appointment is marked as "completed"** and has an employee assigned
- The system automatically creates a commission record
- Commission amount = `(Service Amount × Employee Commission Rate) / 100`

### When Commissions Are Created
- ✅ Appointment status changes to `completed`
- ✅ Appointment has `salonEmployeeId` OR `metadata.preferredEmployeeId`
- ✅ Appointment has `serviceAmount > 0` (from the service's `basePrice`)
- ✅ Employee has `commissionRate > 0`

### Employee Assignment Methods
1. **Direct Assignment**: `appointment.salonEmployeeId` is set
2. **Metadata Assignment**: `appointment.metadata.preferredEmployeeId` is set (automatically updates `salonEmployeeId`)

### Commission Record Details
```json
{
  "salonEmployeeId": "employee-uuid",
  "saleItemId": null,
  "saleAmount": 5000,
  "commissionRate": 20,
  "amount": 1000,
  "metadata": {
    "source": "appointment",
    "appointmentId": "appointment-uuid",
    "serviceId": "service-uuid"
  }
}
```

### Where to See It
- **Commissions Page**: Shows all commissions with "Appointment" badge
- **Appointment Detail Page**: Shows commission earned for completed appointments
- **Employee Profile**: Shows all commissions for that employee

---

## Commission Tracking in UI

### Commissions Page Features
1. **Source Column**: Shows badge indicating "Sale" or "Appointment"
2. **Source Links**: Click to view the original sale or appointment
3. **Metadata Display**: Shows all relevant information about the commission source

### Visual Indicators
- 🔵 **Blue Badge (Sale)**: Commission from a sale transaction
- 🟢 **Green Badge (Appointment)**: Commission from a completed appointment
- 👁️ **View Links**: Direct links to view the source sale/appointment

---

## Commission Calculation

### Formula
```
Commission Amount = (Sale/Service Amount × Commission Rate) / 100
```

### Example 1: Sale Commission
- Service sold: RWF 10,000
- Employee commission rate: 15%
- **Commission = RWF 1,500**

### Example 2: Appointment Commission
- Service completed: RWF 5,000
- Employee commission rate: 20%
- **Commission = RWF 1,000**

---

## Commission Status

### Unpaid Commissions
- Created automatically when sale/appointment is completed
- Shown with "Unpaid" status
- Can be marked as paid individually or in bulk
- Can be included in payroll runs

### Paid Commissions
- Marked as paid manually or via payroll
- Shows payment method and reference
- Shows date when paid
- Linked to payroll item if paid via payroll

---

## Backend Implementation

### Key Files
- `backend/src/commissions/commissions.service.ts` - Commission creation logic
- `backend/src/sales/sales.service.ts` - Sales commission processing
- `backend/src/appointments/appointments.service.ts` - Appointment commission processing
- `backend/src/commissions/entities/commission.entity.ts` - Commission entity

### Commission Creation Flow

#### For Sales:
1. Sale is created with items
2. `SalesService.create()` calls `processCommissions()`
3. For each sale item with `salonEmployeeId`:
   - Calls `CommissionsService.createCommission()`
   - Passes `saleItemId`, `lineTotal`, and metadata

#### For Appointments:
1. Appointment status changes to `completed`
2. `AppointmentsService.update()` checks for employee assignment
3. If employee found and `serviceAmount > 0`:
   - Calls `CommissionsService.createCommission()`
   - Passes `null` for `saleItemId`, `serviceAmount`, and metadata

---

## Metadata Structure

### Sale Commission Metadata
```typescript
{
  source: 'sale',
  saleId: string,
  serviceId?: string,
  productId?: string
}
```

### Appointment Commission Metadata
```typescript
{
  source: 'appointment',
  appointmentId: string,
  serviceId: string
}
```

---

## Troubleshooting

### Commission Not Created from Sale
1. ✅ Check if employee is assigned to sale item
2. ✅ Check if `lineTotal > 0`
3. ✅ Check if employee has `commissionRate > 0`
4. ✅ Check backend logs for commission processing

### Commission Not Created from Appointment
1. ✅ Check if appointment status is `completed`
2. ✅ Check if employee is assigned (`salonEmployeeId` or `metadata.preferredEmployeeId`)
3. ✅ Check if `serviceAmount > 0`
4. ✅ Check if employee has `commissionRate > 0`
5. ✅ Check backend logs for commission creation

### Viewing Commission Sources
- Go to **Commissions** page
- Look at the **Source** column
- Click **View Sale** or **View Appointment** to see details
- Check metadata in commission details

---

## Summary

✅ **Sales**: Commissions created automatically when services/products are sold with employee assignment  
✅ **Appointments**: Commissions created automatically when appointments are completed with employee assignment  
✅ **Tracking**: All commissions show their source (Sale or Appointment) with links to view details  
✅ **Metadata**: Each commission includes metadata linking it back to its source  
✅ **UI**: Commissions page displays source badges and provides navigation to source records

