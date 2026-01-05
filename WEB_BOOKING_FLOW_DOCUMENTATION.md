# Web Booking/Appointment Flow - Complete Documentation

## Overview

This document provides a comprehensive explanation of how the booking/appointment system works in the web application, from user interaction to backend processing and data persistence.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Frontend Components](#frontend-components)
3. [API Integration Layer](#api-integration-layer)
4. [Backend Services](#backend-services)
5. [Complete Booking Flow](#complete-booking-flow)
6. [Availability Calculation Logic](#availability-calculation-logic)
7. [Data Structures](#data-structures)
8. [Key Features](#key-features)
9. [Error Handling](#error-handling)

---

## Architecture Overview

The booking system follows a multi-step wizard pattern with the following layers:

```
User Interface (React Components)
    ↓
API Client Layer (lib/availability.ts)
    ↓
Backend API Endpoints (NestJS Controllers)
    ↓
Business Logic (Services)
    ↓
Database (TypeORM Entities)
```

---

## Frontend Components

### 1. **CustomerBookingModal** (`web/components/appointments/CustomerBookingModal.tsx`)

**Purpose**: Main booking modal for customers booking from a salon detail page.

**Key Features**:

- 3-step wizard: Employee Selection → Date & Time → Confirmation
- Supports "any employee" option (no preference)
- Real-time availability checking
- Validation before final submission

**State Management**:

- Uses React Query (`@tanstack/react-query`) for data fetching
- Local state for step navigation and selections
- Automatic refetch on validation failures

**Steps**:

1. **Employee Selection**: Choose specific stylist or "any available"
2. **Date & Time**: Select date from calendar, then time slot
3. **Confirmation**: Review details, add notes, confirm booking

**Key Functions**:

- `handleConfirmBooking()`: Validates booking, then creates appointment
- Uses `validateBooking()` API before final submission
- Refreshes availability data if validation fails

---

### 2. **CalendarBookingModal** (`web/components/appointments/CalendarBookingModal.tsx`)

**Purpose**: Full booking flow from calendar view (salon → service → employee → datetime → confirm).

**Key Features**:

- 5-step wizard: Salon → Service → Employee → Date & Time → Confirmation
- More comprehensive than CustomerBookingModal
- Includes customer selection for walk-ins

**Steps**:

1. **Salon Selection**: Choose salon
2. **Service Selection**: Choose service from selected salon
3. **Employee Selection**: Choose stylist
4. **Date & Time**: Calendar + time slot picker
5. **Confirmation**: Review, select customer, add notes

---

### 3. **TimeSlotPicker** (`web/components/appointments/TimeSlotPicker.tsx`)

**Purpose**: Displays and allows selection of available time slots.

**Key Features**:

- Shows available slots prominently (green, clickable)
- Shows unavailable slots in collapsed section (gray, strikethrough)
- Displays reason for unavailability (e.g., "Booked", "Past time slot")
- Filters slots by `available: boolean` property
- Formats time in 12-hour format (e.g., "2:30 PM")

**Visual Indicators**:

- **Available**: Green background, clickable, shows time
- **Unavailable**: Gray background, strikethrough text, shows reason
- **Selected**: Primary color with ring, highlighted

**Data Processing**:

```typescript
const availableSlots = slots.filter((slot) => slot.available);
const unavailableSlots = slots.filter((slot) => !slot.available);
```

---

### 4. **AvailabilityCalendar** (`web/components/appointments/AvailabilityCalendar.tsx`)

**Purpose**: Calendar view showing day-level availability status.

**Key Features**:

- Month view with navigation
- Color-coded days based on availability status:
  - **Green**: Available (many slots)
  - **Yellow**: Partially booked
  - **Red**: Fully booked
  - **Gray**: Unavailable
- Shows slot count on each day
- Disables past dates and fully booked dates

**Status Colors**:

```typescript
available: green - 100 / green - 500;
partially_booked: yellow - 100 / yellow - 500;
fully_booked: red - 100 / red - 500;
unavailable: gray - 100 / gray - 400;
```

---

### 5. **BookingFlow** (`web/components/booking/BookingFlow.tsx`)

**Purpose**: Alternative booking flow component (used in different contexts).

**Key Features**:

- 5-step process: Service → Employee → Calendar → Time Slot → Confirmation → Success
- Supports pre-selected salon/service/employee via props
- Progress bar visualization
- Success screen with calendar integration

---

## API Integration Layer

### **availability.ts** (`web/lib/availability.ts`)

**Purpose**: API client for all availability-related endpoints.

**Key Functions**:

#### 1. `getEmployeeAvailability(employeeId, startDate, endDate, serviceId?, duration?)`

**Endpoint**: `GET /appointments/availability/:employeeId?startDate=...&endDate=...`
**Returns**: `DayAvailability[]` - Array of day-level availability data

**Usage**:

```typescript
const availability = await getEmployeeAvailability(
  employeeId,
  "2024-01-01",
  "2024-01-30",
  serviceId,
  60 // duration in minutes
);
```

**Response Structure**:

```typescript
interface DayAvailability {
  date: string; // YYYY-MM-DD
  status: "available" | "partially_booked" | "fully_booked" | "unavailable";
  totalSlots: number;
  availableSlots: number;
  timeSlots?: TimeSlot[]; // Optional detailed slots
}
```

---

#### 2. `getTimeSlots(employeeId, date, serviceId?, duration?)`

**Endpoint**: `GET /appointments/availability/:employeeId/slots?date=...&serviceId=...&duration=...`
**Returns**: `{ slots: TimeSlot[], meta: { totalSlots, availableSlots } }`

**Usage**:

```typescript
const { slots, meta } = await getTimeSlots(
  employeeId,
  "2024-01-15",
  serviceId,
  60
);
```

**Response Structure**:

```typescript
interface TimeSlot {
  startTime: string; // HH:mm format (e.g., "14:30")
  endTime: string; // HH:mm format (e.g., "15:30")
  available: boolean; // CRITICAL: true = available, false = booked/unavailable
  reason?: string; // e.g., "Already booked", "Past time slot", "Break time"
  price?: number; // Optional service price
}
```

**Critical Note**: The `available` property is a **strict boolean**. Any slot with `available: false` should be:

- Visually disabled (gray, strikethrough)
- Not selectable
- Show reason if provided

---

#### 3. `validateBooking(data)`

**Endpoint**: `POST /appointments/availability/validate`
**Purpose**: Validates a booking request before final submission to prevent double bookings.

**Request**:

```typescript
interface ValidateBookingRequest {
  employeeId: string;
  serviceId: string;
  scheduledStart: string; // ISO 8601 format
  scheduledEnd: string; // ISO 8601 format
  excludeAppointmentId?: string; // For updates
}
```

**Response**:

```typescript
interface ValidateBookingResponse {
  valid: boolean;
  conflicts?: Array<{
    id: string;
    scheduledStart: string;
    scheduledEnd: string;
  }>;
  suggestions?: TimeSlot[]; // Alternative available slots
  reason?: string; // Why validation failed
}
```

**Usage in Web**:

```typescript
// In CustomerBookingModal.handleConfirmBooking()
const validation = await validateBooking({
  employeeId: queryEmployeeId,
  serviceId: service.id,
  scheduledStart: scheduledStart.toISOString(),
  scheduledEnd: scheduledEnd.toISOString(),
});

if (!validation.valid) {
  setError(validation.reason || "This time slot is no longer available");
  refetchAvailability(); // Refresh slots
  refetchSlots();
  return; // Don't proceed with booking
}
```

**Critical**: This validation is called **immediately before** creating the appointment to catch any last-minute conflicts.

---

## Backend Services

### **AvailabilityService** (`backend/src/appointments/services/availability.service.ts`)

#### 1. `getTimeSlots(employeeId, date, serviceId?, duration?)`

**Purpose**: Generates time slots for a specific date and marks them as available/unavailable.

**Process**:

1. **Get Service Details**: Fetches service duration and price
2. **Get Working Hours**:
   - First tries employee-specific working hours
   - Falls back to salon operating hours if none
   - Defaults to 9:00-18:00 if neither exists
3. **Get Availability Rules**: Checks blackout dates, advance booking limits, minimum lead time
4. **Get Existing Appointments**: Calls `getEmployeeAppointments()` to fetch conflicting appointments
5. **Generate Time Slots**: Creates slots every 30 minutes within working hours
6. **Mark Availability**: For each slot:
   - Checks if it's in the past (if today)
   - Checks if it conflicts with existing appointments
   - Checks if it violates buffer time rules
   - Sets `available: false` with appropriate `reason` if unavailable

**Key Method**: `getConflictingAppointments()`

```typescript
private async getConflictingAppointments(
  employeeId: string,
  date: Date,
  serviceDuration: number,
  appointments: Appointment[],
): Promise<Map<string, { reason: string }>>
```

This method:

- Iterates through all appointments for the employee on that date
- For each appointment, marks overlapping time slots as unavailable
- Returns a map of slot start times to unavailability reasons

**Critical Database Query**:

```typescript
// In getEmployeeAppointments()
const appointments = await this.appointmentsRepository
  .createQueryBuilder("appointment")
  .where("appointment.salonEmployeeId = :employeeId", { employeeId })
  .andWhere("appointment.status != :cancelled", { cancelled: "cancelled" })
  .andWhere("appointment.status != :noShow", { noShow: "no_show" })
  .andWhere("DATE(appointment.scheduledStart) = DATE(:date)", { date })
  .getMany();
```

**IMPORTANT**: The query uses:

- `appointment.salonEmployeeId` (camelCase property name) - This is correct for TypeORM QueryBuilder
- However, the actual database column is `salon_employee_id` (snake_case)
- TypeORM automatically maps between property names and column names

**Slot Generation Logic**:

```typescript
// Generate slots every 15 minutes (slotInterval = 15)
let currentSlot = startTime;
const slotInterval = 15; // 15-minute intervals

while (isBefore(currentSlot, endTime)) {
  const slotEnd = addMinutes(currentSlot, serviceDuration);

  // Check if slot fits within working hours
  if (isAfter(slotEnd, endTime)) {
    break; // Slot would extend past working hours
  }

  // ... availability checks ...

  slots.push({
    startTime: format(currentSlot, "HH:mm"),
    endTime: format(slotEnd, "HH:mm"),
    available, // true or false
    reason, // undefined if available
    price: servicePrice,
  });

  currentSlot = addMinutes(currentSlot, slotInterval);
}
```

**Note**: Slots are generated every **15 minutes**, not 30 minutes. This allows for more granular availability checking and better slot selection.

---

#### 2. `getEmployeeAppointments(employeeId, startDate, endDate)`

**Purpose**: Fetches all appointments for an employee in a date range, excluding cancelled/no-show.

**Query**:

```typescript
const appointments = await this.appointmentsRepository
  .createQueryBuilder("appointment")
  .where("appointment.salonEmployeeId = :employeeId", { employeeId })
  .andWhere("appointment.status != :cancelled", { cancelled: "cancelled" })
  .andWhere("appointment.status != :noShow", { noShow: "no_show" })
  .andWhere("appointment.scheduledStart >= :startDate", { startDate })
  .andWhere("appointment.scheduledEnd <= :endDate", { endDate })
  .getMany();
```

**Returns**: `Appointment[]` - Array of appointments that could conflict with new bookings.

---

#### 3. `getConflictingAppointments(employeeId, date, serviceDuration, appointments)`

**Purpose**: Determines which time slots conflict with existing appointments.

**Logic**:

1. For each existing appointment:
   - Calculate appointment start/end times
   - For each generated time slot:
     - Check if slot overlaps with appointment
     - Overlap condition: `slotStart < appointmentEnd && slotEnd > appointmentStart`
     - If overlap, mark slot as unavailable with reason "Already booked"

2. Also checks:
   - Past time slots (if date is today)
   - Buffer time requirements (if configured)
   - Break times (if configured)

**Returns**: `Map<string, { reason: string }>` - Map of slot start times to conflict reasons.

---

## Complete Booking Flow

### Step-by-Step Process

#### **Phase 1: Initialization**

1. User opens booking modal (from salon detail page or calendar)
2. Modal fetches:
   - Salon details (including operating hours)
   - Available employees
   - Service details (if pre-selected)

#### **Phase 2: Employee Selection**

1. User selects employee (or "any available")
2. If specific employee:
   - Query availability for next 30 days: `getEmployeeAvailability()`
   - Display calendar with day-level availability
3. If "any employee":
   - Generate availability based on salon operating hours
   - Don't query backend (frontend generates slots)

#### **Phase 3: Date Selection**

1. User clicks date on calendar
2. If specific employee:
   - Query detailed time slots: `getTimeSlots(employeeId, date, serviceId, duration)`
   - Backend calculates:
     - Working hours for that day
     - Existing appointments
     - Conflicts
     - Marks slots as available/unavailable
3. If "any employee":
   - Frontend generates slots from salon operating hours
   - No backend query needed

#### **Phase 4: Time Slot Selection**

1. User views time slots in `TimeSlotPicker`
2. Available slots: Green, clickable, show time
3. Unavailable slots: Gray, strikethrough, show reason, not clickable
4. User selects an available slot
5. Selection stored in state: `selectedSlot`

#### **Phase 5: Confirmation**

1. User reviews booking details
2. Optionally adds notes
3. Clicks "Confirm Booking"

#### **Phase 6: Validation (CRITICAL)**

1. **Before creating appointment**, web calls `validateBooking()`:

   ```typescript
   const validation = await validateBooking({
     employeeId: queryEmployeeId,
     serviceId: service.id,
     scheduledStart: scheduledStart.toISOString(),
     scheduledEnd: scheduledEnd.toISOString(),
   });
   ```

2. Backend checks:
   - If slot is still available
   - If there are any conflicts
   - Returns `valid: false` if conflict found

3. If validation fails:
   - Show error message
   - Refresh availability data (`refetchAvailability()`)
   - Refresh time slots (`refetchSlots()`)
   - **DO NOT** create appointment
   - Optionally show alternative suggestions

4. If validation passes:
   - Proceed to create appointment

#### **Phase 7: Appointment Creation**

1. Call `POST /appointments` with:

   ```typescript
   {
     salonId: string,
     serviceId: string,
     salonEmployeeId?: string, // Only if specific employee selected
     customerId?: string,
     scheduledStart: string, // ISO 8601
     scheduledEnd: string,   // ISO 8601
     status: 'pending' | 'booked',
     notes?: string,
   }
   ```

2. Backend:
   - Creates appointment record
   - Returns created appointment

3. Frontend:
   - Shows success screen
   - Invalidates appointment queries (refreshes lists)
   - Closes modal

---

## Employee Availability Calculation - Complete Process

This section provides a **detailed, step-by-step explanation** of how employee availability is calculated during the booking process. This is the **core logic** that determines which time slots are available or unavailable.

---

### Overview: The `getTimeSlots()` Method

When a user selects a date for booking, the backend calls `getTimeSlots(employeeId, date, serviceId?, duration?)` which performs a comprehensive availability calculation.

**Method Signature**:

```typescript
async getTimeSlots(
  employeeId: string,
  date: Date,
  serviceId?: string,
  duration?: number,
): Promise<TimeSlot[]>
```

**Returns**: Array of `TimeSlot` objects, each with:

- `startTime`: "HH:mm" format (e.g., "14:30")
- `endTime`: "HH:mm" format (e.g., "15:30")
- `available`: **boolean** - `true` if bookable, `false` if not
- `reason`: Optional string explaining why unavailable (e.g., "Already booked")
- `price`: Optional service price

---

### Step-by-Step Availability Calculation Process

#### **Step 1: Get Service Details**

```typescript
// Get service duration and price
let serviceDuration = duration || 30; // Default 30 minutes
let servicePrice: number | undefined;

if (serviceId) {
  const service = await this.servicesRepository.findOne({
    where: { id: serviceId },
  });
  if (service) {
    serviceDuration = service.durationMinutes || 30;
    servicePrice = service.basePrice ? Number(service.basePrice) : undefined;
  }
}
```

**Purpose**: Determines how long the appointment will be and its price.

---

#### **Step 2: Get Employee Working Hours**

**Priority Order**:

1. **Employee-specific working hours** (if configured)
2. **Salon operating hours** (fallback)
3. **Default hours 9:00-18:00** (if neither exists)

```typescript
// Get day of week (0=Sunday, 1=Monday, etc.)
const dayOfWeek = date.getDay();

// Try employee-specific working hours first
let workingHours = await this.workingHoursRepository.findOne({
  where: { employeeId, dayOfWeek, isActive: true },
});

// FALLBACK: If no employee hours, use salon operating hours
if (!workingHours) {
  workingHours = await this.getSalonOperatingHoursAsWorkingHours(
    employeeId,
    dayOfWeek
  );
}

// If still no hours, defaults to 9:00-18:00
```

**Working Hours Structure**:

```typescript
{
  employeeId: string;
  dayOfWeek: number;      // 0-6 (Sunday-Saturday)
  startTime: string;       // "09:00"
  endTime: string;        // "18:00"
  breaks?: Array<{        // Optional break times
    startTime: string;     // "12:00"
    endTime: string;       // "13:00"
  }>;
  isActive: boolean;
}
```

**Critical**: Working hours determine the **time window** in which slots can be generated.

---

#### **Step 3: Get Availability Rules**

```typescript
let rules: EmployeeAvailabilityRules | null = null;
try {
  rules = await this.getEmployeeAvailabilityRules(employeeId);
} catch (error) {
  // If no rules configured, continue with defaults
  this.logger.warn(`Could not fetch availability rules: ${error.message}`);
}
```

**Availability Rules Structure**:

```typescript
{
  employeeId: string;
  blackoutDates?: string[];        // ["2024-12-25", "2024-01-01"]
  advanceBookingDays?: number;     // e.g., 30 (max days in advance)
  minLeadTimeHours?: number;       // e.g., 2 (minimum hours before booking)
  bufferMinutes?: number;          // e.g., 15 (buffer between appointments)
}
```

**Purpose**: Applies business rules like blackout dates, advance booking limits, minimum lead time, and buffer requirements.

---

#### **Step 4: Check Blackout Dates**

```typescript
// Check if date is in blackout dates
if (rules?.blackoutDates?.includes(format(date, "yyyy-MM-dd"))) {
  return []; // Return empty array - no slots available for this day
}
```

**Result**: If date is blacked out, **no slots are generated** for that day.

---

#### **Step 5: Check Advance Booking Limits**

```typescript
// Check advance booking limits
if (rules?.advanceBookingDays) {
  const maxBookingDate = addDays(new Date(), rules.advanceBookingDays);
  if (isAfter(date, maxBookingDate)) {
    return []; // Date is too far in the future
  }
}
```

**Example**: If `advanceBookingDays = 30`, bookings can only be made up to 30 days in advance.

---

#### **Step 6: Calculate Minimum Lead Time**

```typescript
const now = new Date();
const minLeadTime = rules?.minLeadTimeHours || 0; // Default: 0 (no minimum)
const earliestBooking = addMinutes(now, minLeadTime * 60);
```

**Purpose**: Determines the earliest time a booking can be made. For example, if `minLeadTimeHours = 2`, bookings must be at least 2 hours in the future.

**Example**:

- Current time: 10:00 AM
- `minLeadTimeHours = 2`
- Earliest booking: 12:00 PM (2 hours from now)

---

#### **Step 7: Get Existing Appointments**

**This is the CRITICAL step that prevents double bookings.**

```typescript
// Get all appointments for this employee on this date
const appointments = await this.getEmployeeAppointments(
  employeeId,
  startOfDay(date), // 00:00:00 of the date
  endOfDay(date) // 23:59:59 of the date
);
```

**The `getEmployeeAppointments()` Query**:

```typescript
private async getEmployeeAppointments(
  employeeId: string,
  startDate: Date,
  endDate: Date,
): Promise<Appointment[]> {
  // Check both salonEmployeeId column AND metadata.preferredEmployeeId
  // (appointments can be stored with employee ID in either location)

  const isPostgres = /* check database type */;

  let metadataCondition: string;
  if (isPostgres) {
    // PostgreSQL: Cast to JSONB and extract preferredEmployeeId
    metadataCondition = `(appointment.metadata::jsonb)->>'preferredEmployeeId' = :employeeIdText`;
  } else {
    // SQLite: Use json_extract function
    metadataCondition = `json_extract(appointment.metadata, '$.preferredEmployeeId') = :employeeId`;
  }

  return this.appointmentsRepository
    .createQueryBuilder('appointment')
    .where(
      `(appointment.salonEmployeeId = :employeeId OR ${metadataCondition})`,
      { employeeId, employeeIdText: employeeId },
    )
    .andWhere('appointment.status NOT IN (:...excludedStatuses)', {
      excludedStatuses: ['cancelled', 'no_show'],
    })
    .andWhere('appointment.scheduledStart >= :startDate', { startDate })
    .andWhere('appointment.scheduledStart <= :endDate', { endDate })
    .orderBy('appointment.scheduledStart', 'ASC')
    .getMany();
}
```

**Key Points**:

1. **Checks both locations**: `salonEmployeeId` column AND `metadata.preferredEmployeeId` JSON field
2. **Excludes cancelled/no-show**: These appointments don't block availability
3. **Date range filter**: Only gets appointments for the specific date
4. **Uses TypeORM QueryBuilder**: Property names (camelCase) are automatically mapped to database columns (snake_case)

**IMPORTANT**: The query uses `appointment.salonEmployeeId` (camelCase property name). TypeORM automatically maps this to the database column `salon_employee_id` (snake_case).

**Returns**: Array of `Appointment` objects that could conflict with new bookings.

---

#### **Step 8: Generate Time Slots**

**Slot Generation Logic**:

```typescript
// Create start and end times for the day
const startTime = parseISO(
  `${format(date, "yyyy-MM-dd")}T${workingHours.startTime}`
); // e.g., "2024-01-15T09:00:00"

const endTime = parseISO(
  `${format(date, "yyyy-MM-dd")}T${workingHours.endTime}`
); // e.g., "2024-01-15T18:00:00"

const slots: TimeSlot[] = [];
let currentSlot = startTime;
const slotInterval = 15; // Generate slots every 15 minutes

// Loop through the day, creating slots
while (isBefore(currentSlot, endTime)) {
  const slotEnd = addMinutes(currentSlot, serviceDuration);

  // Check if slot fits within working hours
  if (isAfter(slotEnd, endTime)) {
    break; // Slot would extend past working hours
  }

  // ... availability checks (see Step 9) ...

  // Move to next slot
  currentSlot = addMinutes(currentSlot, slotInterval);
}
```

**Example**:

- Working hours: 09:00 - 18:00
- Service duration: 60 minutes
- Slot interval: 15 minutes

**Generated slots**:

- 09:00 - 10:00
- 09:15 - 10:15
- 09:30 - 10:30
- 09:45 - 10:45
- 10:00 - 11:00
- ... (continues until 17:00 - 18:00, which is the last valid slot)

---

#### **Step 9: Check Each Slot's Availability**

For **each generated slot**, the system checks **4 conditions**:

##### **9a. Check if Slot is in the Past**

```typescript
const isPastSlot = isBefore(currentSlot, earliestBooking);
```

**Logic**:

- If the slot start time is before `earliestBooking` (current time + minimum lead time), it's unavailable.

**Example**:

- Current time: 14:30
- `minLeadTimeHours = 2`
- `earliestBooking = 16:30`
- Slot at 15:00: **Unavailable** (too soon)
- Slot at 17:00: **Available** (after earliest booking time)

---

##### **9b. Check if Slot Conflicts with Break Times**

```typescript
const isBreakTime = this.isSlotInBreak(
  currentSlot,
  slotEnd,
  workingHours.breaks
);
```

**Break Check Logic**:

```typescript
private isSlotInBreak(
  slotStart: Date,
  slotEnd: Date,
  breaks: Array<{ startTime: string; endTime: string }> | null,
): boolean {
  if (!breaks || breaks.length === 0) return false;

  const slotStartTime = format(slotStart, 'HH:mm');
  const slotEndTime = format(slotEnd, 'HH:mm');

  return breaks.some((breakTime) => {
    // Check if slot overlaps with break
    // Overlap: (slotStart < breakEnd) AND (slotEnd > breakStart)
    return (
      slotStartTime < breakTime.endTime &&
      slotEndTime > breakTime.startTime
    );
  });
}
```

**Example**:

- Break: 12:00 - 13:00
- Slot: 12:30 - 13:30
- **Result**: Unavailable (overlaps with break)

---

##### **9c. Check if Slot Conflicts with Existing Appointments**

**This is the MOST CRITICAL check for preventing double bookings.**

```typescript
const hasConflict = this.hasAppointmentConflict(
  currentSlot,
  slotEnd,
  appointments
);
```

**Conflict Detection Logic**:

```typescript
private hasAppointmentConflict(
  slotStart: Date,
  slotEnd: Date,
  appointments: Appointment[],
): boolean {
  return appointments.some((appointment) => {
    const aptStart = new Date(appointment.scheduledStart);
    const aptEnd = new Date(appointment.scheduledEnd);

    // Check for overlap: (slotStart < aptEnd) AND (slotEnd > aptStart)
    return slotStart < aptEnd && slotEnd > aptStart;
  });
}
```

**Overlap Condition Explained**:
Two time ranges overlap if:

- Slot starts before appointment ends: `slotStart < aptEnd`
- AND slot ends after appointment starts: `slotEnd > aptStart`

**Visual Examples**:

**Example 1: Direct Overlap**

```
Existing Appointment: [10:00 -------- 11:00]
New Slot:              [10:30 -------- 11:30]
Result: CONFLICT ✅ (overlaps)
```

**Example 2: Adjacent (No Overlap)**

```
Existing Appointment: [10:00 -------- 11:00]
New Slot:                          [11:00 -------- 12:00]
Result: NO CONFLICT ✅ (touches but doesn't overlap)
```

**Example 3: Complete Overlap**

```
Existing Appointment: [10:00 -------- 11:00]
New Slot:              [10:15 --- 10:45]
Result: CONFLICT ✅ (completely within appointment)
```

**Example 4: Partial Overlap**

```
Existing Appointment: [10:00 -------- 11:00]
New Slot:                    [10:45 -------- 11:45]
Result: CONFLICT ✅ (overlaps)
```

**Example 5: No Overlap**

```
Existing Appointment: [10:00 -------- 11:00]
New Slot:                                    [12:00 -------- 13:00]
Result: NO CONFLICT ✅
```

**Critical**: This check uses the appointments fetched in **Step 7**, which excludes:

- Cancelled appointments (`status = 'cancelled'`)
- No-show appointments (`status = 'no_show'`)

These appointments **do not block** availability.

---

##### **9d. Check Buffer Time Requirements**

```typescript
const bufferMinutes = rules?.bufferMinutes || 0;
const hasBufferConflict =
  bufferMinutes > 0 &&
  this.hasBufferConflict(currentSlot, slotEnd, appointments, bufferMinutes);
```

**Buffer Check Logic**:

```typescript
private hasBufferConflict(
  slotStart: Date,
  slotEnd: Date,
  appointments: Appointment[],
  bufferMinutes: number,
): boolean {
  return appointments.some((appointment) => {
    const aptStart = new Date(appointment.scheduledStart);
    const aptEnd = new Date(appointment.scheduledEnd);

    // Add buffer time to slot boundaries
    const slotStartWithBuffer = addMinutes(slotStart, -bufferMinutes);
    const slotEndWithBuffer = addMinutes(slotEnd, bufferMinutes);

    // Check if buffered slot overlaps with appointment
    return slotStartWithBuffer < aptEnd && slotEndWithBuffer > aptStart;
  });
}
```

**Purpose**: Ensures there's a gap between appointments (e.g., for cleanup, preparation).

**Example**:

- Existing Appointment: 10:00 - 11:00
- Buffer: 15 minutes
- New Slot: 11:00 - 12:00
- **Result**: **Unavailable** (needs 15-minute buffer after 11:00)
- New Slot: 11:15 - 12:15
- **Result**: **Available** (15-minute gap maintained)

---

#### **Step 10: Determine Final Availability**

```typescript
const available =
  !isPastSlot && !isBreakTime && !hasConflict && !hasBufferConflict;

let reason: string | undefined;
if (isPastSlot) reason = "Past time slot";
else if (isBreakTime) reason = "Break time";
else if (hasConflict) reason = "Already booked";
else if (hasBufferConflict) reason = "Buffer time required";
```

**Logic**: A slot is **available** only if **ALL** conditions are met:

- ✅ Not in the past
- ✅ Not during a break
- ✅ No appointment conflict
- ✅ No buffer conflict

**Priority of Reasons** (if multiple apply):

1. Past time slot (highest priority)
2. Break time
3. Already booked
4. Buffer time required

---

#### **Step 11: Create TimeSlot Object**

```typescript
slots.push({
  startTime: format(currentSlot, "HH:mm"), // "14:30"
  endTime: format(slotEnd, "HH:mm"), // "15:30"
  available, // true or false
  reason, // undefined if available
  price: servicePrice, // Optional
});
```

**Result**: Each slot is added to the array with its availability status.

---

### Complete Example: Availability Calculation

**Scenario**:

- Employee: John (ID: "emp-123")
- Date: 2024-01-15 (Monday)
- Service: Haircut (60 minutes)
- Working Hours: 09:00 - 18:00
- Break: 12:00 - 13:00
- Existing Appointments:
  - 10:00 - 11:00 (Haircut)
  - 14:00 - 15:00 (Color)
- Buffer: 15 minutes
- Min Lead Time: 2 hours
- Current Time: 08:00

**Calculation Process**:

1. **Service Duration**: 60 minutes
2. **Working Hours**: 09:00 - 18:00
3. **Earliest Booking**: 10:00 (08:00 + 2 hours)
4. **Generate Slots** (every 15 minutes):
   - 09:00 - 10:00 ✅ Available
   - 09:15 - 10:15 ❌ Unavailable (overlaps with 10:00-11:00 appointment)
   - 09:30 - 10:30 ❌ Unavailable (overlaps with 10:00-11:00 appointment)
   - 09:45 - 10:45 ❌ Unavailable (overlaps with 10:00-11:00 appointment)
   - 10:00 - 11:00 ❌ Unavailable (conflicts with existing 10:00-11:00)
   - 10:15 - 11:15 ❌ Unavailable (overlaps with 10:00-11:00 appointment)
   - 10:30 - 11:30 ❌ Unavailable (overlaps with 10:00-11:00 appointment)
   - 10:45 - 11:45 ❌ Unavailable (overlaps with 10:00-11:00 appointment)
   - 11:00 - 12:00 ✅ Available
   - 11:15 - 12:15 ❌ Unavailable (overlaps with break 12:00-13:00)
   - 11:30 - 12:30 ❌ Unavailable (overlaps with break 12:00-13:00)
   - 11:45 - 12:45 ❌ Unavailable (overlaps with break 12:00-13:00)
   - 12:00 - 13:00 ❌ Unavailable (break time)
   - 12:15 - 13:15 ❌ Unavailable (break time)
   - 12:30 - 13:30 ❌ Unavailable (break time)
   - 12:45 - 13:45 ❌ Unavailable (break time)
   - 13:00 - 14:00 ✅ Available
   - 13:15 - 14:15 ✅ Available
   - 13:30 - 14:30 ✅ Available
   - 13:45 - 14:45 ❌ Unavailable (overlaps with 14:00-15:00 appointment)
   - 14:00 - 15:00 ❌ Unavailable (conflicts with existing 14:00-15:00)
   - 14:15 - 15:15 ❌ Unavailable (overlaps with 14:00-15:00 appointment)
   - 14:30 - 15:30 ❌ Unavailable (overlaps with 14:00-15:00 appointment)
   - 14:45 - 15:45 ❌ Unavailable (overlaps with 14:00-15:00 appointment)
   - 15:00 - 16:00 ❌ Unavailable (buffer conflict: needs 15 min after 15:00)
   - 15:15 - 16:15 ✅ Available (15-minute buffer maintained)
   - 15:30 - 16:30 ✅ Available
   - ... (continues until 17:00 - 18:00)

**Final Result**: Array of slots with `available: true` or `available: false` and appropriate reasons.

---

### Validation Before Booking

**After** slots are generated and displayed, when the user confirms a booking, the system performs a **final validation**:

```typescript
async validateBooking(
  employeeId: string,
  serviceId: string,
  scheduledStart: Date,
  scheduledEnd: Date,
  excludeAppointmentId?: string,
): Promise<{
  valid: boolean;
  conflicts?: Appointment[];
  suggestions?: TimeSlot[];
  reason?: string;
}>
```

**Validation Checks** (in order):

1. ✅ Employee exists and is active
2. ✅ Time is within working hours
3. ✅ **Check for conflicts** (calls `getConflictingAppointments()`)
4. ✅ Not a blackout date
5. ✅ Within advance booking limit
6. ✅ Meets minimum lead time

**Critical**: This validation happens **immediately before** creating the appointment to catch any last-minute conflicts (race conditions).

---

### Database Query Details

#### **Getting Appointments for Conflict Detection**

The `getEmployeeAppointments()` method uses this query:

```sql
SELECT * FROM appointments
WHERE (
  appointment.salon_employee_id = :employeeId
  OR
  (appointment.metadata::jsonb)->>'preferredEmployeeId' = :employeeIdText
)
AND appointment.status NOT IN ('cancelled', 'no_show')
AND appointment.scheduled_start >= :startDate
AND appointment.scheduled_start <= :endDate
ORDER BY appointment.scheduled_start ASC
```

**Key Points**:

- Checks **both** `salon_employee_id` column AND `metadata.preferredEmployeeId` JSON field
- **Excludes** cancelled and no-show appointments
- Filters by date range (start of day to end of day)
- Uses TypeORM QueryBuilder which maps camelCase properties to snake_case columns

#### **Getting Conflicting Appointments for Validation**

The `getConflictingAppointments()` method uses this query:

```sql
SELECT * FROM appointments
WHERE (
  appointment.salon_employee_id = :employeeId
  OR
  (appointment.metadata::jsonb)->>'preferredEmployeeId' = :employeeIdText
)
AND appointment.status NOT IN ('cancelled', 'no_show')
AND appointment.scheduled_start < :scheduledEnd
AND appointment.scheduled_end > :scheduledStart
AND appointment.id != :excludeAppointmentId  -- If updating existing appointment
```

**Overlap Condition in SQL**:

- `appointment.scheduled_start < :scheduledEnd` (appointment starts before new slot ends)
- AND `appointment.scheduled_end > :scheduledStart` (appointment ends after new slot starts)

This is the **exact same logic** as the frontend conflict check, but performed at the database level for efficiency.

---

### Summary: Availability Calculation Flow

```
1. Get Service Details (duration, price)
   ↓
2. Get Working Hours (employee → salon → default)
   ↓
3. Get Availability Rules (blackout dates, buffers, etc.)
   ↓
4. Check Blackout Dates → Return [] if blacked out
   ↓
5. Check Advance Booking Limits → Return [] if too far
   ↓
6. Calculate Minimum Lead Time
   ↓
7. Get Existing Appointments (exclude cancelled/no-show)
   ↓
8. Generate Time Slots (every 15 minutes within working hours)
   ↓
9. For Each Slot:
   a. Check if past (with lead time)
   b. Check if break time
   c. Check if conflicts with appointments ← CRITICAL
   d. Check if violates buffer time
   ↓
10. Mark Slot as Available/Unavailable
   ↓
11. Return Array of TimeSlots
```

---

### Critical Implementation Notes

1. **The `available` property is a strict boolean**: Always check `slot.available === true` before allowing selection.

2. **Appointments are fetched once per date**: The system gets all appointments for the day, then checks each slot against them.

3. **Cancelled/No-show appointments don't block**: These are explicitly excluded from conflict detection.

4. **Overlap detection is precise**: Uses the standard interval overlap formula: `(start1 < end2) AND (end1 > start2)`.

5. **Buffer time is additive**: Adds buffer to both start and end of the slot before checking conflicts.

6. **Database column mapping**: TypeORM automatically maps `appointment.salonEmployeeId` (property) to `salon_employee_id` (column).

7. **Both employee ID locations checked**: The system checks both the `salon_employee_id` column and `metadata.preferredEmployeeId` JSON field.

8. **Validation is final check**: Even if slots show as available, validation happens immediately before booking to prevent race conditions.

---

## Availability Calculation Logic (Legacy Section)

### How Slots Are Marked as Unavailable

1. **Past Time Slots**:

   ```typescript
   if (isToday && slotDateTime < now) {
     available: false,
     reason: 'Past time slot'
   }
   ```

2. **Existing Appointments**:

   ```typescript
   // For each appointment
   if (slotStart < appointmentEnd && slotEnd > appointmentStart) {
     available: false,
     reason: 'Already booked'
   }
   ```

3. **Buffer Time** (if configured):

   ```typescript
   // If appointment ends at 14:00 and buffer is 15 minutes
   // Slot starting at 14:00 is unavailable
   if (slotStart < appointmentEnd + bufferMinutes) {
     available: false,
     reason: 'Buffer time required'
   }
   ```

4. **Break Times** (if configured):

   ```typescript
   // If break is 12:00-13:00
   // Slots overlapping this time are unavailable
   if (slotStart < breakEnd && slotEnd > breakStart) {
     available: false,
     reason: 'Break time'
   }
   ```

5. **Blackout Dates** (if configured):

   ```typescript
   if (rules.blackoutDates.includes(date)) {
     return []; // No slots for this day
   }
   ```

6. **Advance Booking Limits**:
   ```typescript
   if (date > maxBookingDate) {
     return []; // Beyond advance booking window
   }
   ```

---

## Data Structures

### Frontend Types

```typescript
// TimeSlot (from lib/availability.ts)
interface TimeSlot {
  startTime: string; // "14:30"
  endTime: string; // "15:30"
  available: boolean; // CRITICAL: true/false
  reason?: string; // "Already booked", "Past time slot", etc.
  price?: number;
}

// DayAvailability
interface DayAvailability {
  date: string; // "2024-01-15"
  status: "available" | "partially_booked" | "fully_booked" | "unavailable";
  totalSlots: number;
  availableSlots: number;
  timeSlots?: TimeSlot[]; // Optional detailed slots
}
```

### Backend Types

```typescript
// Appointment Entity
@Entity("appointments")
class Appointment {
  @Column({ name: "salon_employee_id" })
  salonEmployeeId: string; // Maps to DB column 'salon_employee_id'

  @Column({ name: "scheduled_start", type: "timestamp" })
  scheduledStart: Date; // Maps to DB column 'scheduled_start'

  @Column({ name: "scheduled_end", type: "timestamp" })
  scheduledEnd: Date; // Maps to DB column 'scheduled_end'

  @Column()
  status: string; // 'booked', 'pending', 'completed', 'cancelled', 'no_show'
}
```

---

## Key Features

### 1. **Real-Time Availability**

- Slots are fetched fresh when date is selected
- Validation happens immediately before booking
- Availability refreshes if validation fails

### 2. **Visual Feedback**

- Available slots: Green, prominent, clickable
- Unavailable slots: Gray, strikethrough, collapsed by default
- Selected slot: Highlighted with primary color

### 3. **Error Handling**

- Validation errors shown immediately
- Alternative suggestions provided if available
- Automatic refresh of availability data

### 4. **Flexible Employee Selection**

- Can book with specific employee
- Can book with "any available" (no preference)
- Different availability logic for each

### 5. **Operating Hours Support**

- Employee-specific working hours
- Fallback to salon operating hours
- Default 9:00-18:00 if none configured

---

## Error Handling

### Frontend Error Scenarios

1. **Validation Failure**:

   ```typescript
   if (!validation.valid) {
     setError(validation.reason || "This time slot is no longer available");
     refetchAvailability();
     refetchSlots();
     return;
   }
   ```

2. **API Errors**:

   ```typescript
   catch (err: any) {
     setError(err.response?.data?.message || 'Failed to validate booking');
     return;
   }
   ```

3. **Network Errors**:
   - React Query automatically retries
   - Shows loading states
   - Displays error messages

### Backend Error Scenarios

1. **No Working Hours**:
   - Falls back to salon hours
   - Defaults to 9:00-18:00

2. **Invalid Date Range**:
   - Returns empty array
   - Logs warning

3. **Database Errors**:
   - Logs error
   - Returns appropriate HTTP status
   - Provides error message in response

---

## Critical Implementation Notes

### 1. **Availability Property**

The `available` property in `TimeSlot` is a **strict boolean**. Always check:

```typescript
if (slot.available === true) {
  // Slot is available
} else {
  // Slot is unavailable (could be false, undefined, null)
}
```

### 2. **Database Column Names**

TypeORM uses camelCase property names in queries, but the actual database columns are snake_case:

- Property: `appointment.salonEmployeeId`
- Column: `salon_employee_id`
- TypeORM handles the mapping automatically

### 3. **Validation Timing**

Validation happens **immediately before** appointment creation, not during slot selection. This prevents race conditions.

### 4. **Slot Refresh**

After validation failure, always refresh:

- Availability calendar data
- Time slots for selected date
- This ensures user sees current availability

### 5. **Time Format**

- Backend returns: `"14:30"` (24-hour format, HH:mm)
- Frontend displays: `"2:30 PM"` (12-hour format)
- API accepts: ISO 8601 for scheduledStart/End

---

## API Endpoints Summary

### Availability Endpoints

| Endpoint                                                | Method | Purpose                                   | Parameters                                                                           |
| ------------------------------------------------------- | ------ | ----------------------------------------- | ------------------------------------------------------------------------------------ |
| `/appointments/availability/:employeeId`                | GET    | Get day-level availability for date range | `startDate?`, `endDate?`, `serviceId?`, `duration?`                                  |
| `/appointments/availability/:employeeId/slots`          | GET    | Get detailed time slots for specific date | `date`, `serviceId?`, `duration?`                                                    |
| `/appointments/availability/:employeeId/next-available` | GET    | Get next available slot                   | `serviceId?`, `duration?`                                                            |
| `/appointments/availability/:employeeId/summary`        | GET    | Get availability summary for date         | `date?`                                                                              |
| `/appointments/availability/validate`                   | POST   | Validate booking before creation          | `employeeId`, `serviceId`, `scheduledStart`, `scheduledEnd`, `excludeAppointmentId?` |

### Appointment Endpoints

| Endpoint            | Method | Purpose                 |
| ------------------- | ------ | ----------------------- |
| `/appointments`     | POST   | Create new appointment  |
| `/appointments/:id` | GET    | Get appointment details |
| `/appointments/:id` | PATCH  | Update appointment      |
| `/appointments/:id` | DELETE | Cancel appointment      |

### Endpoint Details

#### `GET /appointments/availability/:employeeId`

**Query Parameters**:

- `startDate` (optional): Start date in YYYY-MM-DD format, defaults to today
- `endDate` (optional): End date in YYYY-MM-DD format, defaults to 30 days from start
- `serviceId` (optional): Service ID to calculate duration-specific availability
- `duration` (optional): Service duration in minutes (overrides service duration)

**Response**: `{ data: DayAvailability[] }`

#### `GET /appointments/availability/:employeeId/slots`

**Query Parameters**:

- `date` (required): Date in YYYY-MM-DD format
- `serviceId` (optional): Service ID to get duration and price
- `duration` (optional): Service duration in minutes

**Response**: `{ data: TimeSlot[], meta: { totalSlots: number, availableSlots: number } }`

#### `POST /appointments/availability/validate`

**Request Body**:

```typescript
{
  employeeId: string;
  serviceId: string;
  scheduledStart: string; // ISO 8601 format
  scheduledEnd: string;   // ISO 8601 format
  excludeAppointmentId?: string; // For updates
}
```

**Response**:

```typescript
{
  valid: boolean;
  conflicts?: Appointment[];
  suggestions?: TimeSlot[];
  reason?: string;
}
```

---

## Conclusion

The web booking system is designed with:

- **Real-time availability checking**
- **Visual feedback for available/unavailable slots**
- **Validation before final submission**
- **Automatic refresh on conflicts**
- **Flexible employee selection**
- **Comprehensive error handling**

The key to correct implementation is:

1. Always check `slot.available === true` before allowing selection
2. Validate booking immediately before creation
3. Refresh availability data after validation failures
4. Display unavailable slots with clear visual indicators
5. Use proper database column names in backend queries

---

---

## Quick Reference: Critical Points

### For Frontend Developers

1. **Always check `slot.available === true`** before allowing slot selection
2. **Display unavailable slots** with visual indicators (gray, strikethrough, reason)
3. **Call `validateBooking()`** immediately before creating appointment
4. **Refresh availability** after validation failures (`refetchAvailability()`, `refetchSlots()`)
5. **Handle "any employee"** case differently (frontend generates slots from salon hours)

### For Backend Developers

1. **Use TypeORM QueryBuilder** with camelCase property names (`appointment.salonEmployeeId`)
2. **Check both locations** for employee ID: `salon_employee_id` column AND `metadata.preferredEmployeeId` JSON
3. **Exclude cancelled/no-show** appointments from conflict detection
4. **Use overlap formula**: `(slotStart < aptEnd) AND (slotEnd > aptStart)`
5. **Generate slots every 15 minutes** within working hours
6. **Apply all checks**: past slots, breaks, conflicts, buffers

### Database Column Mapping

| TypeORM Property (camelCase)  | Database Column (snake_case) |
| ----------------------------- | ---------------------------- |
| `appointment.salonEmployeeId` | `salon_employee_id`          |
| `appointment.scheduledStart`  | `scheduled_start`            |
| `appointment.scheduledEnd`    | `scheduled_end`              |

**Important**: TypeORM automatically handles this mapping. Use camelCase in QueryBuilder.

### Availability Check Priority

When multiple conditions apply, reasons are prioritized:

1. **Past time slot** (highest priority)
2. **Break time**
3. **Already booked** (appointment conflict)
4. **Buffer time required** (lowest priority)

### Slot Generation Details

- **Interval**: 15 minutes
- **Working Hours Priority**: Employee → Salon → Default (9:00-18:00)
- **Service Duration**: From service record or parameter (default: 30 minutes)
- **Excluded Statuses**: `'cancelled'`, `'no_show'`

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: AI Assistant  
**Purpose**: Comprehensive guide for understanding and implementing the booking system
