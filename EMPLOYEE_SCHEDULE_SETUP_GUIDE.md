# Employee Schedule Setup Guide

## 🎯 Overview

This guide explains how to set up employee working hours and availability rules for the enhanced calendar booking system.

## 🕒 Setting Up Working Hours

### 1. Standard Working Hours (9 AM - 5 PM, Mon-Fri)

```typescript
// Set standard business hours for an employee
await employeeScheduleService.setStandardWorkingHours(employeeId);
```

### 2. Custom Working Hours

```typescript
// Set custom schedule for the week
const customSchedule = [
  { dayOfWeek: 1, startTime: '08:00', endTime: '16:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] }, // Monday
  { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '12:30', endTime: '13:30' }] }, // Tuesday
  { dayOfWeek: 3, startTime: '08:00', endTime: '16:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] }, // Wednesday
  { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '12:30', endTime: '13:30' }] }, // Thursday
  { dayOfWeek: 5, startTime: '08:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] }, // Friday
  { dayOfWeek: 6, startTime: '09:00', endTime: '15:00', breaks: [] }, // Saturday (no breaks)
];

await employeeScheduleService.setWeeklySchedule(employeeId, customSchedule);
```

### 3. Individual Day Setup

```typescript
// Set working hours for a specific day
await employeeScheduleService.setWorkingHours({
  employeeId: 'employee-uuid',
  dayOfWeek: 1, // Monday (0=Sunday, 1=Monday, ..., 6=Saturday)
  startTime: '09:00',
  endTime: '17:00',
  breaks: [
    { startTime: '12:00', endTime: '13:00' }, // Lunch break
    { startTime: '15:00', endTime: '15:15' }  // Coffee break
  ]
});
```

## ⚙️ Availability Rules Configuration

### 1. Default Rules for New Employees

```typescript
// Set sensible defaults
await employeeScheduleService.setDefaultRules(employeeId);
// This sets:
// - 30 days advance booking
// - 2 hours minimum lead time
// - 10 bookings per day max
// - 15 minutes buffer between appointments
```

### 2. Custom Availability Rules

```typescript
await employeeScheduleService.setAvailabilityRules({
  employeeId: 'employee-uuid',
  advanceBookingDays: 45,      // Allow bookings up to 45 days in advance
  minLeadTimeHours: 4,         // Require 4 hours notice
  maxBookingsPerDay: 8,        // Maximum 8 appointments per day
  bufferMinutes: 30,           // 30 minutes between appointments
  blackoutDates: [             // Unavailable dates
    '2024-12-25',              // Christmas
    '2024-01-01',              // New Year
    '2024-07-04'               // Independence Day
  ]
});
```

## 🚫 Managing Blackout Dates

### Add Vacation/Holiday Dates

```typescript
// Add vacation dates
await employeeScheduleService.addBlackoutDates(employeeId, [
  '2024-03-15',
  '2024-03-16',
  '2024-03-17'
]);
```

### Remove Blackout Dates

```typescript
// Remove dates when employee becomes available
await employeeScheduleService.removeBlackoutDates(employeeId, [
  '2024-03-17' // Employee can work this day after all
]);
```

## 📊 Database Setup Examples

### SQL Commands for Initial Setup

```sql
-- Set working hours for employee (Monday to Friday, 9 AM - 5 PM)
INSERT INTO employee_working_hours (employee_id, day_of_week, start_time, end_time, breaks, is_active) VALUES
('employee-uuid', 1, '09:00', '17:00', '[{"startTime":"12:00","endTime":"13:00"}]', true),
('employee-uuid', 2, '09:00', '17:00', '[{"startTime":"12:00","endTime":"13:00"}]', true),
('employee-uuid', 3, '09:00', '17:00', '[{"startTime":"12:00","endTime":"13:00"}]', true),
('employee-uuid', 4, '09:00', '17:00', '[{"startTime":"12:00","endTime":"13:00"}]', true),
('employee-uuid', 5, '09:00', '17:00', '[{"startTime":"12:00","endTime":"13:00"}]', true);

-- Set availability rules
INSERT INTO employee_availability_rules (employee_id, advance_booking_days, min_lead_time_hours, max_bookings_per_day, buffer_minutes, blackout_dates) VALUES
('employee-uuid', 30, 2, 10, 15, '[]');
```

## 🎨 Frontend Integration Examples

### Employee Schedule Management Component

```tsx
// Example component for salon owners to manage employee schedules
function EmployeeScheduleManager({ employeeId }: { employeeId: string }) {
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRules | null>(null);

  // Load current schedule
  useEffect(() => {
    loadEmployeeSchedule();
  }, [employeeId]);

  const loadEmployeeSchedule = async () => {
    const response = await api.get(`/appointments/employees/${employeeId}/schedule`);
    setWorkingHours(response.data.workingHours);
    setAvailabilityRules(response.data.availabilityRules);
  };

  const updateWorkingHours = async (dayOfWeek: number, hours: WorkingHours) => {
    await api.post(`/appointments/employees/${employeeId}/working-hours`, {
      dayOfWeek,
      ...hours
    });
    loadEmployeeSchedule();
  };

  return (
    <div className="space-y-6">
      {/* Working Hours Grid */}
      <div className="grid grid-cols-7 gap-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <DayScheduleCard
            key={day}
            day={day}
            dayOfWeek={index}
            workingHours={workingHours.find(wh => wh.dayOfWeek === index)}
            onUpdate={(hours) => updateWorkingHours(index, hours)}
          />
        ))}
      </div>

      {/* Availability Rules */}
      <AvailabilityRulesForm
        rules={availabilityRules}
        onUpdate={setAvailabilityRules}
      />
    </div>
  );
}
```

