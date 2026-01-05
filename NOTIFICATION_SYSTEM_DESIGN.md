# Notification System Design & Implementation Report

## Executive Summary

This document outlines a comprehensive notification system for the Salon Management Platform that supports both email and in-app notifications across multiple user roles (salon owners, employees, and customers). The system extends the existing notification infrastructure to provide a robust, scalable, and maintainable solution.

---

## 1. Notification Use Cases and Events

### 1.1 Event Catalog

#### **Appointment Events**

| Event                       | Recipients                               | Channels           | Priority |
| --------------------------- | ---------------------------------------- | ------------------ | -------- |
| **New Booking**             | Customer, Salon Owner, Assigned Employee | Email, In-App      | High     |
| **Appointment Confirmed**   | Customer                                 | Email, In-App      | Medium   |
| **Appointment Reminder**    | Customer                                 | Email, SMS, In-App | High     |
| **Appointment Rescheduled** | Customer, Salon Owner, Assigned Employee | Email, In-App      | High     |
| **Appointment Cancelled**   | Customer, Salon Owner, Assigned Employee | Email, In-App      | High     |
| **Appointment Completed**   | Customer, Assigned Employee              | Email, In-App      | Low      |
| **No-Show**                 | Salon Owner, Assigned Employee           | Email, In-App      | Medium   |

#### **Sales & Payment Events**

| Event                 | Recipients            | Channels      | Priority |
| --------------------- | --------------------- | ------------- | -------- |
| **Sale Completed**    | Customer (if linked)  | Email, In-App | Low      |
| **Payment Received**  | Salon Owner           | Email, In-App | Medium   |
| **Payment Failed**    | Customer, Salon Owner | Email, In-App | High     |
| **Invoice Generated** | Customer              | Email, In-App | Medium   |

#### **Commission Events**

| Event                  | Recipients | Channels      | Priority |
| ---------------------- | ---------- | ------------- | -------- |
| **Commission Earned**  | Employee   | Email, In-App | Medium   |
| **Commission Paid**    | Employee   | Email, In-App | High     |
| **Commission Updated** | Employee   | In-App        | Low      |

#### **Loyalty & Rewards Events**

| Event                   | Recipients | Channels      | Priority |
| ----------------------- | ---------- | ------------- | -------- |
| **Points Earned**       | Customer   | Email, In-App | Low      |
| **Points Redeemed**     | Customer   | Email, In-App | Medium   |
| **Reward Available**    | Customer   | Email, In-App | Medium   |
| **VIP Status Achieved** | Customer   | Email, In-App | High     |

#### **Inventory Events**

| Event                 | Recipients  | Channels      | Priority |
| --------------------- | ----------- | ------------- | -------- |
| **Low Stock Alert**   | Salon Owner | Email, In-App | High     |
| **Out of Stock**      | Salon Owner | Email, In-App | Critical |
| **Stock Replenished** | Salon Owner | In-App        | Low      |

#### **System & Administrative Events**

| Event                             | Recipients    | Channels      | Priority |
| --------------------------------- | ------------- | ------------- | -------- |
| **Membership Application Status** | Applicant     | Email, In-App | High     |
| **Membership Renewal Reminder**   | Salon Owner   | Email, In-App | Medium   |
| **System Maintenance**            | All Users     | Email, In-App | Medium   |
| **Security Alert**                | Affected User | Email, In-App | Critical |
| **New Employee Added**            | Employee      | Email, In-App | Medium   |
| **Employee Removed**              | Employee      | Email, In-App | High     |

---

## 2. Architecture and Flow

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Event Producers                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Appointments │  │    Sales      │  │  Inventory   │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┼──────────────────┘               │
│                           │                                    │
└───────────────────────────┼────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Notification Service (Core)                      │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Event Handler / Notification Builder                  │ │
│  │  - Validates recipients                                │ │
│  │  - Checks user preferences                             │ │
│  │  - Builds notification payload                         │ │
│  └──────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Notification Queue (Bull/Redis)                      │ │
│  │  - Async processing                                    │ │
│  │  - Retry logic                                         │ │
│  │  - Rate limiting                                       │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────┬──────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Email Handler │  │ In-App Handler│  │  SMS Handler  │
│               │  │               │  │               │
│ - Template    │  │ - WebSocket   │  │ - Twilio/SNS  │
│   Engine      │  │ - SSE         │  │ - Airtel API  │
│ - SMTP/SendGrid│ │ - Polling     │  │               │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                   │
        ▼                  ▼                   ▼
