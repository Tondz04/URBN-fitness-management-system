# RNL Gym Management System - Complete Functionality List & Testing Guide

## 📋 Table of Contents

1. [Authentication & User Management](#1-authentication--user-management)
2. [Dashboard Features](#2-dashboard-features)
3. [Users/Clients Management](#3-usersclients-management)
4. [Products Management](#4-products-management)
5. [Transactions Management](#5-transactions-management)
6. [Tracking System](#6-tracking-system)
7. [UI/UX Features](#7-uiux-features)
8. [Revenue Reports](#8-revenue-reports-backend-ready)
9. [Rewards System](#9-rewards-system-backend-ready)

---

## 1. Authentication & User Management

### ✅ NEW FEATURES

#### 1.1 Role-Based Login System

**Description:** Login with role-based access (MAIN_ADMIN, ADMIN, STAFF)

**Test Steps:**

1. Go to `http://localhost:5173/login`
2. Try logging in with:
   - **Main Admin:** `admin@rnlgym.com` / `admin123`
   - **Admin:** (create one first via registration)
   - **Staff:** (create one first via registration)
3. **Expected:** Should redirect to dashboard after successful login
4. **Test Invalid Login:**
   - Wrong email/password → Should show error message
   - User without role → Should show "does not have system access"

**Test Cases:**

- ✅ Valid credentials → Login successful
- ✅ Invalid credentials → Error message shown
- ✅ User without role → Access denied
- ✅ Logout → Redirects to login page

---

#### 1.2 First-Time Setup (Initial Admin Creation)

**Description:** Create the first admin account when no admins exist

**Test Steps:**

1. **Option A - Via Seeder:**

   ```bash
   cd server
   php artisan db:seed --class=AdminSeeder
   ```

   - Creates: `admin@rnlgym.com` / `admin123`

2. **Option B - Via Registration Page:**
   - Go to `http://localhost:5173/register`
   - Fill in form (name, email, password)
   - Click "Create Admin Account"
   - **Expected:** Account created, redirects to login

**Test Cases:**

- ✅ No admins exist → Setup page shows "Initial Setup"
- ✅ Admins exist → Setup page shows "Create Account" (requires auth)
- ✅ After setup → Can login with created account

---

#### 1.3 Account Registration (Admin/Staff Creation)

**Description:** Create new admin or staff accounts (requires authentication)

**Test Steps:**

1. Login as Main Admin or Admin
2. Click "Create Account" in sidebar OR go to `/register`
3. Fill in:
   - Full Name (will be converted to ALL CAPS)
   - Email (must be unique)
   - Role (Main Admin can create all, Admin can only create Staff)
   - Password (min 6 characters)
   - Confirm Password
4. Click "Create Account"
5. **Expected:** Success message, account created

**Test Cases:**

- ✅ Main Admin creates Admin → Success
- ✅ Main Admin creates Staff → Success
- ✅ Admin creates Staff → Success
- ✅ Admin tries to create Admin → Error: "Admin can only create Staff accounts"
- ✅ Staff tries to access → Error: "Unauthorized"
- ✅ Duplicate email → Error: "Email already exists"
- ✅ Password mismatch → Error: "Passwords do not match"
- ✅ Short password → Error: "Password must be at least 6 characters"

---

#### 1.4 Role-Based Access Control

**Description:** Different permissions for different roles

**Test Steps:**

1. **Main Admin:**

   - Login as Main Admin
   - **Expected:** Can see all revenue data, can create Admin/Staff accounts

2. **Admin:**

   - Login as Admin
   - **Expected:** Limited revenue access, can only create Staff accounts

3. **Staff:**
   - Login as Staff
   - **Expected:** No revenue data, cannot create accounts

**Test Cases:**

- ✅ Main Admin sees full revenue → Dashboard shows all financial data
- ✅ Admin sees restricted revenue → Dashboard shows "Restricted" for revenue
- ✅ Staff sees no revenue → Dashboard shows "Restricted" for revenue
- ✅ Main Admin can access all pages → All navigation items visible
- ✅ Staff cannot see "Create Account" → Link hidden in sidebar

---

## 2. Dashboard Features

### ✅ EXISTING FEATURES

#### 2.1 Dashboard Metrics Display

**Description:** View key metrics (Total Users, Active Members, Revenue, New Signups)

**Test Steps:**

1. Login to system
2. Go to Dashboard (`/`)
3. **Expected:** See 4 stat cards:
   - Total Users
   - Active Members
   - Monthly Revenue (restricted for non-main-admin)
   - New Signups

**Test Cases:**

- ✅ Metrics load correctly → All 4 cards show data
- ✅ Main Admin sees revenue → Actual amount displayed
- ✅ Non-main-admin sees revenue → Shows "Restricted"
- ✅ Metrics update when navigating months → Use arrow buttons

---

#### 2.2 Month Navigation

**Description:** Navigate between months to view historical data

**Test Steps:**

1. On Dashboard, use Previous/Next month arrows
2. **Expected:** Metrics update for selected month
3. Current month button should be disabled for "Next"

**Test Cases:**

- ✅ Previous month → Metrics update
- ✅ Next month (if not current) → Metrics update
- ✅ Next month (current) → Button disabled
- ✅ Current month indicator → Shows "Current Month" badge

---

#### 2.3 Revenue Charts

**Description:** Visual representation of revenue trends and breakdown

**Test Steps:**

1. Login as Main Admin
2. Go to Dashboard
3. **Expected:** See two charts:
   - Revenue Trend (line chart)
   - Revenue Breakdown (pie chart)

**Test Cases:**

- ✅ Main Admin sees charts → Both charts visible
- ✅ Non-main-admin → Message: "Revenue reports only available to Main Admin"
- ✅ Charts display data → Visual representation of revenue

---

#### 2.4 Low Stock Alerts

**Description:** Alert for products with low stock

**Test Steps:**

1. Go to Dashboard
2. **Expected:** If products have low stock, see alert box
3. Alert shows product name, price, and stock count

**Test Cases:**

- ✅ Products with low stock → Alert appears
- ✅ No low stock → Alert doesn't appear
- ✅ Alert updates → Refreshes every 30 seconds

---

#### 2.5 Recent Attendance

**Description:** Display recent attendance records

**Test Steps:**

1. Go to Dashboard
2. **Expected:** See "Recent Attendance" section
3. Shows last 5 attendance records with client name, time, date, status

**Test Cases:**

- ✅ Attendance records exist → Shows last 5
- ✅ No attendance → Shows "No recent attendance records"
- ✅ Real-time updates → Updates when new attendance recorded

---

### ✅ NEW FEATURES

#### 2.6 Role-Based Revenue Visibility

**Description:** Revenue data hidden from non-main-admin users

**Test Steps:**

1. Login as Admin or Staff
2. Go to Dashboard
3. **Expected:**
   - Monthly Revenue shows "Restricted"
   - Charts section replaced with message
   - Message: "Revenue reports and financial summaries are only available to Main Admin"

**Test Cases:**

- ✅ Main Admin → Full revenue access
- ✅ Admin → Restricted access
- ✅ Staff → Restricted access

---

## 3. Users/Clients Management

### ✅ EXISTING FEATURES

#### 3.1 View All Clients

**Description:** Display list of all gym members/clients

**Test Steps:**

1. Go to "Clients" page (`/clients` or `/users`)
2. **Expected:** Table showing all clients with:
   - Client name, email, phone
   - RFID Tag
   - Status (Active/Inactive/Expired)
   - Membership status
   - Membership type
   - Membership fee
   - Actions (Edit, Delete)

**Test Cases:**

- ✅ Clients load → Table populated
- ✅ Empty state → Shows "No clients found"
- ✅ Client details → Click name to see details modal

---

#### 3.2 Create New Client

**Description:** Add a new gym member

**Test Steps:**

1. Go to Clients page
2. Click "Add Client" button
3. Fill in form:
   - First Name
   - Last Name
   - Email (required, unique)
   - Phone
   - Age
   - Address
   - RFID Tag (auto-generated, can regenerate)
   - Status (Active/Inactive)
   - Notes
4. Click "Create Client"
5. **Expected:** Client created, name stored in ALL CAPS

**Test Cases:**

- ✅ Valid data → Client created successfully
- ✅ Duplicate email → Error: "Email already exists"
- ✅ Missing required fields → Validation error
- ✅ Name normalization → Name saved in ALL CAPS
- ✅ RFID auto-generation → RFID tag generated automatically

---

#### 3.3 Edit Client

**Description:** Update client information

**Test Steps:**

1. Go to Clients page
2. Click "Edit" button on any client
3. Modify fields
4. Click "Update Client"
5. **Expected:** Client updated, name normalized to ALL CAPS

**Test Cases:**

- ✅ Update name → Saved in ALL CAPS
- ✅ Update email → Must be unique
- ✅ Update status → Status changes immediately
- ✅ Cancel → Form closes without saving

---

#### 3.4 Delete Client

**Description:** Remove a client from system

**Test Steps:**

1. Go to Clients page
2. Click "Delete" button on a client
3. Confirm deletion
4. **Expected:** Client deleted (if no active transactions)

**Test Cases:**

- ✅ Client with no transactions → Deleted successfully
- ✅ Client with transactions → Error: "Cannot delete user with active transactions"
- ✅ Cancel deletion → Client remains

---

#### 3.5 Update Client Status

**Description:** Change client status (Active/Inactive/Expired)

**Test Steps:**

1. Go to Clients page
2. Find status dropdown in table
3. Select new status
4. **Expected:** Status updates immediately

**Test Cases:**

- ✅ Change to Active → Status updates
- ✅ Change to Inactive → Status updates
- ✅ Change to Expired → Status updates

---

#### 3.6 View Client Details

**Description:** See full client information in modal

**Test Steps:**

1. Go to Clients page
2. Click on client name
3. **Expected:** Modal opens showing all client details

**Test Cases:**

- ✅ Modal opens → Shows all information
- ✅ Close modal → Click X or outside modal

---

### ✅ NEW FEATURES

#### 3.7 ID-Based Search

**Description:** Search clients by ID, name, email, phone, RFID tag

**Test Steps:**

1. Go to Clients page
2. Use search bar at top
3. Try searching by:
   - Client ID (e.g., "1")
   - Name (e.g., "JOHN")
   - Email (e.g., "john@example.com")
   - Phone (e.g., "0912")
   - RFID tag (e.g., "RFID001")
4. **Expected:** Results filter in real-time

**Test Cases:**

- ✅ Search by ID → Returns exact match
- ✅ Search by name → Returns partial matches
- ✅ Search by email → Returns matching clients
- ✅ Search by phone → Returns matching clients
- ✅ Search by RFID → Returns matching clients
- ✅ Clear search → Shows all clients
- ✅ No results → Shows "No clients found matching your search"

---

#### 3.8 Name Normalization (ALL CAPS)

**Description:** All names automatically converted to uppercase

**Test Steps:**

1. Create or edit a client
2. Enter name in lowercase or mixed case (e.g., "john doe")
3. Save
4. **Expected:** Name stored and displayed as "JOHN DOE"

**Test Cases:**

- ✅ Create with lowercase → Saved as ALL CAPS
- ✅ Create with mixed case → Saved as ALL CAPS
- ✅ Edit name → Updated to ALL CAPS
- ✅ Existing data → Should be migrated (run migration script if needed)

---

## 4. Products Management

### ✅ EXISTING FEATURES

#### 4.1 View All Products

**Description:** Display all products in grid view

**Test Steps:**

1. Go to "Products" page (`/products`)
2. **Expected:** Grid of product cards showing:
   - Product image
   - Product name
   - Category
   - Price
   - Stock quantity
   - Description
   - Edit/Delete buttons

**Test Cases:**

- ✅ Products load → Grid populated
- ✅ Empty state → Shows "No products found"
- ✅ Inactive products → Shows "INACTIVE" badge

---

#### 4.2 Create Product

**Description:** Add a new product to inventory

**Test Steps:**

1. Go to Products page
2. Click "Add Product"
3. Fill in form:
   - Product Name (required)
   - Category (Supplements/Equipment/Apparel/Other)
   - Price (required, numeric)
   - Stock Quantity (required, integer)
   - Description (optional)
   - Product Image (file upload or URL)
   - Active status (checkbox)
4. Click "Create Product"
5. **Expected:** Product created, appears in grid

**Test Cases:**

- ✅ Valid data → Product created
- ✅ Missing required fields → Validation error
- ✅ Invalid price → Error message
- ✅ Image upload → Image saved and displayed
- ✅ External image URL → Image loaded from URL
- ✅ No image → Placeholder shown

---

#### 4.3 Edit Product

**Description:** Update product information

**Test Steps:**

1. Go to Products page
2. Click "Edit" on any product
3. Modify fields
4. Click "Update Product"
5. **Expected:** Product updated

**Test Cases:**

- ✅ Update name → Changes reflected
- ✅ Update price → Changes reflected
- ✅ Update stock → Changes reflected
- ✅ Update image → New image replaces old
- ✅ Change active status → Product shows/hides accordingly

---

#### 4.4 Delete Product

**Description:** Remove product from inventory

**Test Steps:**

1. Go to Products page
2. Click "Delete" on a product
3. Confirm deletion
4. **Expected:** Product deleted (if no transactions)

**Test Cases:**

- ✅ Product with no transactions → Deleted successfully
- ✅ Product with transactions → Error: "Cannot delete product with associated transactions"
- ✅ Image file deleted → Image file removed from server

---

### ✅ NEW FEATURES

#### 4.5 ID-Based Search

**Description:** Search products by ID, name, description, category

**Test Steps:**

1. Go to Products page
2. Use search bar
3. Try searching by:
   - Product ID (e.g., "1")
   - Name (e.g., "Protein")
   - Description keywords
   - Category (e.g., "supplements")
4. **Expected:** Results filter in real-time

**Test Cases:**

- ✅ Search by ID → Returns exact match
- ✅ Search by name → Returns partial matches
- ✅ Search by category → Returns all products in category
- ✅ Clear search → Shows all products

---

## 5. Transactions Management

### ✅ EXISTING FEATURES

#### 5.1 View All Transactions

**Description:** Display all transactions in table

**Test Steps:**

1. Go to "Transactions" page (`/transactions`)
2. **Expected:** Table showing:
   - Transaction ID
   - User/Client name and email
   - Transaction type (Membership/Product)
   - Details (membership type or product name)
   - Amount
   - Date
   - Status (Pending/Paid/Refunded/Cancelled)
   - Payment mode
   - Actions (Edit, Receipt, Delete)

**Test Cases:**

- ✅ Transactions load → Table populated
- ✅ Empty state → Shows "No transactions found"
- ✅ Transaction details → All information visible

---

#### 5.2 Create Transaction (Membership)

**Description:** Record a new membership purchase

**Test Steps:**

1. Go to Transactions page
2. Click "Add Transaction"
3. Select:
   - User/Client (required)
   - Transaction Type: "Membership"
   - Membership Type: Student/Regular/Regular with Coach
   - Quantity (default: 1)
   - Payment Mode: Cash (default)
   - Date (required)
   - Notes (optional)
4. Click "Create Transaction"
5. **Expected:**
   - Transaction created
   - User's membership updated
   - Membership record created

**Test Cases:**

- ✅ Valid data → Transaction created
- ✅ User membership updated → Membership dates set correctly
- ✅ Membership fee calculated → Correct amount based on type
- ✅ Missing user → Validation error

---

#### 5.3 Create Transaction (Product Purchase)

**Description:** Record a product sale

**Test Steps:**

1. Go to Transactions page
2. Click "Add Transaction"
3. Select:
   - User/Client (required)
   - Transaction Type: "Product"
   - Product (required)
   - Quantity (required, min: 1)
   - Payment Mode: Cash
   - Date (required)
   - Notes (optional)
4. Click "Create Transaction"
5. **Expected:**
   - Transaction created
   - Product stock decreased
   - Total amount calculated (price × quantity)

**Test Cases:**

- ✅ Valid data → Transaction created
- ✅ Stock updated → Product stock decreases
- ✅ Amount calculated → Price × quantity
- ✅ Insufficient stock → Should prevent (if validation added)

---

#### 5.4 Edit Transaction

**Description:** Update transaction details

**Test Steps:**

1. Go to Transactions page
2. Click "Edit" on any transaction
3. Modify fields
4. Click "Update Transaction"
5. **Expected:** Transaction updated

**Test Cases:**

- ✅ Update user → Changes reflected
- ✅ Update quantity → Amount recalculated
- ✅ Update date → Date changed
- ✅ Update notes → Notes saved

---

#### 5.5 Delete Transaction

**Description:** Remove transaction from system

**Test Steps:**

1. Go to Transactions page
2. Click "Delete" on a transaction
3. Confirm deletion
4. **Expected:**
   - Transaction deleted
   - If membership: User membership reverted
   - If product: Stock restored

**Test Cases:**

- ✅ Delete membership transaction → User membership removed
- ✅ Delete product transaction → Product stock restored
- ✅ Cancel deletion → Transaction remains

---

#### 5.6 View Digital Receipt

**Description:** Display transaction receipt

**Test Steps:**

1. Go to Transactions page
2. Click "Receipt" button on any transaction
3. **Expected:** Modal opens showing formatted receipt with:
   - Receipt number
   - Client information
   - Transaction details
   - Total amount
   - Notes

**Test Cases:**

- ✅ Receipt opens → All information displayed
- ✅ Receipt format → Professional layout
- ✅ Close receipt → Modal closes

---

#### 5.7 Filter Transactions

**Description:** Filter by type and status

**Test Steps:**

1. Go to Transactions page
2. Use filter dropdowns:
   - Type: All/Membership/Product
   - Status: All/Pending/Paid/Refunded/Cancelled
3. **Expected:** Table updates to show filtered results

**Test Cases:**

- ✅ Filter by type → Only matching transactions shown
- ✅ Filter by status → Only matching transactions shown
- ✅ Clear filters → All transactions shown

---

### ✅ NEW FEATURES

#### 5.8 ID-Based Search

**Description:** Search transactions by ID, user name, email, product name

**Test Steps:**

1. Go to Transactions page
2. Use search bar
3. Try searching by:
   - Transaction ID (e.g., "1")
   - User name (e.g., "JOHN")
   - User email (e.g., "john@example.com")
   - Product name (e.g., "Protein")
4. **Expected:** Results filter in real-time

**Test Cases:**

- ✅ Search by ID → Returns exact match
- ✅ Search by user name → Returns user's transactions
- ✅ Search by email → Returns user's transactions
- ✅ Search by product → Returns product transactions

---

## 6. Tracking System

### ✅ EXISTING FEATURES

#### 6.1 View Tracking/Attendance

**Description:** Track gym attendance

**Test Steps:**

1. Go to "Tracking" page (`/tracking`)
2. **Expected:** Attendance tracking interface

**Test Cases:**

- ✅ Page loads → Tracking interface visible
- ✅ Record attendance → Attendance logged
- ✅ View attendance history → History displayed

---

## 7. UI/UX Features

### ✅ NEW FEATURES

#### 7.1 Dark/Light Mode Toggle

**Description:** Switch between dark and light themes

**Test Steps:**

1. Login to system
2. Look for theme toggle button (☀️/🌙) in top-right corner
3. Click to toggle
4. **Expected:**
   - Theme changes immediately
   - Preference saved in localStorage
   - All pages reflect theme

**Test Cases:**

- ✅ Toggle to dark → Dark theme applied
- ✅ Toggle to light → Light theme applied
- ✅ Preference persists → Theme remembered on refresh
- ✅ All pages themed → Consistent across all pages

---

#### 7.2 Enlarged Font Sizes

**Description:** Increased font sizes for better readability

**Test Steps:**

1. Navigate through all pages
2. **Expected:**
   - Base font size: 16px (increased from default)
   - Table fonts: 15px
   - Headings: Larger sizes
   - Input fields: 16px
   - Buttons: 16px

**Test Cases:**

- ✅ Text readable → All text clearly visible
- ✅ Tables readable → Table text larger
- ✅ Forms readable → Input text larger
- ✅ No layout breakage → Everything still fits

---

#### 7.3 Neutral Background Colors

**Description:** Replaced yellow background with neutral colors

**Test Steps:**

1. View any page
2. **Expected:**
   - Light mode: White/Gray backgrounds
   - Dark mode: Dark gray/Black backgrounds
   - No yellow background

**Test Cases:**

- ✅ Light mode → White/Gray backgrounds
- ✅ Dark mode → Dark backgrounds
- ✅ No yellow → Yellow background removed

---

## 8. Revenue Reports (Backend Ready)

### ✅ NEW FEATURES (Backend Complete, Frontend Pending)

#### 8.1 Revenue Reports API

**Description:** Get revenue data for different time periods

**API Endpoint:** `GET /api/revenue-reports`

**Parameters:**

- `period`: daily, weekly, monthly, annual
- `start_date`: Optional start date
- `end_date`: Optional end date

**Test via API:**

```bash
# Daily reports (last 30 days)
curl -X GET "http://localhost:8000/api/revenue-reports?period=daily" \
  -H "X-User-Email: admin@rnlgym.com"

# Weekly reports (last 12 weeks)
curl -X GET "http://localhost:8000/api/revenue-reports?period=weekly" \
  -H "X-User-Email: admin@rnlgym.com"

# Monthly reports (last 12 months)
curl -X GET "http://localhost:8000/api/revenue-reports?period=monthly" \
  -H "X-User-Email: admin@rnlgym.com"

# Annual reports (last 5 years)
curl -X GET "http://localhost:8000/api/revenue-reports?period=annual" \
  -H "X-User-Email: admin@rnlgym.com"
```

**Test Cases:**

- ✅ Main Admin access → Returns revenue data
- ✅ Non-main-admin access → Returns 403 Unauthorized
- ✅ Daily period → Returns last 30 days
- ✅ Weekly period → Returns last 12 weeks
- ✅ Monthly period → Returns last 12 months
- ✅ Annual period → Returns last 5 years

**Note:** Frontend page for this feature is not yet created. Backend is ready.

---

## 9. Rewards System (Backend Ready)

### ✅ NEW FEATURES (Backend Complete, Frontend Pending)

#### 9.1 Rewards Database Tables

**Description:** Database structure for rewards system

**Tables Created:**

- `rewards` - Available rewards
- `user_rewards` - User reward eligibility and redemption
- `consecutive_months_tracking` - Track consecutive membership months

**Test via Database:**

```sql
-- Check rewards table
SELECT * FROM rewards;

-- Check user rewards
SELECT * FROM user_rewards;

-- Check consecutive months tracking
SELECT * FROM consecutive_months_tracking;
```

**Reward Rules:**

- 3 consecutive months enrollment → Free protein shake
- Counter resets if month is skipped

**Note:** Frontend UI and automatic tracking logic not yet implemented. Database structure is ready.

---

## 📝 Testing Checklist

### Authentication & Access

- [ ] Login with Main Admin credentials
- [ ] Login with Admin credentials (create first)
- [ ] Login with Staff credentials (create first)
- [ ] Invalid login attempt
- [ ] Logout functionality
- [ ] Protected routes redirect to login

### Account Management

- [ ] First-time setup (create first admin)
- [ ] Main Admin creates Admin account
- [ ] Main Admin creates Staff account
- [ ] Admin creates Staff account
- [ ] Admin tries to create Admin (should fail)
- [ ] Staff tries to access registration (should fail)

### Dashboard

- [ ] View dashboard metrics
- [ ] Navigate between months
- [ ] Main Admin sees full revenue
- [ ] Non-main-admin sees restricted revenue
- [ ] View revenue charts (Main Admin only)
- [ ] View low stock alerts
- [ ] View recent attendance

### Users/Clients

- [ ] View all clients
- [ ] Create new client
- [ ] Edit client
- [ ] Delete client (with/without transactions)
- [ ] Update client status
- [ ] Search by ID
- [ ] Search by name
- [ ] Search by email
- [ ] Name normalization (ALL CAPS)

### Products

- [ ] View all products
- [ ] Create product
- [ ] Edit product
- [ ] Delete product (with/without transactions)
- [ ] Upload product image
- [ ] Use external image URL
- [ ] Search by ID
- [ ] Search by name/category

### Transactions

- [ ] View all transactions
- [ ] Create membership transaction
- [ ] Create product transaction
- [ ] Edit transaction
- [ ] Delete transaction
- [ ] View digital receipt
- [ ] Filter by type
- [ ] Filter by status
- [ ] Search by ID
- [ ] Search by user/product

### UI/UX

- [ ] Toggle dark mode
- [ ] Toggle light mode
- [ ] Theme persists on refresh
- [ ] Font sizes are readable
- [ ] No layout breakage
- [ ] Neutral background colors

### Revenue Reports (API Testing)

- [ ] Get daily reports (Main Admin)
- [ ] Get weekly reports (Main Admin)
- [ ] Get monthly reports (Main Admin)
- [ ] Get annual reports (Main Admin)
- [ ] Non-main-admin access denied

---

## 🚀 Quick Test Scenarios

### Scenario 1: Complete User Journey

1. First-time setup → Create Main Admin
2. Login as Main Admin
3. Create Admin account
4. Create Staff account
5. Create a client
6. Create a product
7. Create a transaction
8. View dashboard
9. Test search functionality
10. Toggle theme

### Scenario 2: Role-Based Access

1. Login as Main Admin → Verify full access
2. Login as Admin → Verify limited access
3. Login as Staff → Verify restricted access
4. Test revenue visibility for each role

### Scenario 3: Search & Filter

1. Search clients by ID
2. Search products by ID
3. Search transactions by ID
4. Filter transactions by type/status
5. Verify all searches work correctly

### Scenario 4: Data Normalization

1. Create client with lowercase name → Verify ALL CAPS
2. Edit client name → Verify ALL CAPS
3. Create admin account → Verify name in ALL CAPS

---

## 🔧 Setup Instructions

### Prerequisites

1. Run migrations:

   ```bash
   cd server
   php artisan migrate
   ```

2. Seed initial admin (optional):

   ```bash
   php artisan db:seed --class=AdminSeeder
   ```

3. Start backend:

   ```bash
   cd server
   php artisan serve
   ```

4. Start frontend:
   ```bash
   cd client
   npm run dev
   ```

### Default Credentials

- **Email:** `admin@rnlgym.com`
- **Password:** `admin123`
- **Role:** Main Admin

---

## 📌 Notes

1. **Name Normalization:** All names are automatically converted to ALL CAPS when saved
2. **Role Permissions:** Revenue data is only visible to Main Admin
3. **Search:** All search bars support ID-based searching
4. **Theme:** Preference is saved in localStorage
5. **Revenue Reports:** Backend ready, frontend page pending
6. **Rewards System:** Database ready, tracking logic pending

---

## 🐛 Known Issues / Pending Features

1. **Revenue Reports UI:** Backend API ready, frontend page needs to be created
2. **Rewards System Logic:** Database tables exist, but automatic tracking and UI need implementation
3. **Password Change:** Not yet implemented
4. **User Profile:** Not yet implemented

---

This guide covers all existing and new functionality in the system. Use it to systematically test each feature.