## 🔧 Common Scenarios

### Scenario 1: Hair Salon with Extended Hours

```typescript
// Salon open 8 AM - 8 PM, Tuesday to Saturday
const salonSchedule = [
  { dayOfWeek: 2, startTime: '08:00', endTime: '20:00', breaks: [{ startTime: '12:00', endTime: '13:00' }, { startTime: '16:00', endTime: '16:30' }] },
  { dayOfWeek: 3, startTime: '08:00', endTime: '20:00', breaks: [{ startTime: '12:00', endTime: '13:00' }, { startTime: '16:00', endTime: '16:30' }] },
  { dayOfWeek: 4, startTime: '08:00', endTime: '20:00', breaks: [{ startTime: '12:00', endTime: '13:00' }, { startTime: '16:00', endTime: '16:30' }] },
  { dayOfWeek: 5, startTime: '08:00', endTime: '20:00', breaks: [{ startTime: '12:00', endTime: '13:00' }, { startTime: '16:00', endTime: '16:30' }] },
  { dayOfWeek: 6, startTime: '08:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
];

await employeeScheduleService.setWeeklySchedule(employeeId, salonSchedule);
```

### Scenario 2: Part-Time Employee

```typescript
// Part-time employee: Monday, Wednesday, Friday only
const partTimeSchedule = [
  { dayOfWeek: 1, startTime: '09:00', endTime: '15:00', breaks: [{ startTime: '12:00', endTime: '12:30' }] },
  { dayOfWeek: 3, startTime: '09:00', endTime: '15:00', breaks: [{ startTime: '12:00', endTime: '12:30' }] },
  { dayOfWeek: 5, startTime: '09:00', endTime: '15:00', breaks: [{ startTime: '12:00', endTime: '12:30' }] },
];

await employeeScheduleService.setWeeklySchedule(employeeId, partTimeSchedule);

// Set rules for part-time employee
await employeeScheduleService.setAvailabilityRules({
  employeeId,
  advanceBookingDays: 14,      // Shorter booking window
  minLeadTimeHours: 24,        // Require 24 hours notice
  maxBookingsPerDay: 5,        // Fewer appointments per day
  bufferMinutes: 30,           // More time between appointments
});
```

### Scenario 3: Senior Stylist with Premium Rules

```typescript
// Senior stylist with premium booking rules
await employeeScheduleService.setAvailabilityRules({
  employeeId,
  advanceBookingDays: 60,      // Allow bookings 2 months in advance
  minLeadTimeHours: 1,         // Can take last-minute bookings
  maxBookingsPerDay: 12,       // High capacity
  bufferMinutes: 10,           // Minimal buffer time
  blackoutDates: []            // Always available
});
```

## 📱 Mobile App Integration

### Quick Setup for New Employees

```typescript
// Mobile app function for salon owners
const setupNewEmployee = async (employeeId: string, scheduleType: 'standard' | 'extended' | 'parttime') => {
  switch (scheduleType) {
    case 'standard':
      await employeeScheduleService.setStandardWorkingHours(employeeId);
      await employeeScheduleService.setDefaultRules(employeeId);
      break;
    
    case 'extended':
      // 8 AM - 8 PM schedule
      const extendedSchedule = [
        { dayOfWeek: 1, startTime: '08:00', endTime: '20:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
        { dayOfWeek: 2, startTime: '08:00', endTime: '20:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
        { dayOfWeek: 3, startTime: '08:00', endTime: '20:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
        { dayOfWeek: 4, startTime: '08:00', endTime: '20:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
        { dayOfWeek: 5, startTime: '08:00', endTime: '20:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
        { dayOfWeek: 6, startTime: '09:00', endTime: '17:00', breaks: [{ startTime: '12:00', endTime: '13:00' }] },
      ];
      await employeeScheduleService.setWeeklySchedule(employeeId, extendedSchedule);
      break;
    
    case 'parttime':
      // 3 days a week
      const partTimeSchedule = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '15:00', breaks: [] },
        { dayOfWeek: 3, startTime: '09:00', endTime: '15:00', breaks: [] },
        { dayOfWeek: 5, startTime: '09:00', endTime: '15:00', breaks: [] },
      ];
      await employeeScheduleService.setWeeklySchedule(employeeId, partTimeSchedule);
      await employeeScheduleService.setAvailabilityRules({
        employeeId,
        advanceBookingDays: 14,
        minLeadTimeHours: 24,
        maxBookingsPerDay: 4,
        bufferMinutes: 30,
      });
      break;
  }
};
```

## 🎯 Best Practices

### 1. Initial Setup
- Always set default rules for new employees
- Use standard working hours as a starting point
- Configure breaks appropriately for your business

### 2. Buffer Time Management
- Set buffer time based on service complexity
- Consider cleanup/setup time between appointments
- Account for potential delays

### 3. Lead Time Configuration
- Balance customer convenience with operational needs
- Consider your cancellation policy
- Account for preparation time needed

### 4. Blackout Date Management
- Keep blackout dates updated
- Remove past dates regularly
- Consider seasonal patterns

### 5. Monitoring and Adjustment
- Monitor booking patterns
- Adjust rules based on employee feedback
- Review utilization rates regularly

This setup ensures your employees have properly configured schedules that work seamlessly with the enhanced booking system, providing customers with accurate availability while respecting business constraints.