# Notification System Implementation Guide

## Overview

This document describes the complete notification system implementation for the Salon Management Platform, covering both email and in-app notifications.

---

## 1. Environment Configuration

### Required Environment Variables

Add these to your `.env` file:

```env
# SMTP Configuration (Required)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@salonju.com
SMTP_FROM_NAME=SalonJu

# Frontend URL (for action links in notifications)
FRONTEND_URL=http://localhost:3000
```

### Validation

The system validates all required SMTP variables at startup and will fail fast with clear error messages if any are missing.

---

## 2. Architecture

### Components

1. **SmtpConfigService** - Validates and loads SMTP configuration
2. **EmailService** - Sends emails via SMTP with retry logic
3. **EmailTemplateService** - Renders email templates
4. **InAppNotificationService** - Manages in-app notifications
5. **NotificationOrchestratorService** - Main entry point for all notifications
6. **NotificationsService** - Legacy service (maintained for backward compatibility)

### Flow

```
Domain Event (e.g., Appointment Booked)
    ↓
NotificationOrchestratorService.notify()
    ↓
Check User Preferences
    ↓
Build Notification Content
    ↓
Send via Channels:
    - Email (via EmailService)
    - In-App (via InAppNotificationService)
    ↓
Log Notification
```

---

## 3. Database Schema

### notifications table

Enhanced with:
- `is_read` (boolean) - Read/unread state
- `read_at` (timestamp) - When notification was read
- `action_url` (string) - Link to related page
- `action_label` (string) - Button text
- `priority` (enum) - low, medium, high, critical
- `icon` (string) - Icon name for UI

### notification_preferences table

Enhanced with:
- `quiet_hours_start` (time) - Start of quiet hours
- `quiet_hours_end` (time) - End of quiet hours

---

## 4. Integration Points

### Appointments Service

Notifications are sent for:
- **Appointment Booked** - When appointment is created
- **Appointment Confirmed** - When status changes to 'confirmed'
- **Appointment Cancelled** - When status changes to 'cancelled'
- **Appointment Completed** - When status changes to 'completed'
- **Appointment No-Show** - When status changes to 'no_show'

**Code Location**: `backend/src/appointments/appointments.service.ts`

### Sales Service

Notifications are sent for:
- **Sale Completed** - When sale is created (if customer linked)
- **Points Earned** - When loyalty points are awarded

**Code Location**: `backend/src/sales/sales.service.ts`

### Commissions Service

Notifications are sent for:
- **Commission Earned** - When commission is created
- **Commission Paid** - When commission is marked as paid

**Code Location**: `backend/src/commissions/commissions.service.ts`

---

## 5. API Endpoints

### In-App Notifications

- `GET /api/notifications` - Get notifications (with pagination, filters)
- `GET /api/notifications/unread-count` - Get unread count
- `PATCH /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Preferences

- `GET /api/notifications/preferences` - Get preferences
- `PATCH /api/notifications/preferences` - Update preference

---

## 6. Adding a New Notification Type

### Step 1: Add to Enum

```typescript
// backend/src/notifications/entities/notification.entity.ts
export enum NotificationType {
  // ... existing types
  NEW_TYPE = 'new_type',
}
```

### Step 2: Add Handler

```typescript
// backend/src/notifications/services/notification-orchestrator.service.ts
private async handleNewType(context: NotificationContext) {
  return {
    title: 'New Type Title',
    message: 'Notification message',
    variables: {
      // Template variables
    },
  };
}
```

### Step 3: Register Handler

```typescript
// In getHandler() method
[NotificationType.NEW_TYPE]: this.handleNewType.bind(this),
```

### Step 4: Add Email Template (Optional)

```typescript
// backend/src/notifications/services/email-template.service.ts
private getNewTypeTemplate(): string {
  return this.baseTemplate
    .replace('{{headerTitle}}', 'New Type')
    .replace('{{content}}', '...');
}
```

### Step 5: Trigger Notification

```typescript
await this.notificationOrchestrator.notify(
  NotificationType.NEW_TYPE,
  {
    userId: '...',
    // ... context data
  },
);
```

---

## 7. Frontend Implementation

### Notification Bell Component

```typescript
// web/components/notifications/NotificationBell.tsx
'use client';

import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export default function NotificationBell() {
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await api.get('/notifications/unread-count');
      return response.data.count;
    },
    refetchInterval: 30000,
  });

  return (
    <button className="relative">
      <Bell className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
```

### Notification Center Page

```typescript
// web/app/(dashboard)/notifications/page.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications?limit=50');
      return response.data;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      {/* Render notifications */}
    </div>
  );
}
```

---

## 8. Testing

### Unit Tests

```typescript
describe('EmailService', () => {
  it('should send email with retry logic', async () => {
    // Test implementation
  });
});

describe('NotificationOrchestratorService', () => {
  it('should respect user preferences', async () => {
    // Test implementation
  });
});
```

### Integration Tests

```typescript
describe('Appointment Notifications', () => {
  it('should send notification when appointment is booked', async () => {
    // Test implementation
  });
});
```

---

## 9. Error Handling

- All notification failures are logged but don't break main business flows
- Email sending has retry logic (3 attempts with exponential backoff)
- Failed notifications are stored with error messages for debugging

---

## 10. Monitoring

### Key Metrics

- Notification volume per type
- Email delivery success rate
- In-app notification read rate
- Preference opt-out rates

### Logs

- All notification sends are logged
- Failed notifications include error messages
- Preference checks are logged at debug level

---

## 11. Operational Considerations

### Rate Limiting

- Email: Max 100 emails/user/hour (configurable)
- In-app: No rate limiting (stored in database)

### Quiet Hours

Users can set quiet hours in preferences. Notifications are skipped during these hours.

### Retry Strategy

- Max retries: 3
- Backoff: 1s, 2s, 4s
- Dead letter queue: Not implemented (can be added)

---

## 12. Troubleshooting

### Emails Not Sending

1. Check SMTP configuration in `.env`
2. Verify SMTP credentials
3. Check logs for error messages
4. Verify user preferences (email might be disabled)

### In-App Notifications Not Appearing

1. Check database for notification records
2. Verify user preferences
3. Check API endpoint responses
4. Verify frontend polling/WebSocket connection

---

## 13. Future Enhancements

- WebSocket support for real-time notifications
- Push notifications (mobile)
- Notification batching/digest
- Advanced template engine (Handlebars)
- Email delivery tracking (webhooks)
- Notification analytics dashboard

---

**Last Updated**: 2024
**Version**: 1.0

