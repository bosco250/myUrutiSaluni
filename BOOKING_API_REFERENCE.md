# Enhanced Booking System - API Reference

## 🎯 Overview

This document provides a complete API reference for the enhanced calendar-based appointment booking system.

## 🔗 Base URL

```
http://localhost:3000/api
```

## 🔐 Authentication

All endpoints require JWT authentication via Bearer token:

```
Authorization: Bearer <your-jwt-token>
```

## 📅 Availability Endpoints

### Get Employee Availability Overview

Get availability status for multiple days.

```http
GET /appointments/availability/{employeeId}
```

**Query Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD), defaults to today
- `endDate` (optional): End date (YYYY-MM-DD), defaults to 30 days from start
- `serviceId` (optional): Service ID to calculate duration-specific availability
- `duration` (optional): Service duration in minutes (overrides service duration)

**Example Request:**
```http
GET /appointments/availability/emp-123?startDate=2024-01-01&endDate=2024-01-31&serviceId=svc-456
```

**Response:**
```json
{
  "data": [
    {
      "date": "2024-01-15",
      "status": "available",
      "totalSlots": 16,
      "availableSlots": 12
    },
    {
      "date": "2024-01-16",
      "status": "partially_booked",
      "totalSlots": 16,
      "availableSlots": 6
    }
  ]
}
```

### Get Time Slots for Specific Date

Get detailed time slots with availability status.

```http
GET /appointments/availability/{employeeId}/slots
```

**Query Parameters:**
- `date` (required): Date to get slots for (YYYY-MM-DD)
- `serviceId` (optional): Service ID to get service-specific slots
- `duration` (optional): Service duration in minutes

**Example Request:**
```http
GET /appointments/availability/emp-123/slots?date=2024-01-15&serviceId=svc-456
```

**Response:**
```json
{
  "data": [
    {
      "startTime": "09:00",
      "endTime": "10:00",
      "available": true,
      "price": 25000
    },
    {
      "startTime": "10:00",
      "endTime": "11:00",
      "available": false,
      "reason": "Already booked"
    }
  ],
  "meta": {
    "date": "2024-01-15",
    "employeeId": "emp-123",
    "serviceId": "svc-456",
    "duration": 60,
    "totalSlots": 16,
    "availableSlots": 12
  }
}
```

### Validate Booking Request

Validate if a booking can be made at the specified time.

```http
POST /appointments/availability/validate
```

**Request Body:**
```json
{
  "employeeId": "emp-123",
  "serviceId": "svc-456",
  "scheduledStart": "2024-01-15T14:00:00.000Z",
  "scheduledEnd": "2024-01-15T15:00:00.000Z",
  "excludeAppointmentId": "apt-789" // Optional, for updates
}
```

**Response (Valid):**
```json
{
  "valid": true
}
```

**Response (Invalid with Suggestions):**
```json
{
  "valid": false,
  "reason": "Time slot is already booked",
  "conflicts": [
    {
      "id": "apt-456",
      "scheduledStart": "2024-01-15T14:00:00.000Z",
      "scheduledEnd": "2024-01-15T15:00:00.000Z"
    }
  ],
  "suggestions": [
    {
      "startTime": "15:00",
      "endTime": "16:00",
      "available": true,
      "price": 25000
    }
  ]
}
```

### Get Next Available Slot

Find the next available time slot for an employee.

```http
GET /appointments/availability/{employeeId}/next-available
```

**Query Parameters:**
- `serviceId` (optional): Service ID to get service-specific availability
- `duration` (optional): Service duration in minutes

**Response:**
```json
{
  "available": true,
  "nextSlot": {
    "date": "2024-01-16",
    "startTime": "09:00",
    "endTime": "10:00",
    "price": 25000
  }
}
```

### Get Availability Summary

Get a quick overview of employee availability.

```http
GET /appointments/availability/{employeeId}/summary
```

**Query Parameters:**
- `date` (optional): Date to get summary for (defaults to today)