┌──────────────────────────────────────────────────────┐
│              Notification Storage                     │
│  - notifications table (audit trail)                  │
│  - notification_preferences table                     │
│  - notification_logs table (delivery status)         │
└──────────────────────────────────────────────────────┘
```

### 2.2 Event Flow

1. **Event Generation**: Domain services (AppointmentsService, SalesService, etc.) emit events
2. **Event Capture**: NotificationService listens via decorators or event emitters
3. **Recipient Resolution**: Determines who should receive the notification
4. **Preference Check**: Validates user preferences and quiet hours
5. **Notification Building**: Creates notification payload with templates
6. **Queueing**: Adds to processing queue (async)
7. **Channel Routing**: Routes to appropriate handlers (Email, In-App, SMS)
8. **Delivery**: Sends via channel-specific mechanism
9. **Status Tracking**: Updates notification status and logs

### 2.3 Processing Strategy

**Synchronous vs Asynchronous:**

- **Synchronous**: Critical notifications (security alerts, payment failures)
- **Asynchronous**: All other notifications (queued via Bull/Redis)

**Background Jobs:**

- Scheduled reminders (appointment reminders, membership renewals)
- Batch processing (daily summaries, weekly reports)
- Retry failed notifications (exponential backoff)

**Retry Logic:**

- Max retries: 3
- Backoff: 1min, 5min, 15min
- Dead letter queue for permanent failures

---

## 3. Email Notifications

### 3.1 Email Provider

**Recommended: SendGrid or Mailgun**

- **SendGrid**: Better for transactional emails, excellent deliverability
- **Mailgun**: Good API, competitive pricing
- **Alternative**: SMTP (Gmail, AWS SES) for cost-sensitive deployments

**Configuration:**

```env
EMAIL_PROVIDER=sendgrid  # or 'mailgun', 'smtp'
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@salonju.com
SENDGRID_FROM_NAME=SalonJu

# OR for SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@salonju.com
```

### 3.2 Email Templates

**Template Structure:**

- Base template (header, footer, branding)
- Event-specific templates (appointment, sale, etc.)
- Localization support (Kinyarwanda, English)
- Responsive design (mobile-friendly)

**Template Variables:**

```typescript
interface EmailTemplateVariables {
  // User/Customer
  customerName: string;
  customerEmail: string;

  // Appointment
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
  salonName: string;
  salonAddress?: string;
  employeeName?: string;

  // Sale
  saleAmount: string;
  saleItems: Array<{ name: string; quantity: number; price: string }>;
  paymentMethod: string;

  // Loyalty
  pointsEarned: number;
  pointsBalance: number;

  // Links
  appointmentLink: string;
  salonLink: string;
  unsubscribeLink: string;

  // Branding
  logoUrl: string;
  primaryColor: string;
}
```

**Example Templates:**

**Appointment Reminder:**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div
        style="background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;"
      >
        <h1>Appointment Reminder</h1>
      </div>
      <div
        style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px;"
      >
        <p>Hello {{customerName}},</p>
        <p>This is a reminder about your upcoming appointment:</p>
        <div
          style="background: white; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 4px solid #6366f1;"
        >
          <p><strong>Salon:</strong> {{salonName}}</p>
          <p><strong>Service:</strong> {{serviceName}}</p>
          <p>
            <strong>Date & Time:</strong> {{appointmentDate}} at
            {{appointmentTime}}
          </p>
          {{#if employeeName}}
          <p><strong>Stylist:</strong> {{employeeName}}</p>
          {{/if}}
        </div>
        <p>We look forward to seeing you!</p>
        <p style="margin-top: 20px;">
          <a
            href="{{appointmentLink}}"
            style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;"
            >View Appointment</a
          >
        </p>
      </div>
      <div
        style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;"
      >
        <p>This is an automated message from SalonJu</p>
        <p><a href="{{unsubscribeLink}}">Unsubscribe</a></p>
      </div>
    </div>
  </body>
</html>
```

