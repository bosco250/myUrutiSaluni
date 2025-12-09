# Notification System - Complete Test Guide

## ✅ Implementation Status

### Backend ✅
- [x] SMTP configuration with validation
- [x] Email service with templates and retry logic
- [x] In-app notification service
- [x] Notification orchestrator
- [x] Integration with appointments, sales, commissions
- [x] API endpoints (GET, PATCH, POST, DELETE)
- [x] Circular dependency resolved

### Frontend ✅
- [x] NotificationBell component in header
- [x] Notifications page with filters and pagination
- [x] Real-time polling (30s interval)
- [x] Mark as read/delete functionality
- [x] Navigation to related pages

---

## 🧪 Testing Steps

### Step 1: Start Backend Server

```bash
cd backend
npm run start:dev
```

**Expected Output:**
- ✅ Server starts on port 4000
- ✅ SMTP configuration loaded successfully
- ✅ No circular dependency errors
- ✅ Database tables created (if synchronize: true)

**Check for:**
```
✅ SMTP configuration loaded successfully
🚀 Starting Nest application...
```

### Step 2: Start Frontend Server

```bash
cd web
npm run dev
```

**Expected Output:**
- ✅ Server starts on port 3001
- ✅ No TypeScript errors
- ✅ No build errors

### Step 3: Test Notification Bell in Header

1. **Login to the application**
   - Navigate to `http://localhost:3001/login`
   - Login with valid credentials

2. **Check Header**
   - Look for bell icon in top right corner
   - If you have unread notifications, you should see:
     - Red dot indicator
     - Badge with unread count (if > 0)

3. **Click Bell Icon**
   - Dropdown should open
   - Should show recent notifications (up to 10)
   - Unread notifications should have blue left border
   - Each notification shows:
     - Title
     - Body (truncated)
     - Time (relative, e.g., "2 minutes ago")
     - Action label if available

4. **Test Interactions**
   - **Click notification** → Should mark as read and navigate (if actionUrl exists)
   - **Click "Mark all read"** → All notifications marked as read
   - **Hover over notification** → X button appears
   - **Click X** → Notification deleted
   - **Click outside** → Dropdown closes
   - **Press Escape** → Dropdown closes

### Step 4: Test Notifications Page

1. **Navigate to `/notifications`**
   - Click "View all notifications" in dropdown, or
   - Navigate directly to `/notifications`

2. **Test Filters**
   - **All** → Shows all notifications
   - **Unread** → Shows only unread (should match badge count)
   - **Read** → Shows only read notifications

3. **Test Pagination**
   - If you have > 20 notifications, use Previous/Next buttons
   - Page number should update correctly

4. **Test Actions**
   - **Click notification** → Marks as read and navigates
   - **Click checkmark icon** → Marks single notification as read
   - **Click X icon** → Deletes notification (with confirmation)
   - **Click "Mark all read"** → All notifications marked as read

### Step 5: Test Notification Creation

#### Test 1: Appointment Booked Notification

1. **Create an Appointment**
   - Go to appointments page
   - Create a new appointment with a customer
   - Status: "booked"

2. **Check Notifications**
   - Should see "Appointment Booked" notification
   - Should appear in both:
     - Customer's notifications (if customerId set)
     - Salon owner's notifications
     - Employee's notifications (if assigned)

#### Test 2: Sale Completed Notification

1. **Create a Sale**
   - Go to POS page (`/sales`)
   - Select a customer
   - Add items to cart
   - Complete the sale

2. **Check Notifications**
   - Should see "Sale Completed" notification
   - Should see "Points Earned" notification (if points awarded)
   - Both should appear in customer's notifications

#### Test 3: Commission Paid Notification

1. **Mark Commission as Paid**
   - Go to commissions page
   - Find an unpaid commission
   - Mark it as paid

2. **Check Notifications**
   - Should see "Commission Paid" notification
   - Should appear in employee's notifications

#### Test 4: Appointment Status Changes

1. **Update Appointment Status**
   - Go to appointments page
   - Change status to:
     - "confirmed" → Should see "Appointment Confirmed"
     - "cancelled" → Should see "Appointment Cancelled"
     - "completed" → Should see "Appointment Completed"

2. **Check Notifications**
   - Customer should receive notification
   - Salon owner should receive notification
   - Employee should receive notification (if assigned)

---

## 🔍 Verification Checklist

### Backend API Endpoints

Test each endpoint with a tool like Postman or curl:

```bash
# 1. Get unread count
curl -X GET http://localhost:4000/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "count": 5 }

# 2. Get notifications
curl -X GET "http://localhost:4000/api/notifications?limit=10&unreadOnly=false" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "data": [...], "total": 10 }

# 3. Mark as read
curl -X PATCH http://localhost:4000/api/notifications/NOTIFICATION_ID/read \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Mark all as read
curl -X POST http://localhost:4000/api/notifications/mark-all-read \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. Delete notification
curl -X DELETE http://localhost:4000/api/notifications/NOTIFICATION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Frontend Components

- [ ] NotificationBell renders in header
- [ ] Unread count badge shows correct number
- [ ] Dropdown opens/closes correctly
- [ ] Notifications display correctly
- [ ] Mark as read works
- [ ] Delete works
- [ ] Navigation works (if actionUrl set)
- [ ] Notifications page loads
- [ ] Filters work (All/Unread/Read)
- [ ] Pagination works
- [ ] Real-time updates (polling every 30s)

### Integration

- [ ] Appointment creation triggers notification
- [ ] Sale completion triggers notification
- [ ] Commission payment triggers notification
- [ ] Status changes trigger notifications
- [ ] Points earned triggers notification

---

## 🐛 Common Issues & Solutions

### Issue 1: "SMTP configuration failed"
**Solution:** Check `.env` file has all required SMTP variables:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@salonju.com
SMTP_FROM_NAME=SalonJu
```

### Issue 2: "Circular dependency error"
**Solution:** Already fixed with `forwardRef()` in both modules.

### Issue 3: "No notifications showing"
**Check:**
- User is authenticated
- API endpoints are accessible
- Database has notification records
- Browser console for errors
- Network tab for API calls

### Issue 4: "Unread count not updating"
**Check:**
- Polling is working (check Network tab - should see requests every 30s)
- API response format matches expected
- Query invalidation is working

### Issue 5: "Notifications not being created"
**Check:**
- Backend logs for errors
- Notification orchestrator is being called
- User preferences are not blocking notifications
- Event handlers are registered correctly

---

## 📊 Expected Behavior

### Notification Bell
- ✅ Shows unread count badge when count > 0
- ✅ Polls for updates every 30 seconds
- ✅ Dropdown shows 10 most recent notifications
- ✅ Unread notifications highlighted with blue border
- ✅ Clicking notification marks as read and navigates
- ✅ "Mark all read" button appears when unread > 0
- ✅ Delete button appears on hover
- ✅ Closes on outside click or Escape key

### Notifications Page
- ✅ Shows all notifications with pagination
- ✅ Filters work correctly (All/Unread/Read)
- ✅ Mark as read works for individual notifications
- ✅ Mark all as read works
- ✅ Delete works with confirmation
- ✅ Priority badges show for high/medium/critical
- ✅ Time formatting is correct (relative and absolute)
- ✅ Action URLs navigate correctly

### Email Notifications
- ✅ Emails sent when events occur (if email in context)
- ✅ Email templates render correctly
- ✅ Retry logic works (3 attempts with backoff)
- ✅ Failed emails logged with error messages

---

## 🎯 Quick Test Scenario

**Complete Flow Test:**

1. **Create Appointment**
   - Login as salon owner
   - Create appointment for a customer
   - ✅ Check: Customer receives "Appointment Booked" notification

2. **Complete Sale**
   - Go to POS
   - Create sale for same customer
   - ✅ Check: Customer receives "Sale Completed" and "Points Earned" notifications

3. **Mark Commission Paid**
   - Go to commissions
   - Mark employee commission as paid
   - ✅ Check: Employee receives "Commission Paid" notification

4. **View Notifications**
   - Click bell icon
   - ✅ Check: All notifications appear
   - Mark some as read
   - ✅ Check: Unread count decreases
   - Go to notifications page
   - ✅ Check: Filters work correctly

---

## ✅ Success Criteria

The system is working correctly if:

1. ✅ Backend server starts without errors
2. ✅ Frontend server starts without errors
3. ✅ Notification bell appears in header
4. ✅ Unread count updates in real-time
5. ✅ Notifications appear when events occur
6. ✅ Mark as read works
7. ✅ Delete works
8. ✅ Navigation works (if actionUrl set)
9. ✅ Filters work on notifications page
10. ✅ Pagination works

---

**Last Updated**: 2024
**Status**: ✅ Ready for Testing