**Response:**
```json
{
  "employeeId": "emp-123",
  "date": "2024-01-15",
  "isWorking": true,
  "totalSlots": 16,
  "availableSlots": 12,
  "bookedSlots": 4,
  "utilizationRate": 25.0,
  "nextAvailable": {
    "date": "2024-01-16",
    "time": "09:00"
  }
}
```

## 👥 Employee Schedule Management

### Get Employee Schedule

Get complete schedule (working hours + availability rules) for an employee.

```http
GET /appointments/employees/{employeeId}/schedule
```

**Response:**
```json
{
  "data": {
    "workingHours": [
      {
        "id": "wh-123",
        "employeeId": "emp-123",
        "dayOfWeek": 1,
        "startTime": "09:00",
        "endTime": "17:00",
        "breaks": [
          {
            "startTime": "12:00",
            "endTime": "13:00"
          }
        ],
        "isActive": true
      }
    ],
    "availabilityRules": {
      "id": "ar-123",
      "employeeId": "emp-123",
      "advanceBookingDays": 30,
      "minLeadTimeHours": 2,
      "maxBookingsPerDay": 10,
      "bufferMinutes": 15,
      "blackoutDates": ["2024-12-25", "2024-01-01"]
    }
  }
}
```

### Set Working Hours

Set working hours for a specific day.

```http
POST /appointments/employees/{employeeId}/working-hours
```

**Request Body:**
```json
{
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "17:00",
  "breaks": [
    {
      "startTime": "12:00",
      "endTime": "13:00"
    }
  ]
}
```

### Set Weekly Schedule

Set working hours for the entire week.

```http
PUT /appointments/employees/{employeeId}/weekly-schedule
```

**Request Body:**
```json
[
  {
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "17:00",
    "breaks": [{"startTime": "12:00", "endTime": "13:00"}]
  },
  {
    "dayOfWeek": 2,
    "startTime": "09:00",
    "endTime": "17:00",
    "breaks": [{"startTime": "12:00", "endTime": "13:00"}]
  }
]
```

### Set Availability Rules

Configure booking rules for an employee.

```http
PUT /appointments/employees/{employeeId}/availability-rules
```

**Request Body:**
```json
{
  "advanceBookingDays": 30,
  "minLeadTimeHours": 2,
  "maxBookingsPerDay": 10,
  "bufferMinutes": 15,
  "blackoutDates": ["2024-12-25", "2024-01-01"]
}
```

### Add Blackout Dates

Add vacation or unavailable dates.

```http
POST /appointments/employees/{employeeId}/blackout-dates
```

**Request Body:**
```json
{
  "dates": ["2024-03-15", "2024-03-16", "2024-03-17"]
}
```

### Remove Blackout Dates

Remove previously set blackout dates.

```http
DELETE /appointments/employees/{employeeId}/blackout-dates
```

**Request Body:**
```json
{
  "dates": ["2024-03-17"]
}
```

### Setup Standard Schedule

Quick setup with standard working hours and default rules.

```http
POST /appointments/employees/{employeeId}/setup/standard
```

**Response:**
```json
{
  "data": {
    "workingHours": [
      // Standard Mon-Fri 9-5 schedule
    ],
    "availabilityRules": {
      // Default rules (30 days advance, 2 hours lead time, etc.)
    }
  }
}
```

### Remove Working Hours

Remove working hours for a specific day.

```http
DELETE /appointments/employees/{employeeId}/working-hours/{dayOfWeek}
```

## 📋 Appointment Management

### Create Appointment (Enhanced)

Create appointment with the new booking flow validation.

```http
POST /appointments
```