**Low Stock Alert:**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body style="font-family: Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div
        style="background: #ef4444; color: white; padding: 20px; text-align: center;"
      >
        <h1>⚠️ Low Stock Alert</h1>
      </div>
      <div style="background: #f9fafb; padding: 20px;">
        <p>Hello {{salonOwnerName}},</p>
        <p>The following products are running low in stock:</p>
        <ul>
          {{#each lowStockProducts}}
          <li>
            <strong>{{name}}</strong> - Current stock: {{currentStock}}
            (Minimum: {{minStock}})
          </li>
          {{/each}}
        </ul>
        <p style="margin-top: 20px;">
          <a
            href="{{inventoryLink}}"
            style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;"
            >Manage Inventory</a
          >
        </p>
      </div>
    </div>
  </body>
</html>
```

### 3.3 Email Logging and Auditing

**Email Log Table:**

```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id),
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  provider VARCHAR(50), -- 'sendgrid', 'mailgun', 'smtp'
  provider_message_id VARCHAR(255),
  status VARCHAR(32) NOT NULL, -- 'sent', 'delivered', 'bounced', 'failed'
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  bounced_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_logs_notification ON email_logs(notification_id);
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_status ON email_logs(status);
```

**Logging Strategy:**

- Log every email send attempt
- Track delivery status (webhooks from provider)
- Store error messages for debugging
- Retention: 90 days for sent, 1 year for failed

---

## 4. In-App Notifications

### 4.1 Data Model

**Enhanced Notification Entity:**

```typescript
@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user?: User;

  @Column({ name: "user_id", nullable: true })
  userId?: string;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: "customer_id" })
  customer?: Customer;

  @Column({ name: "customer_id", nullable: true })
  customerId?: string;

  @Column({ type: "varchar", length: 32 })
  channel: NotificationChannel; // 'in_app', 'email', 'sms', 'push'

  @Column({ type: "varchar", length: 32 })
  type: NotificationType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: "text" })
  body: string;

  @Column({ type: "varchar", length: 32, default: "pending" })
  status: NotificationStatus;

  // In-app specific fields
  @Column({ default: false })
  isRead: boolean;

  @Column({ name: "read_at", type: "timestamp", nullable: true })
  readAt?: Date;

  @Column({ name: "action_url", nullable: true })
  actionUrl?: string; // Link to relevant page (e.g., /appointments/123)

  @Column({ name: "action_label", nullable: true })
  actionLabel?: string; // "View Appointment", "View Sale", etc.

  @Column({ type: "varchar", length: 32, nullable: true })
  priority?: "low" | "medium" | "high" | "critical";

  @Column({ type: "varchar", length: 50, nullable: true })
  icon?: string; // Icon name for UI

  @Column({ type: "simple-json", default: "{}" })
  metadata: Record<string, any>;

  @Index()
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
```

### 4.2 Delivery Mechanisms

**Option 1: WebSocket (Recommended for Real-time)**

- Use Socket.io or native WebSocket
- Real-time delivery
- Connection management required
- Best for active users

**Option 2: Server-Sent Events (SSE)**

- Simpler than WebSocket
- One-way communication (server → client)
- Automatic reconnection
- Good for notification streams

**Option 3: Polling (Fallback)**

- Simple HTTP polling every 30-60 seconds
- Works everywhere
- Higher server load
- Use for compatibility

**Recommended: Hybrid Approach**

- Primary: WebSocket for real-time
- Fallback: Polling if WebSocket unavailable
- SSE for notification history stream

### 4.3 Frontend Implementation

**Notification Bell Component:**

```typescript
// components/notifications/NotificationBell.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await api.get('/notifications/unread-count');
      return response.data.count;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/notifications`);

    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      queryClient.invalidateQueries(['notifications']);
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.body,
          icon: '/logo.png',
        });
      }
    };

    return () => ws.close();
  }, [queryClient]);

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative">
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
    </div>
  );
}
```

**Notification Center Page:**

```typescript
// app/(dashboard)/notifications/page.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', 'all'],
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

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return api.post('/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button onClick={() => markAllReadMutation.mutate()}>
          Mark All Read
        </button>
      </div>

      <div className="space-y-2">
        {notifications?.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onRead={() => markAsReadMutation.mutate(notification.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

### 4.4 Read/Unread State Management

**API Endpoints:**

- `GET /notifications/unread-count` - Get unread count
- `PATCH /notifications/:id/read` - Mark single as read
- `POST /notifications/mark-all-read` - Mark all as read
- `DELETE /notifications/:id` - Delete notification
- `GET /notifications?page=1&limit=20&unreadOnly=true` - Paginated list

**Pagination:**

- Cursor-based pagination for performance
- Default: 20 per page
- Load more on scroll

---

## 5. User Preferences and Settings

### 5.1 Preference Schema

**Enhanced NotificationPreference Entity:**

```typescript
@Entity("notification_preferences")
@Unique(["userId", "type", "channel"])
@Unique(["customerId", "type", "channel"])
export class NotificationPreference {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: User;

  @Column({ name: "user_id", nullable: true })
  userId?: string;

