# Functional Requirement Specification (FRS)
## URUTI Saluni Web Platform

**Document Version:** 2.0
**Last Updated:** January 2026
**Status:** Production-Ready

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Salon Browsing & Discovery](#5-salon-browsing--discovery)
6. [Map View Functionality](#6-map-view-functionality)
7. [Salon Detail Page](#7-salon-detail-page)
8. [Services & Categories](#8-services--categories)
9. [Booking & Appointments](#9-booking--appointments)
10. [Dashboard - Customer](#10-dashboard---customer)
11. [Dashboard - Salon Owner](#11-dashboard---salon-owner)
12. [Dashboard - Administrator](#12-dashboard---administrator)
13. [Salon Management](#13-salon-management)
14. [Service Management](#14-service-management)
15. [Employee Management](#15-employee-management)
16. [Customer Management](#16-customer-management)
17. [Appointment Management](#17-appointment-management)
18. [Point of Sale System](#18-point-of-sale-system)
19. [Inventory Management](#19-inventory-management)
20. [Financial Management & Accounting](#20-financial-management--accounting)
21. [Commission & Payroll](#21-commission--payroll)
22. [Membership System](#22-membership-system)
23. [Loan Management](#23-loan-management)
24. [Digital Wallet System](#24-digital-wallet-system)
25. [Loyalty & Rewards System](#25-loyalty--rewards-system)
26. [User Management](#26-user-management)
27. [Settings & Configuration](#27-settings--configuration)
28. [Notifications](#28-notifications)
29. [Reviews & Ratings](#29-reviews--ratings)
30. [UI/UX Functional Rules](#30-uiux-functional-rules)
31. [Error Handling & Edge Cases](#31-error-handling--edge-cases)
32. [Non-Functional Requirements](#32-non-functional-requirements)

---

## 1. Introduction

### 1.1 Purpose
This Functional Requirement Specification (FRS) document describes the complete functional behavior of the URUTI Saluni Web Platform. It serves as the primary reference for QA testers, UAT teams, product owners, and developers.

### 1.2 Scope
This document covers:
- Public salon browsing and discovery
- Customer appointment booking
- Salon owner management tools
- Administrative functions
- Membership, financial, and lending features
- Point of Sale and inventory management
- Digital wallet and loyalty systems

### 1.3 Definitions & Abbreviations

| Term | Definition |
|------|------------|
| FRS | Functional Requirement Specification |
| RBAC | Role-Based Access Control |
| RWF | Rwandan Franc (currency) |
| JWT | JSON Web Token |
| POS | Point of Sale |
| 2FA | Two-Factor Authentication |
| CLV | Customer Lifetime Value |

### 1.4 Requirement Notation
- **SHALL**: Mandatory requirement
- **MUST**: Mandatory requirement
- **SHOULD**: Recommended requirement
- **MAY**: Optional requirement

---

## 2. System Overview

### 2.1 Platform Description
URUTI Saluni is an integrated digital platform for salon associations and beauty businesses in Rwanda. The platform provides comprehensive tools for salon management, membership administration, appointment scheduling, financial services, and micro-lending capabilities.

### 2.2 Supported Platforms

| Platform | Supported |
|----------|-----------|
| Web Browser (Desktop) | Yes |
| Web Browser (Mobile) | Yes |
| Web Browser (Tablet) | Yes |
| Native Mobile App | Yes |

### 2.3 Supported Browsers
- Google Chrome (latest 2 versions)
- Mozilla Firefox (latest 2 versions)
- Microsoft Edge (latest 2 versions)
- Safari (latest 2 versions)

---

## 3. User Roles & Permissions

### 3.1 Role Hierarchy

**FRS-001**: The system SHALL implement a hierarchical role structure:

| Level | Role | Description |
|-------|------|-------------|
| 1 | SUPER_ADMIN | System-wide access |
| 2 | ASSOCIATION_ADMIN | Association-level administration |
| 3 | DISTRICT_LEADER | District oversight and regional management |
| 4 | SALON_OWNER | Salon operations management |
| 5 | SALON_EMPLOYEE | Daily operations and service delivery |
| 6 | CUSTOMER | Browse and book appointments |

### 3.2 Guest (Unauthenticated) Access

**FRS-002**: Guest users SHALL be able to:
- Browse the public salon directory
- View salon detail pages
- View service listings and prices
- View salon location on map
- Access login and registration pages
- Verify membership numbers publicly

**FRS-003**: Guest users SHALL NOT be able to:
- Book appointments
- Add salons to favorites
- Access any dashboard features
- View customer-specific information

### 3.3 Customer Access

**FRS-004**: Customers SHALL be able to:
- Perform all guest actions
- Book appointments at any salon
- View personal appointment history
- Manage favorite salons
- Update personal profile
- View and manage notification preferences
- Track loyalty points
- Write reviews and ratings

**FRS-005**: Customers SHALL NOT be able to:
- Access salon management features
- View other customers' data
- Manage employees or services
- Access financial reports

### 3.4 Salon Employee Access

**FRS-006**: Salon employees SHALL be able to:
- View assigned salon's appointment schedule
- Update appointment status for assigned appointments
- View customer information for their salon
- Record service completion
- Process sales transactions (if permitted)
- Clock in/out for attendance

**FRS-007**: Salon employees SHALL NOT be able to:
- Create or delete services
- Manage other employees
- Access financial data (unless permitted)
- Modify salon settings

### 3.5 Salon Owner Access

**FRS-008**: Salon owners SHALL be able to:
- Manage their owned salon(s)
- Create, edit, and delete services
- Manage employees (add, edit, remove, set permissions)
- View and manage all appointments
- Access salon financial reports
- Manage customer records
- Apply for association membership
- Configure salon settings
- Manage inventory and POS
- View commission and payroll reports
- Apply for loans

**FRS-009**: Salon owners SHALL NOT be able to:
- Access other salon owners' data
- Approve membership applications
- Manage system-wide settings
- Access loan product configuration

### 3.6 District Leader Access

**FRS-010**: District leaders SHALL be able to:
- View all salons within their assigned district
- Generate district-level reports
- Review loan applications for their district
- Monitor compliance within their region

### 3.7 Association Admin Access

**FRS-011**: Association admins SHALL be able to:
- Manage all salons in the association
- Approve/reject membership applications
- Manage users and roles
- Configure loan products
- Access all financial reports
- Manage system notifications

### 3.8 Super Admin Access

**FRS-012**: Super admins SHALL have unrestricted access including:
- All association admin capabilities
- System configuration
- Multi-association oversight
- User role assignment at any level

### 3.9 Permission Rules

**FRS-013**: The system SHALL implement permission inheritance where higher roles automatically inherit all permissions of lower roles.

**FRS-014**: The system SHALL prevent users from assigning roles higher than their own level.

### 3.10 Granular Employee Permissions

**FRS-015**: The system SHALL support granular permissions for employees:

| Permission Category | Permissions |
|---------------------|-------------|
| Appointments | MANAGE_APPOINTMENTS, ASSIGN_APPOINTMENTS, VIEW_ALL_APPOINTMENTS, MODIFY_APPOINTMENT_STATUS |
| Customers | MANAGE_CUSTOMERS, VIEW_CUSTOMER_HISTORY, VIEW_CUSTOMER_LOYALTY, UPDATE_CUSTOMER_INFO |
| Sales | PROCESS_PAYMENTS, APPLY_DISCOUNTS, VIEW_SALES_REPORTS, VOID_TRANSACTIONS |
| Services | MANAGE_SERVICES, UPDATE_SERVICE_PRICING |
| Products | MANAGE_PRODUCTS, UPDATE_PRODUCT_PRICING |
| Staff | MANAGE_EMPLOYEE_SCHEDULES, VIEW_EMPLOYEE_PERFORMANCE, VIEW_EMPLOYEE_COMMISSIONS |
| Inventory | MANAGE_INVENTORY, VIEW_INVENTORY_REPORTS, PROCESS_STOCK_ADJUSTMENTS |
| Salon | VIEW_SALON_SETTINGS, UPDATE_SALON_SETTINGS, MANAGE_BUSINESS_HOURS, MANAGE_SALON_PROFILE |

---

## 4. Authentication & Authorization

### 4.1 User Registration

**FRS-016**: The registration form SHALL require:

| Field | Required | Validation |
|-------|----------|------------|
| Full Name | Yes | Minimum 2 characters |
| Email | Yes | Valid email format, unique in system |
| Phone | No | Valid phone format |
| Password | Yes | Minimum 6 characters |
| Role Selection | Yes | customer, salon_owner, or salon_employee |

**FRS-017**: Upon successful registration, the system SHALL:
- Create the user account
- Hash password with bcrypt (10 rounds)
- Generate authentication token
- Automatically log in the user
- Redirect customer role to salon browse page
- Redirect other roles to dashboard

**FRS-018**: The system SHALL display an error message if:
- Email already exists in the system
- Password does not meet minimum requirements
- Required fields are empty

### 4.2 User Login

**FRS-019**: The login form SHALL require Email and Password fields.

**FRS-020**: The system SHALL support login via:
- Email + Password
- Phone Number + Password

**FRS-021**: Upon successful login, the system SHALL:
- Generate and store authentication token
- Store user session data
- Redirect based on user role:
  - Customers: `/salons/browse`
  - All other roles: `/dashboard`

**FRS-022**: The system SHALL support redirect parameters for post-login navigation when users attempt to access protected resources while unauthenticated.

### 4.3 Password Reset

**FRS-023**: The forgot password flow SHALL:
1. Accept user email address
2. Validate email exists in system
3. Generate secure token (32-byte random)
4. Hash token and store with expiration
5. Send password reset email with secure link
6. Display confirmation message

**FRS-024**: The reset password page SHALL:
- Validate the reset token
- Require new password entry
- Require password confirmation
- Display error if token is invalid or expired
- Redirect to login upon successful reset

**FRS-025**: Password reset tokens SHALL expire after 1 hour.

### 4.4 Email Change

**FRS-026**: The email change process SHALL:
1. Generate verification token (15-minute expiration)
2. Send verification email to current address
3. Validate new email availability
4. Update email with audit trail

### 4.5 Session Management

**FRS-027**: The system SHALL maintain user session using JWT tokens stored in browser localStorage.

**FRS-028**: JWT tokens SHALL contain: email, phone, user ID, role, issued time, expiration time.

**FRS-029**: The system SHALL automatically inject authentication tokens in all API requests.

**FRS-030**: When receiving a 401 (Unauthorized) response, the system SHALL:
- Clear all session data
- Redirect user to login page
- Display session expired message

**FRS-031**: The logout function SHALL:
- Clear authentication token
- Clear user data from storage
- Redirect to home page

### 4.6 Authentication Error Messages

**FRS-032**: The system SHALL display appropriate error messages:

| Scenario | Message |
|----------|---------|
| Invalid credentials | "Invalid email or password" |
| Account disabled | "Your account has been disabled" |
| Email not found | "No account found with this email" |
| Network error | "Unable to connect. Please try again." |

---

## 5. Salon Browsing & Discovery

### 5.1 Salon Listing Page

**FRS-033**: The salon browse page SHALL be accessible without authentication at `/salons/browse`.

**FRS-034**: The system SHALL display salons in three view modes:

| Mode | Layout | Items per Page |
|------|--------|----------------|
| Grid | 4 columns (desktop), 2 (tablet), 1 (mobile) | 12 |
| List | Single column with thumbnails | 8 |
| Map | Interactive map with markers | All visible in viewport |

**FRS-035**: The view mode toggle SHALL persist the user's selection within the session.

### 5.2 Search Functionality

**FRS-036**: The search bar SHALL filter salons across:
- Salon name, description, address
- City, district, country
- Phone number, email, website
- Service names, descriptions, categories

**FRS-037**: Search filtering SHALL be case-insensitive.

**FRS-038**: Search SHALL filter results in real-time as the user types.

**FRS-039**: The search bar SHALL:
- Expand with animation when focused
- Display a clear button when text is entered
- Collapse when empty and unfocused

### 5.3 Category Filters

**FRS-040**: The system SHALL provide category filter buttons:

| Category | Description |
|----------|-------------|
| All | Show all salons |
| Hair | Salons with hair services |
| Nails | Salons with nail services |
| Makeup | Salons with makeup services |
| Spa | Salons with spa services |
| Barber | Salons with barber services |

**FRS-041**: Category filtering SHALL filter based on service categories within each salon.

**FRS-042**: Only one category MAY be selected at a time.

### 5.4 Location Filter

**FRS-043**: The location dropdown SHALL:
- Display "All Locations" as default option
- List all unique cities from available salons
- Sort cities alphabetically

**FRS-044**: Selecting a location SHALL filter salons to only those in the selected city.

### 5.5 Sorting Options

**FRS-045**: The system SHALL provide sort options:

| Option | Sort Logic |
|--------|-----------|
| Trending Now | (reviewCount x 0.3) + (rating x 10), descending |
| Highest Rated | Rating, descending |
| Most Reviewed | Review count, descending |
| Newest | Creation date, descending |
| Name (A-Z) | Alphabetical by name |

**FRS-046**: Favorited salons SHALL always appear before non-favorited salons, regardless of sort option.

### 5.6 Salon Card Display

**FRS-047**: Each salon card in grid view SHALL display:
- Primary image (or placeholder if none)
- Salon name
- Location (district, city)
- Distance from user (if location available)
- Rating with star icon
- Review count
- Status badges (Top Rated, New, Trending)
- Favorite heart button
- Service preview (up to 2 services)
- "Explore & Book" button

**FRS-048**: The "Top Rated" badge SHALL appear when salon rating is 4.5 or higher.

**FRS-049**: The "New" badge SHALL appear when salon was created within the last 30 days.

**FRS-050**: Distance SHALL be calculated using the Haversine formula when user location is available.

### 5.7 Pagination

**FRS-051**: Pagination SHALL:
- Display page numbers (maximum 5 visible at once)
- Provide Previous/Next navigation buttons
- Disable Previous on first page
- Disable Next on last page
- Reset to page 1 when filters change

### 5.8 Favorites Functionality

**FRS-052**: Clicking the heart icon on a salon card SHALL:
- Require authentication (redirect to login if not authenticated)
- Toggle favorite status
- Update UI immediately (optimistic update)
- Sync with server

**FRS-053**: Favorited salons SHALL display a filled red heart icon.

**FRS-054**: Non-favorited salons SHALL display an outlined heart icon.

### 5.9 Empty and Loading States

**FRS-055**: While loading salons, the system SHALL display a loading spinner with "Loading salons..." message.

**FRS-056**: When no salons match filters, the system SHALL display:
- Empty state icon
- "No salons found" message
- Contextual help text
- "Clear filters" button

**FRS-057**: If an error occurs loading salons, the system SHALL display error message and "Retry" button.

---

## 6. Map View Functionality

### 6.1 Map Rendering

**FRS-058**: The map view SHALL use OpenStreetMap tiles via Leaflet.

**FRS-059**: The map SHALL have responsive height:

| Viewport | Height |
|----------|--------|
| Mobile | 75vh |
| Tablet | 80vh |
| Desktop | calc(100vh - 200px) |

**FRS-060**: The default map center SHALL be Kigali, Rwanda (coordinates: -1.9441, 30.0619).

**FRS-061**: The default zoom level SHALL be 12.

### 6.2 Salon Markers

**FRS-062**: Each salon with valid coordinates SHALL be represented by a marker on the map.

**FRS-063**: Markers SHALL display:
- Pill-shaped badge with salon name
- Colored dot indicator
- Pointer arrow indicating exact location

**FRS-064**: Selected markers SHALL be visually distinguished with:
- Darker background color
- Slight scale increase (1.08x)

**FRS-065**: Marker names longer than 16 characters SHALL be truncated with ellipsis.

### 6.3 Marker Clustering

**FRS-066**: When markers overlap, the system SHALL cluster them into a single cluster marker.

**FRS-067**: Cluster markers SHALL display the count of contained salons.

**FRS-068**: Clicking a cluster SHALL expand it to show individual markers (spiderfy behavior).

**FRS-069**: Maximum cluster radius SHALL be 60 pixels.

### 6.4 User Location

**FRS-070**: If the user grants location permission, their location SHALL be displayed as a blue circle marker.

**FRS-071**: User location marker SHALL display "Your location" in a popup when clicked.

### 6.5 Marker Interaction

**FRS-072**: Clicking a salon marker SHALL open the salon preview panel.

**FRS-073**: Clicking anywhere on the map (not on a marker) SHALL close the preview panel.

### 6.6 Preview Panel

**FRS-074**: On desktop (viewport >= 1024px), the preview panel SHALL:
- Slide in from the right edge
- Have a width of 380 pixels
- Display full height of the map container
- Use spring animation (damping: 25, stiffness: 300)

**FRS-075**: On mobile (viewport < 1024px), the preview panel SHALL:
- Appear as a bottom sheet
- Have a maximum height of 70vh
- Include a drag handle at the top
- Slide up with spring animation

**FRS-076**: The preview panel SHALL display:
- Salon image (or placeholder)
- Close button
- Favorite button
- Salon name
- Rating with review count
- Location and distance
- Short description (3 lines max)
- Phone number (if available)
- Service count
- Service list (up to 4-5 services)
- "View Details & Book" button

**FRS-077**: Clicking "View Details & Book" SHALL navigate to the salon detail page.

### 6.7 Map Edge Cases

**FRS-078**: Salons without valid coordinates SHALL NOT appear on the map.

**FRS-079**: The system SHALL display a count of hidden salons: "X salon(s) not shown (missing location)".

**FRS-080**: If no salons have coordinates, the system SHALL display an empty state message.

---

## 7. Salon Detail Page

### 7.1 Page Access

**FRS-081**: The salon detail page SHALL be accessible at `/salons/browse/[id]` without authentication.

**FRS-082**: If the salon ID is invalid, the system SHALL display a "Salon not found" error.

### 7.2 Sticky Header

**FRS-083**: The sticky header SHALL display:
- Back button (returns to browse page)
- Salon name (truncated if necessary)
- Location information
- Business type badge
- Target clientele badge
- Rating with review count
- Open/Closed status indicator
- Share button (desktop)
- Favorite button (desktop)

**FRS-084**: The Open/Closed status SHALL be calculated in real-time based on:
- Current day of week
- Current time
- Salon operating hours configuration

### 7.3 Page Layout

**FRS-085**: On desktop, the page SHALL use a two-column layout:

| Column | Width | Content |
|--------|-------|---------|
| Left | 8/12 | Services, Team, Gallery, Reviews |
| Right | 4/12 | Photos, About, Contact, Hours, Map |

**FRS-086**: On mobile, the layout SHALL stack vertically.

### 7.4 Services Section

**FRS-087**: The services section SHALL include a sticky toolbar with:
- Category filter pills (horizontal scrollable)
- Search input (expandable)
- Service count indicator

**FRS-088**: Services SHALL be grouped by category in accordion sections.

**FRS-089**: Each accordion section SHALL display:
- Category icon
- Category name
- Service count
- Expand/collapse indicator

**FRS-090**: The first category accordion SHALL be expanded by default; others collapsed.

**FRS-091**: When search is active, all accordions SHALL expand automatically.

### 7.5 Service Cards

**FRS-092**: Each service card SHALL display:
- Service image (96x96 pixels)
- Service name
- Description (2 lines maximum)
- Price in RWF
- Duration in minutes
- "Book" button

**FRS-093**: The first service in a category with 3+ services MAY display a "Top Pick" badge.

**FRS-094**: Clicking the service image or name SHALL open the service detail modal.

**FRS-095**: Clicking "Book" SHALL open the booking modal for that service.

### 7.6 Service Detail Modal

**FRS-096**: The service detail modal SHALL display:
- Large hero image
- Image navigation (if multiple images)
- Category badge
- Target gender badge
- Service name
- Price
- Duration
- Description
- Image thumbnails
- Salon information with rating
- "Book Appointment" button
- Close button

### 7.7 Team Section

**FRS-097**: The team section SHALL display employees in a horizontal scrollable layout.

**FRS-098**: Each employee card SHALL display:
- Avatar with initials
- Verification badge (if applicable)
- Employee name
- Role title
- Rating
- Skills (up to 2 visible)

### 7.8 Gallery Section

**FRS-099**: The gallery SHALL display images in a masonry grid:
- First image: 2x2 grid cells
- Remaining images: 1x1 grid cells
- Maximum 8 images visible

**FRS-100**: If more than 8 images exist, a "+N More" button SHALL appear.

**FRS-101**: Clicking any image SHALL open the lightbox viewer.

### 7.9 Lightbox Viewer

**FRS-102**: The lightbox SHALL:
- Display full-screen dark background
- Show current image centered
- Provide navigation arrows
- Display image counter (e.g., "3 / 12")
- Show thumbnail strip at bottom
- Support keyboard navigation (arrows, Escape)
- Close when clicking outside the image

### 7.10 Sidebar - About Section

**FRS-103**: The about section SHALL display:
- Salon description (expandable)
- "Read more/less" toggle for text >150 characters
- Employee count with avatars
- Service count
- WhatsApp button (if phone available)
- Email button

### 7.11 Contact Information

**FRS-104**: The contact section SHALL display (when available):

| Field | Action |
|-------|--------|
| Phone | Opens phone dialer (tel: link) |
| Email | Opens email client (mailto: link) |
| Website | Opens in new tab |
| Address | Static text display |

### 7.12 Working Hours

**FRS-105**: Working hours SHALL display for all 7 days of the week.

**FRS-106**: The current day SHALL be highlighted with:
- Different background color
- "Today" badge

**FRS-107**: Each day SHALL display:
- Day name
- Open and close times, OR
- "Closed" if not operating

**FRS-108**: If no hours are configured, display: "Contact salon for hours".

### 7.13 Location Map

**FRS-109**: The embedded map SHALL:
- Show salon marker at exact coordinates
- Display popup with salon name and address
- Provide "Directions" link to Google Maps
- Provide "Open in OpenStreetMap" link

---

## 8. Services & Categories

### 8.1 Service Data Structure

**FRS-110**: Each service SHALL have the following attributes:

| Attribute | Type | Required |
|-----------|------|----------|
| ID | String | Yes |
| Name | String | Yes |
| Code | String | No |
| Description | String | No |
| Base Price | Number | Yes |
| Duration (minutes) | Number | Yes |
| Is Active | Boolean | Yes |
| Salon ID | String | Yes |
| Category | String | No |
| Target Gender | String | No |
| Images | Array | No |

### 8.2 Category Organization

**FRS-111**: Services without a category SHALL be grouped under "General".

**FRS-112**: Categories SHALL be displayed alphabetically.

**FRS-113**: Each category SHALL show the count of services within it.

### 8.3 Service Filtering

**FRS-114**: Services SHALL be filterable by:
- Category (single selection)
- Search term (name, description, category)
- Active status (only active services shown to customers)

### 8.4 Pricing Display

**FRS-115**: Prices SHALL be displayed in Rwandan Francs (RWF) format.

**FRS-116**: Duration SHALL be displayed in minutes.

### 8.5 Predefined Categories

**FRS-117**: The system SHALL provide predefined categories:
- Haircut
- Coloring
- Treatment
- Braiding
- Nails
- Makeup
- Facial
- Massage
- Waxing

**FRS-118**: Custom categories MAY be created.

---

## 9. Booking & Appointments

### 9.1 Booking Flow Overview

**FRS-119**: The booking process SHALL consist of 3 steps:
1. Select Stylist
2. Select Date & Time
3. Review & Confirm

**FRS-120**: A progress indicator SHALL display the current step and completion status.

### 9.2 Step 1: Select Stylist

**FRS-121**: The stylist selection screen SHALL display:
- Service name being booked
- "No Preference" option (maximizes availability)
- List of available employees

**FRS-122**: Each employee option SHALL display:
- Avatar with initials
- Full name
- Role title
- Selection indicator

**FRS-123**: Selecting "No Preference" SHALL aggregate availability from all employees.

### 9.3 Step 2: Select Date & Time

**FRS-124**: The date and time selection SHALL display:
- Calendar for date selection
- Time slots grid for selected date

**FRS-125**: Calendar dates SHALL show availability status:

| Status | Visual Indicator |
|--------|-----------------|
| Available | Normal display |
| Partially Booked | Partial indicator |
| Fully Booked | Disabled/grayed |
| Unavailable | Disabled/grayed |

**FRS-126**: Time slots SHALL be displayed in 30-minute intervals.

**FRS-127**: Unavailable time slots SHALL be disabled and show the reason (e.g., "Past time slot").

**FRS-128**: Changing the selected date SHALL reset the time slot selection.

### 9.4 Step 3: Review & Confirm

**FRS-129**: The confirmation screen SHALL display:
- Service name and icon
- Selected date and time
- Selected stylist name (or "Any Available")
- Service duration
- Price in RWF
- Notes textarea (optional)

**FRS-130**: The "Confirm Booking" button SHALL:
- Validate the selected slot is still available
- Create the appointment
- Display success confirmation
- Provide alternative time suggestions if slot was taken

### 9.5 Booking Authentication

**FRS-131**: Users MUST be authenticated to complete a booking.

**FRS-132**: If unauthenticated, the system SHALL:
- Store booking intent in session storage
- Redirect to login page
- Resume booking after successful login

### 9.6 Booking Success

**FRS-133**: Upon successful booking, the system SHALL display:
- Success icon (green checkmark)
- Service name
- Date and time
- Confirmation message
- "Done" button to close modal

**FRS-134**: The system SHALL send booking confirmation notification to the customer.

### 9.7 Availability Rules

**FRS-135**: Availability SHALL be fetched for a 30-day window.

**FRS-136**: Time slots in the past SHALL be unavailable.

**FRS-137**: Time slots outside salon operating hours SHALL be unavailable.

**FRS-138**: Time slots with existing bookings SHALL be unavailable for the assigned employee.

---

## 10. Dashboard - Customer

### 10.1 Dashboard Access

**FRS-139**: Customers accessing `/dashboard` SHALL be shown the customer dashboard view.

### 10.2 Dashboard Components

**FRS-140**: The customer dashboard SHALL display:
- Upcoming appointments summary
- Quick booking access
- Recent appointment history
- Favorite salons
- Profile completion status
- Loyalty points balance

### 10.3 Appointment History

**FRS-141**: Customers SHALL be able to view their appointment history with:
- Service name
- Salon name
- Date and time
- Status
- Price paid

### 10.4 My Appointments

**FRS-142**: The "My Appointments" page SHALL display:
- List of all customer appointments
- Filter by status (upcoming, completed, cancelled)
- Sort by date
- Appointment details on click

---

## 11. Dashboard - Salon Owner

### 11.1 Dashboard Access

**FRS-143**: Salon owners accessing `/dashboard` SHALL be shown the salon owner dashboard view.

### 11.2 Quick Action Grid

**FRS-144**: The dashboard SHALL provide quick access to:

| Action | Description |
|--------|-------------|
| Bookings | Manage appointments |
| Staff | Employee management |
| Customers | Customer management |
| Payroll | Staff compensation |
| Inventory | Stock management |
| Services | Service catalog |
| Sales | Transaction history |
| Finance | Financial reports |
| Settings | Salon configuration |

### 11.3 Dashboard Statistics

**FRS-145**: The dashboard SHALL display:
- Total employee count
- Total customer count
- Service offerings count
- New customers (30-day)
- Revenue metrics
- Appointment statistics
- Today's appointments
- Pending bookings

### 11.4 Multi-Salon Support

**FRS-146**: Salon owners with multiple salons SHALL be able to switch between salons.

**FRS-147**: Each salon's data SHALL be isolated and displayed separately.

---

## 12. Dashboard - Administrator

### 12.1 Dashboard Access

**FRS-148**: Administrators (Super Admin, Association Admin) accessing `/dashboard` SHALL be shown the admin dashboard view.

### 12.2 Admin Statistics

**FRS-149**: The admin dashboard SHALL display:
- Total user count
- Active user count
- User distribution by role
- Total salon count
- Membership statistics
- System health indicators
- Loan portfolio summary
- Revenue analytics

### 12.3 Admin Quick Actions

**FRS-150**: Administrators SHALL have quick access to:
- User management
- Membership management
- System settings
- Reports
- Loan management
- Salon oversight

---

## 13. Salon Management

### 13.1 Salon Creation

**FRS-151**: Creating a salon SHALL require:

| Field | Required | Validation |
|-------|----------|------------|
| Name | Yes | Minimum 2 characters |
| Description | No | Maximum 1000 characters |
| Address | No | - |
| Phone | No | Valid phone format |
| Email | No | Valid email format |
| Website | No | Valid URL format |
| Business Type | Yes | One of predefined types |
| Target Clientele | Yes | men, women, or both |

### 13.2 Business Types

**FRS-152**: The system SHALL support the following business types:
- Hair Salon
- Beauty Spa
- Nail Salon
- Barbershop
- Full Service
- Mobile Salon

### 13.3 Operating Hours

**FRS-153**: Operating hours SHALL be configurable for each day of the week.

**FRS-154**: Each day SHALL have:
- Open/closed toggle
- Opening time
- Closing time

**FRS-155**: The system SHALL support break time definitions.

### 13.4 Salon Location

**FRS-156**: Salon location SHALL include:
- Latitude coordinate
- Longitude coordinate
- City
- District
- Street address

### 13.5 Salon Status

**FRS-157**: Salons SHALL have one of the following statuses:

| Status | Description |
|--------|-------------|
| Active | Visible and operational |
| Inactive | Hidden from public |
| Pending | Awaiting approval |

### 13.6 Salon Images

**FRS-158**: Salons SHALL support multiple images for gallery display.

**FRS-159**: Images SHALL have a maximum file size of 10MB each.

---

## 14. Service Management

### 14.1 Service CRUD Operations

**FRS-160**: Salon owners SHALL be able to create services with:

| Field | Required | Validation |
|-------|----------|------------|
| Name | Yes | Minimum 2 characters |
| Code | No | Unique within salon |
| Description | No | Maximum 500 characters |
| Duration | Yes | Positive integer (minutes) |
| Base Price | Yes | Non-negative number (RWF) |
| Category | No | Predefined or custom |
| Target Gender | No | everyone, men, women |
| Images | No | Maximum 5 images, 10MB each |
| Status | Yes | Active/Inactive |

### 14.2 Service Display Rules

**FRS-161**: Only active services SHALL be displayed to customers.

**FRS-162**: Services SHALL be sortable by name, price, and duration.

### 14.3 Service Analytics

**FRS-163**: The service management page SHALL display:
- Total service count
- Active service count
- Average price
- Average duration
- Most popular services

---

## 15. Employee Management

### 15.1 Employee Creation

**FRS-164**: Adding an employee SHALL require:

| Field | Required |
|-------|----------|
| User selection | Yes |
| Professional title | Yes |
| Skills/Specializations | No |
| Employment type | Yes |
| Hire date | No |

### 15.2 Employment Types

**FRS-165**: The system SHALL support:
- Full-time
- Part-time
- Contract

### 15.3 Compensation Configuration

**FRS-166**: Employee compensation SHALL support:

| Type | Fields |
|------|--------|
| Commission Only | Commission rate (%) |
| Salary Only | Base salary (RWF), Pay frequency |
| Salary + Commission | Base salary, Commission rate, Pay frequency |

### 15.4 Professional Titles

**FRS-167**: The system SHALL provide predefined titles:
- Stylist
- Senior Stylist
- Master Stylist
- Colorist
- Nail Technician
- Makeup Artist
- Esthetician
- Barber
- Receptionist
- Manager

### 15.5 Employee Status

**FRS-168**: Employees SHALL have Active or Inactive status.

**FRS-169**: Inactive employees SHALL NOT appear in booking stylist selection.

### 15.6 Attendance Tracking

**FRS-170**: The system SHALL support employee attendance tracking:
- Clock in/out functionality
- Break time tracking
- Overtime calculation
- Attendance history

---

## 16. Customer Management

### 16.1 Customer Profile

**FRS-171**: Customer profiles SHALL include:
- Full name
- Phone number
- Email address
- Loyalty points
- VIP status indicator
- Appointment history
- Purchase history
- Service preferences
- Custom notes per salon

### 16.2 Customer Segmentation

**FRS-172**: The system SHALL support filtering customers by:

| Segment | Criteria |
|---------|----------|
| All | No filter |
| High-Value | Loyalty points >= 1000 |
| Loyal | Loyalty points >= 500 |
| Recent | Joined within 30 days |
| Inactive | No appointments in 90 days |

### 16.3 Customer Analytics

**FRS-173**: The customer management page SHALL display:
- Total customer count
- Active customer count
- High-value customer count
- Average loyalty points
- New customers (30-day)
- Customer lifetime value

### 16.4 Communication History

**FRS-174**: The system SHALL track customer communication:
- SMS, email, phone, in-app messages
- Communication purpose categorization
- Delivery status tracking
- Follow-up scheduling

---

## 17. Appointment Management

### 17.1 Appointment Statuses

**FRS-175**: Appointments SHALL have one of the following statuses:

| Status | Description |
|--------|-------------|
| Pending | Awaiting confirmation |
| Booked | Confirmed booking |
| Confirmed | Appointment confirmed by salon |
| In Progress | Service being delivered |
| Completed | Service finished |
| Cancelled | Appointment cancelled |
| No Show | Customer did not arrive |

### 17.2 Status Transitions

**FRS-176**: Valid status transitions SHALL be:
```
Pending -> Booked -> Confirmed -> In Progress -> Completed
         \-> Cancelled
         \-> No Show
```

### 17.3 Appointment Views

**FRS-177**: Appointments SHALL be viewable in:
- Calendar view (monthly/weekly/daily)
- List view (grouped by date)
- Table view (sortable columns)

### 17.4 Appointment Filtering

**FRS-178**: Appointments SHALL be filterable by:
- Status
- Date range (today, tomorrow, upcoming, past)
- Employee
- Customer
- Service

### 17.5 Appointment Details

**FRS-179**: Each appointment SHALL display:
- Customer name and contact
- Service name
- Employee assigned
- Date and time
- Duration
- Price
- Status
- Notes

### 17.6 Appointment Actions

**FRS-180**: Salon staff SHALL be able to:
- Update appointment status
- Reassign employee
- Modify date/time
- Add notes
- Cancel with reason

---

## 18. Point of Sale System

### 18.1 Sales Transaction Processing

**FRS-181**: The POS system SHALL support recording sales for:
- Services rendered
- Products sold
- Packages
- Mixed transactions (services + products)

### 18.2 Payment Methods

**FRS-182**: The system SHALL support payment methods:
- Cash
- Card
- Mobile Money
- Airtel Money
- Bank Transfer
- Wallet payments
- Split payments

### 18.3 Sales Item Management

**FRS-183**: Line items SHALL support:
- Service or product selection
- Quantity specification
- Unit price display
- Discount application
- Line total calculation
- Employee assignment for commissions

### 18.4 Discount System

**FRS-184**: The discount system SHALL support:
- Percentage discounts
- Fixed amount discounts
- Service-specific discounts
- Customer loyalty discounts
- Promotional codes
- Manager override discounts

### 18.5 Receipt Management

**FRS-185**: The system SHALL support:
- Digital receipt generation
- Email receipt delivery
- SMS receipt delivery
- Receipt reprinting
- Transaction lookup
- Refund processing

---

## 19. Inventory Management

### 19.1 Product Catalog

**FRS-186**: Products SHALL have attributes:
- Product name and description
- SKU (Stock Keeping Unit)
- Category classification
- Unit pricing
- Tax rate specification
- Supplier information
- Reorder levels

### 19.2 Stock Management

**FRS-187**: The system SHALL track inventory movements:
- Purchase receipts
- Sales consumption
- Stock adjustments
- Transfers between locations
- Returns and refunds
- Waste/damage recording

### 19.3 Stock Tracking

**FRS-188**: The system SHALL provide:
- Real-time stock levels
- Low stock alerts
- Reorder point notifications
- Stock valuation
- Movement history
- Audit trails

### 19.4 Inventory Reporting

**FRS-189**: Available reports SHALL include:
- Stock level reports
- Movement reports
- Valuation reports
- Reorder reports
- Usage analytics

---

## 20. Financial Management & Accounting

### 20.1 Double-Entry Bookkeeping

**FRS-190**: The system SHALL support double-entry bookkeeping with:
- Chart of accounts (Asset, Liability, Equity, Revenue, Expense)
- Journal entries (automatic and manual)
- Entry approval workflow
- Posting to ledger
- Entry reversal capability
- Audit trail maintenance

### 20.2 Invoice Management

**FRS-191**: The invoice system SHALL support:
- Invoice creation and customization
- Customer billing
- Payment tracking
- Overdue management
- Invoice templates
- Tax calculation

### 20.3 Financial Reporting

**FRS-192**: Standard reports SHALL include:
- Income Statement (P&L)
- Balance Sheet
- Cash Flow Statement
- Trial Balance
- Aged Receivables
- Expense Reports

### 20.4 Salon Owner Financial Access

**FRS-193**: Salon owners SHALL be able to view:
- Daily/weekly/monthly revenue
- Payment method breakdown
- Service revenue distribution
- Employee performance
- Expense tracking

---

## 21. Commission & Payroll

### 21.1 Commission Tracking

**FRS-194**: The system SHALL automatically calculate employee commissions based on:
- Services performed
- Commission rate configured
- Sales amount
- Product sales (if applicable)

### 21.2 Commission Features

**FRS-195**: The commission system SHALL support:
- Real-time commission calculation
- Commission history tracking
- Payment status management
- Bulk commission payments
- Commission reporting

### 21.3 Payroll Management

**FRS-196**: The payroll system SHALL support:
- Salary calculation based on employment type
- Commission inclusion
- Deductions management
- Pay period configuration
- Payslip generation
- Payment history

---

## 22. Membership System

### 22.1 Membership Application

**FRS-197**: Salon owners SHALL be able to apply for association membership.

**FRS-198**: Membership application SHALL require:
- Salon information
- Owner identification
- Business documentation
- Membership tier selection

### 22.2 Membership Tiers

**FRS-199**: The system SHALL support membership tiers:
- Basic
- Premium
- Enterprise

### 22.3 Application Workflow

**FRS-200**: Membership applications SHALL follow this workflow:
```
Submitted -> Under Review -> Approved / Rejected
```

### 22.4 Membership Status

**FRS-201**: Salon owners SHALL be able to check membership status at `/membership/status`.

### 22.5 Membership Verification

**FRS-202**: Membership numbers SHALL be publicly verifiable at `/verify/membership/[membershipNumber]`.

### 22.6 Membership Benefits

**FRS-203**: Membership benefits SHALL include:
- Platform access levels
- Financial services access
- Training access
- Marketing support
- Priority support (premium tiers)

---

## 23. Loan Management

### 23.1 Loan Products

**FRS-204**: Administrators SHALL be able to configure loan products with:
- Product name
- Interest rate
- Minimum/maximum amounts
- Repayment period
- Eligibility criteria
- Guarantor requirements
- Collateral requirements

### 23.2 Loan Types

**FRS-205**: The system SHALL support loan types:
- Working capital loans
- Equipment financing
- Business expansion loans
- Emergency loans

### 23.3 Loan Application

**FRS-206**: Eligible salon owners SHALL be able to apply for loans.

**FRS-207**: Loan applications SHALL require:
- Loan amount requested
- Purpose of loan
- Repayment plan selection
- Business information
- Financial documentation

### 23.4 Credit Scoring

**FRS-208**: The system SHALL calculate credit scores based on:
- Business performance metrics
- Payment history
- Cash flow analysis
- Salon membership status
- Association standing

### 23.5 Loan Statuses

**FRS-209**: Loans SHALL have statuses:

| Status | Description |
|--------|-------------|
| Pending | Application submitted |
| Approved | Approved for disbursement |
| Disbursed | Funds released |
| Active | Repayment in progress |
| Paid | Fully repaid |
| Defaulted | Missed payments |

### 23.6 Loan Servicing

**FRS-210**: The system SHALL support:
- Repayment schedule generation
- Payment processing
- Late fee calculation
- Default management
- Early payment handling

---

## 24. Digital Wallet System

### 24.1 Wallet Management

**FRS-211**: The system SHALL support digital wallets with:
- Multi-currency support (RWF primary)
- Real-time balance tracking
- Transaction history
- Security controls
- Spending limits

### 24.2 Wallet Types

**FRS-212**: The system SHALL support wallet types:
- Personal wallets (customers)
- Business wallets (salons)
- Employee wallets
- Commission wallets

### 24.3 Transaction Types

**FRS-213**: Wallet transactions SHALL include:
- Deposits
- Withdrawals
- Transfers
- Loan disbursements
- Loan repayments
- Commission payments
- Refunds

### 24.4 Wallet Security

**FRS-214**: Wallet security SHALL include:
- PIN-based authentication
- Transaction limits
- Suspicious activity detection
- Account freezing capabilities

---

## 25. Loyalty & Rewards System

### 25.1 Points System

**FRS-215**: The loyalty system SHALL support:
- Service-based points (configurable rate per RWF)
- Product purchase points
- Referral bonuses
- Birthday bonuses
- Special promotion points

### 25.2 Points Management

**FRS-216**: Points management SHALL include:
- Automatic points calculation
- Manual points adjustment
- Points expiration handling
- Points history tracking

### 25.3 Redemption System

**FRS-217**: Redemption options SHALL include:
- Service discounts
- Product discounts
- Free services
- Gift vouchers

### 25.4 Salon-Specific Settings

**FRS-218**: Each salon MAY configure:
- Points earning rates
- Redemption rates
- Minimum redemption amounts
- Points expiration periods
- VIP thresholds

---

## 26. User Management

### 26.1 User CRUD Operations

**FRS-219**: Administrators SHALL be able to:
- Create users with role assignment
- View user details
- Update user information
- Change user roles
- Activate/deactivate accounts
- Delete users (with confirmation)

### 26.2 User Creation

**FRS-220**: Creating a user SHALL require:

| Field | Required |
|-------|----------|
| Full Name | Yes |
| Email | Yes |
| Phone | No |
| Password | Yes |
| Role | Yes |

### 26.3 User Search and Filtering

**FRS-221**: User management SHALL support:
- Search by name, email, phone
- Filter by role
- Filter by status (active/inactive)

### 26.4 User Statistics

**FRS-222**: The user management page SHALL display:
- Total users
- Active users
- Count per role

### 26.5 Role Modification

**FRS-223**: Administrators SHALL NOT be able to:
- Delete their own account
- Assign roles higher than their own level

---

## 27. Settings & Configuration

### 27.1 Profile Settings

**FRS-224**: All users SHALL be able to manage:
- Full name
- Email address
- Phone number
- Avatar image
- Password

### 27.2 Extended Profile

**FRS-225**: Users MAY provide additional information:
- Date of birth
- Gender
- Nationality
- National ID
- Address details
- Emergency contact
- Bank account details

### 27.3 Notification Preferences

**FRS-226**: Users SHALL be able to configure:

| Notification | Default |
|--------------|---------|
| Email appointment reminders | On |
| SMS alerts | Off |
| Payment confirmations | On |
| Security alerts | On |
| Product updates | Off |
| Promotional emails | Off |

### 27.4 Security Settings

**FRS-227**: Users SHALL be able to:
- Change password (requires current password)
- Enable/disable 2FA
- View active sessions
- Terminate other sessions

### 27.5 System Configuration (Admin Only)

**FRS-228**: System administrators SHALL be able to configure:

| Setting | Description |
|---------|-------------|
| Maintenance Mode | Enable/disable site |
| Registration | Enable/disable new registrations |
| Feature Modules | Enable/disable loans, payroll, inventory |
| Commission Rate | Default commission percentage |
| Tax Rate | Default tax percentage |
| Session Timeout | Minutes until auto-logout |
| Max Login Attempts | Before account lockout |

---

## 28. Notifications

### 28.1 In-App Notifications

**FRS-229**: The system SHALL display in-app notifications for:

| Event | Recipients |
|-------|-----------|
| New appointment | Salon owner, Employee |
| Appointment cancelled | Salon owner, Employee |
| Appointment reminder | Customer |
| Membership approved | Salon owner |
| Loan status change | Salon owner |
| Payment received | Salon owner |
| Low stock alert | Salon owner |

### 28.2 Email Notifications

**FRS-230**: The system SHALL send email notifications for:

| Event | Recipients |
|-------|-----------|
| Registration | New user |
| Password reset | User |
| Appointment confirmation | Customer |
| Appointment reminder (24h) | Customer |
| Membership decision | Salon owner |
| Loan approval/rejection | Salon owner |

### 28.3 SMS Notifications

**FRS-231**: The system SHALL support SMS notifications for:
- Appointment reminders
- Booking confirmations
- Payment confirmations

### 28.4 Notification Center

**FRS-232**: Users SHALL be able to:
- View all notifications
- Mark notifications as read
- Delete notifications
- Filter by type

---

## 29. Reviews & Ratings

### 29.1 Review Submission

**FRS-233**: Customers SHALL be able to submit reviews with:
- Star rating (1-5)
- Written review text
- Service-specific rating (optional)
- Employee rating (optional)

### 29.2 Review Requirements

**FRS-234**: Reviews SHALL require:
- Completed appointment at the salon
- Authentication

### 29.3 Review Display

**FRS-235**: Reviews SHALL be displayed on:
- Salon detail page
- Search results (aggregate rating)
- Employee profiles

### 29.4 Review Management

**FRS-236**: Salon owners SHALL be able to:
- View all reviews
- Respond to reviews
- Report inappropriate reviews

---

## 30. UI/UX Functional Rules

### 30.1 Responsiveness

**FRS-237**: All pages SHALL be fully responsive across:

| Breakpoint | Width |
|------------|-------|
| Mobile | < 640px |
| Tablet | 640px - 1024px |
| Desktop | > 1024px |

### 30.2 Dark Mode

**FRS-238**: The system SHALL support dark mode with:
- Manual toggle in settings
- Persisted preference in localStorage
- Consistent theming across all components

### 30.3 Loading States

**FRS-239**: All data-loading operations SHALL display:
- Loading spinner or skeleton
- Appropriate loading text
- Disabled interaction during load

### 30.4 Button States

**FRS-240**: Buttons SHALL display appropriate states:

| State | Visual |
|-------|--------|
| Default | Normal appearance |
| Hover | Slight color change |
| Active | Pressed appearance |
| Loading | Spinner icon, disabled |
| Disabled | Grayed out, no interaction |

### 30.5 Form Validation

**FRS-241**: Form validation SHALL:
- Validate on blur for individual fields
- Validate all fields on submit
- Display inline error messages
- Highlight invalid fields with red border
- Prevent submission until valid

### 30.6 Toast Notifications

**FRS-242**: Toast notifications SHALL:
- Appear in top-right corner
- Auto-dismiss after 5 seconds
- Support types: success (green), error (red), info (blue), warning (yellow)
- Be dismissible by clicking

### 30.7 Modal Dialogs

**FRS-243**: Modal dialogs SHALL:
- Center on screen
- Have dark overlay background
- Close on Escape key
- Close on overlay click (unless destructive action)
- Trap focus within modal

### 30.8 Confirmation Dialogs

**FRS-244**: Destructive actions SHALL require confirmation with:
- Clear description of action
- Consequences explanation
- Cancel button
- Confirm button (styled as danger)

---

## 31. Error Handling & Edge Cases

### 31.1 Network Errors

**FRS-245**: When network is unavailable, the system SHALL:
- Display "Unable to connect" message
- Provide retry option
- Preserve user input where possible

### 31.2 Server Errors

**FRS-246**: For server errors (5xx), the system SHALL:
- Display user-friendly error message
- Log error details for debugging
- Provide retry option

### 31.3 Not Found Errors

**FRS-247**: For 404 errors, the system SHALL:
- Display "Page not found" or "Resource not found" message
- Provide navigation to home or back

### 31.4 Unauthorized Access

**FRS-248**: When accessing unauthorized resources, the system SHALL:
- Redirect to login page (if unauthenticated)
- Display "Access denied" message (if authenticated but unauthorized)

### 31.5 Session Expiry

**FRS-249**: When session expires, the system SHALL:
- Clear local session data
- Redirect to login page
- Display "Session expired" message
- Preserve the intended destination for post-login redirect

### 31.6 Form Validation Errors

**FRS-250**: Form validation errors SHALL:
- Display specific error message per field
- Scroll to first error if off-screen
- Maintain other valid field values

### 31.7 Empty States

**FRS-251**: Empty lists/tables SHALL display:
- Relevant icon
- "No items found" message
- Helpful action (e.g., "Create first item")

### 31.8 Rate Limiting

**FRS-252**: If rate limited, the system SHALL:
- Display "Too many requests" message
- Indicate when to retry

---

## 32. Non-Functional Requirements

### 32.1 Performance

**FRS-253**: Page load time SHALL be under 3 seconds on standard broadband connection.

**FRS-254**: API responses SHALL be received within 5 seconds.

**FRS-255**: Animations SHALL run at 60fps without jank.

**FRS-256**: Rate limiting SHALL be 100 requests per minute per user.

### 32.2 Browser Compatibility

**FRS-257**: The application SHALL function correctly on:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### 32.3 Security

**FRS-258**: Authentication tokens SHALL be stored securely in localStorage.

**FRS-259**: Passwords SHALL be transmitted over HTTPS only.

**FRS-260**: Sensitive data SHALL NOT be logged to browser console in production.

**FRS-261**: Form inputs SHALL be sanitized to prevent XSS attacks.

**FRS-262**: The system SHALL implement SQL injection prevention.

**FRS-263**: The system SHALL implement CSRF protection.

### 32.4 Accessibility

**FRS-264**: Interactive elements SHALL be keyboard accessible.

**FRS-265**: Images SHALL have appropriate alt text.

**FRS-266**: Color contrast SHALL meet WCAG AA standards.

**FRS-267**: Focus indicators SHALL be visible for keyboard navigation.

### 32.5 Data Protection

**FRS-268**: Personal data SHALL be encrypted at rest and in transit.

**FRS-269**: The system SHALL maintain audit trails for sensitive operations.

**FRS-270**: Users SHALL have the right to request data deletion.

---

## Document Summary

| Category | Count |
|----------|-------|
| Total Requirements | 270 |
| Authentication | 17 |
| User Roles | 15 |
| Browsing & Discovery | 25 |
| Map Functionality | 23 |
| Salon Detail | 29 |
| Booking | 20 |
| Dashboards | 14 |
| Management | 45 |
| POS & Inventory | 14 |
| Financial | 17 |
| Membership & Loans | 17 |
| Wallet & Loyalty | 8 |
| Notifications | 4 |
| Reviews | 4 |
| UI/UX | 8 |
| Error Handling | 8 |
| Non-Functional | 18 |

---

**End of Document**