**Request Body:**
```json
{
  "customerId": "cust-123",
  "serviceId": "svc-456",
  "salonId": "salon-789",
  "scheduledStart": "2024-01-15T14:00:00.000Z",
  "scheduledEnd": "2024-01-15T15:00:00.000Z",
  "notes": "First time customer",
  "metadata": {
    "preferredEmployeeId": "emp-123",
    "preferredEmployeeName": "John Doe"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "apt-new-123",
    "customerId": "cust-123",
    "serviceId": "svc-456",
    "salonId": "salon-789",
    "scheduledStart": "2024-01-15T14:00:00.000Z",
    "scheduledEnd": "2024-01-15T15:00:00.000Z",
    "status": "booked",
    "notes": "First time customer",
    "metadata": {
      "preferredEmployeeId": "emp-123",
      "preferredEmployeeName": "John Doe"
    },
    "createdAt": "2024-01-10T10:30:00.000Z"
  }
}
```

## 🔍 Error Responses

### Validation Error (422)
```json
{
  "statusCode": 422,
  "message": [
    "scheduledStart must be a valid ISO 8601 date string"
  ],
  "error": "Unprocessable Entity"
}
```

### Booking Conflict (400)
```json
{
  "statusCode": 400,
  "message": "John Doe is not available at this time. Please select another time slot.",
  "error": "Bad Request"
}
```

### Unauthorized (401)
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Forbidden (403)
```json
{
  "statusCode": 403,
  "message": "You can only manage schedules for employees in your own salon",
  "error": "Forbidden"
}
```

## 📊 Usage Examples

### Complete Booking Flow

```javascript
// 1. Get employee availability for the month
const availability = await fetch('/api/appointments/availability/emp-123?startDate=2024-01-01&endDate=2024-01-31&serviceId=svc-456');

// 2. Get time slots for selected date
const timeSlots = await fetch('/api/appointments/availability/emp-123/slots?date=2024-01-15&serviceId=svc-456');

// 3. Validate booking before submission
const validation = await fetch('/api/appointments/availability/validate', {
  method: 'POST',
  body: JSON.stringify({
    employeeId: 'emp-123',
    serviceId: 'svc-456',
    scheduledStart: '2024-01-15T14:00:00.000Z',
    scheduledEnd: '2024-01-15T15:00:00.000Z'
  })
});

// 4. Create appointment if validation passes
if (validation.valid) {
  const appointment = await fetch('/api/appointments', {
    method: 'POST',
    body: JSON.stringify({
      customerId: 'cust-123',
      serviceId: 'svc-456',
      salonId: 'salon-789',
      scheduledStart: '2024-01-15T14:00:00.000Z',
      scheduledEnd: '2024-01-15T15:00:00.000Z',
      metadata: {
        preferredEmployeeId: 'emp-123',
        preferredEmployeeName: 'John Doe'
      }
    })
  });
}
```

### Employee Schedule Setup

```javascript
// Set up a new employee with standard schedule
await fetch('/api/appointments/employees/emp-123/setup/standard', {
  method: 'POST'
});

// Customize working hours for specific days
await fetch('/api/appointments/employees/emp-123/working-hours', {
  method: 'POST',
  body: JSON.stringify({
    dayOfWeek: 6, // Saturday
    startTime: '09:00',
    endTime: '15:00',
    breaks: []
  })
});

// Add vacation dates
await fetch('/api/appointments/employees/emp-123/blackout-dates', {
  method: 'POST',
  body: JSON.stringify({
    dates: ['2024-03-15', '2024-03-16', '2024-03-17']
  })
});
```

## 🎯 Rate Limits

- **Availability queries**: 100 requests per minute per user
- **Booking validation**: 50 requests per minute per user
- **Appointment creation**: 20 requests per minute per user
- **Schedule management**: 30 requests per minute per user

## 📱 Mobile App Integration

All endpoints are optimized for mobile usage with:
- Minimal response payloads
- Efficient caching headers
- Real-time updates support
- Offline-friendly error handling

## 🔧 Development Tools

### Swagger Documentation
Access interactive API documentation at:
```
http://localhost:3000/api/docs
```

### Postman Collection
Import the API collection for testing:
```json
{
  "info": {
    "name": "Enhanced Booking System API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{jwt_token}}",
        "type": "string"
      }
    ]
  }
}
```

This API provides a complete foundation for building world-class appointment booking experiences with real-time availability, intelligent scheduling, and comprehensive employee management.