  @ManyToOne(() => Customer, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "customer_id" })
  customer?: Customer;

  @Column({ name: "customer_id", nullable: true })
  customerId?: string;

  @Column({ type: "varchar", length: 32 })
  type: NotificationType;

  @Column({ type: "varchar", length: 32 })
  channel: NotificationChannel;

  @Column({ default: true })
  enabled: boolean;

  // Quiet hours
  @Column({ name: "quiet_hours_start", type: "time", nullable: true })
  quietHoursStart?: string; // e.g., "22:00"

  @Column({ name: "quiet_hours_end", type: "time", nullable: true })
  quietHoursEnd?: string; // e.g., "08:00"

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
```

### 5.2 Default Preferences

**Role-Based Defaults:**

```typescript
const DEFAULT_PREFERENCES = {
  [UserRole.CUSTOMER]: {
    appointment_reminder: { email: true, in_app: true, sms: false },
    appointment_confirmed: { email: true, in_app: true },
    points_earned: { email: false, in_app: true },
    // ...
  },
  [UserRole.SALON_OWNER]: {
    new_booking: { email: true, in_app: true },
    low_stock: { email: true, in_app: true },
    commission_paid: { email: true, in_app: true },
    // ...
  },
  [UserRole.SALON_EMPLOYEE]: {
    new_assignment: { email: false, in_app: true },
    commission_earned: { email: true, in_app: true },
    // ...
  },
};
```

### 5.3 Preference Management UI

**Settings Page:**

```typescript
// app/(dashboard)/settings/notifications/page.tsx
'use client';

export default function NotificationSettings() {
  const { data: preferences } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const response = await api.get('/notifications/preferences');
      return response.data;
    },
  });

  const updatePreference = useMutation({
    mutationFn: async ({ type, channel, enabled }) => {
      return api.patch('/notifications/preferences', {
        type,
        channel,
        enabled,
      });
    },
  });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Notification Preferences</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-4">Appointment Notifications</h2>
          <div className="space-y-3">
            <PreferenceToggle
              label="Email reminders"
              type="appointment_reminder"
              channel="email"
              enabled={preferences?.appointment_reminder?.email}
              onChange={(enabled) => updatePreference.mutate({
                type: 'appointment_reminder',
                channel: 'email',
                enabled,
              })}
            />
            <PreferenceToggle
              label="In-app reminders"
              type="appointment_reminder"
              channel="in_app"
              enabled={preferences?.appointment_reminder?.in_app}
              onChange={(enabled) => updatePreference.mutate({
                type: 'appointment_reminder',
                channel: 'in_app',
                enabled,
              })}
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Quiet Hours</h2>
          <QuietHoursPicker
            start={preferences?.quietHoursStart}
            end={preferences?.quietHoursEnd}
            onChange={(start, end) => {
              // Update quiet hours
            }}
          />
        </section>
      </div>
    </div>
  );
}
```

---

## 6. Security, Performance, and Testing

### 6.1 Security

**Data Protection:**

- Encrypt sensitive data in emails (PII)
- Sanitize user input in notification content
- Rate limiting: Max 100 emails/user/hour
- Access control: Users can only see their own notifications

**Privacy:**

- Opt-out links in all emails (GDPR compliance)
- Unsubscribe mechanism
- Data retention: 90 days for sent, 1 year for failed
- Audit trail for all notification sends

### 6.2 Performance

**Optimization Strategies:**

- **Batching**: Group notifications by recipient (daily digest)
- **Caching**: Cache user preferences (Redis, 5min TTL)
- **Queue Processing**: Process notifications in batches (50 at a time)
- **Database Indexing**: Index on userId, customerId, status, createdAt
- **Connection Pooling**: Reuse email/SMS provider connections

**Monitoring:**

- Track notification volume per hour/day
- Monitor queue depth
- Alert on high failure rates (>5%)
- Track delivery times (p50, p95, p99)

### 6.3 Testing

**Unit Tests:**

```typescript
describe('NotificationService', () => {
  it('should send appointment reminder', async () => {
    const notification = await service.sendAppointmentReminder(
      appointmentId,
      24,
      [NotificationChannel.EMAIL]
    );
    expect(notification.status).toBe(NotificationStatus.PENDING);
  });

  it('should respect user preferences', async () => {
    await preferenceService.updatePreference(
      userId,
      NotificationType.APPOINTMENT_REMINDER,
      NotificationChannel.EMAIL,
      false
    );
    const notification = await service.sendNotification(...);
    expect(notification.status).toBe(NotificationStatus.FAILED);
  });
});
```

**Integration Tests:**

- Test email sending with test provider
- Test WebSocket delivery
- Test preference filtering
- Test retry logic

**E2E Tests:**

- User receives notification after booking
- User can mark notification as read
- User can update preferences
- Quiet hours are respected

---

## 7. Implementation Plan

### 7.1 Code Modules Required

**Backend:**

```
backend/src/notifications/
├── notifications.module.ts (existing, enhance)
├── notifications.service.ts (existing, enhance)
├── notifications.controller.ts (existing, enhance)
├── entities/
│   ├── notification.entity.ts (existing, enhance)
│   ├── notification-preference.entity.ts (existing, enhance)
│   └── email-log.entity.ts (new)
├── services/
│   ├── email.service.ts (existing, enhance)
│   ├── sms.service.ts (existing, enhance)
│   ├── in-app.service.ts (new)
│   └── template.service.ts (new)
├── handlers/
│   ├── appointment.handler.ts (new)
│   ├── sale.handler.ts (new)
│   ├── commission.handler.ts (new)
│   └── inventory.handler.ts (new)
├── decorators/
│   └── notify.decorator.ts (new)
└── dto/
    ├── create-notification.dto.ts (new)
    └── update-preference.dto.ts (new)
```

**Frontend:**

```
web/
├── components/notifications/
│   ├── NotificationBell.tsx (new)
│   ├── NotificationDropdown.tsx (new)
│   ├── NotificationCard.tsx (new)
│   └── NotificationCenter.tsx (new)
├── app/(dashboard)/notifications/
│   └── page.tsx (new)
└── app/(dashboard)/settings/notifications/
    └── page.tsx (new)
```

### 7.2 Database Changes

**Migrations:**

1. Add `isRead`, `readAt`, `actionUrl`, `actionLabel`, `priority`, `icon` to `notifications` table
2. Add `quiet_hours_start`, `quiet_hours_end` to `notification_preferences` table
3. Create `email_logs` table
4. Add indexes for performance

### 7.3 Recommended Libraries

**Backend:**

- `@nestjs/bull` - Queue management (Bull/Redis)
- `handlebars` or `ejs` - Email template engine
- `@sendgrid/mail` or `nodemailer` - Email sending
- `socket.io` - WebSocket support
- `@nestjs/event-emitter` - Event-driven architecture

**Frontend:**

- `socket.io-client` - WebSocket client
- `react-query` - Data fetching (already in use)
- `date-fns` - Date formatting (already in use)

### 7.4 Environment Variables

```env
# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@salonju.com
SENDGRID_FROM_NAME=SalonJu

# SMS (optional)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890

# Queue
REDIS_HOST=localhost
REDIS_PORT=6379

# WebSocket
WS_PORT=3001

# Notification Settings
NOTIFICATION_BATCH_SIZE=50
NOTIFICATION_MAX_RETRIES=3
NOTIFICATION_RATE_LIMIT=100
```

---

## 8. Summary

### 8.1 Architecture Overview

The notification system uses an **event-driven, queue-based architecture** with:

- **Event Producers**: Domain services emit events
- **Notification Service**: Core orchestration and routing
- **Queue System**: Async processing with retries
- **Channel Handlers**: Email, In-App, SMS
- **Storage**: Audit trail and preferences

### 8.2 Notification Flow

1. **Event occurs** (e.g., appointment booked)
2. **NotificationService** captures event
3. **Recipients resolved** (customer, owner, employee)
4. **Preferences checked** (enabled? quiet hours?)
5. **Notification built** (template + variables)
6. **Queued** (async processing)
7. **Delivered** (email/in-app/SMS)
8. **Status tracked** (sent, delivered, failed)

### 8.3 Key Features

✅ **Multi-channel**: Email, In-App, SMS  
✅ **Role-based**: Different notifications per role  
✅ **Preference management**: User control over notifications  
✅ **Quiet hours**: Respect user's time  
✅ **Templates**: Branded, localized emails  
✅ **Real-time**: WebSocket for in-app notifications  
✅ **Scalable**: Queue-based, async processing  
✅ **Auditable**: Full logging and tracking  
✅ **Secure**: Rate limiting, access control  
✅ **Testable**: Comprehensive test coverage

### 8.4 Next Steps

1. **Phase 1**: Enhance existing notification infrastructure
   - Add missing notification types
   - Implement email templates
   - Add in-app notification delivery

2. **Phase 2**: Integrate with domain services
   - Add event emitters to AppointmentsService, SalesService, etc.
   - Create notification handlers
   - Set up queue system

3. **Phase 3**: Frontend implementation
   - Build notification bell component
   - Create notification center page
   - Implement preference settings

4. **Phase 4**: Testing and optimization
   - Write tests
   - Performance tuning
   - Monitoring setup

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: Technical Team
