# RNL Gym Management System - Complete System Documentation

## 📚 Table of Contents

1. [System Introduction](#system-introduction)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Database Schema](#database-schema)
5. [Feature Documentation](#feature-documentation)
6. [API Documentation](#api-documentation)
7. [RFID System Details](#rfid-system-details)
8. [Security Implementation](#security-implementation)
9. [Deployment Guide](#deployment-guide)

---

## System Introduction

### Purpose

The RNL Gym Management System is a comprehensive web-based application designed to manage all aspects of gym operations, including member management, transactions, inventory, access control, and reporting.

**Payment System:** This is a **cash-only system**. All transactions are processed and recorded as cash payments. No digital payment methods (GCash, credit cards, online payments) are supported.

### Target Users

- **Gym Owners/Managers** (Main Admin)
- **Gym Staff** (Admin, Staff roles)
- **Members** (indirect users through RFID system)

### Core Objectives

1. Automate gym operations
2. Track member access via RFID
3. Manage inventory and sales
4. Generate business reports
5. Provide role-based access control

---

## Technology Stack

### Frontend Technologies

#### React 19.1.1

- **Purpose:** User interface framework
- **Why:** Component-based architecture, fast rendering, large ecosystem
- **Key Features Used:**
  - Functional components with hooks
  - Context API for state management
  - React Router for navigation
  - Custom hooks for reusable logic

#### TypeScript 5.8.3

- **Purpose:** Type-safe JavaScript
- **Why:** Catches errors at compile time, improves code quality
- **Benefits:**
  - Type checking
  - Better IDE support
  - Self-documenting code
  - Refactoring safety

#### Vite 7.1.0

- **Purpose:** Build tool and development server
- **Why:** Fast hot module replacement, quick builds
- **Features:**
  - Instant server start
  - Fast HMR (Hot Module Replacement)
  - Optimized production builds

#### React Router DOM 7.1.1

- **Purpose:** Client-side routing
- **Routes:**
  - `/` - Dashboard
  - `/login` - Authentication
  - `/register` - Account creation
  - `/transactions` - Transaction management
  - `/products` - Inventory management
  - `/users` or `/clients` - Customer management
  - `/tracking` - Access logs
  - `/reports` - Business reports

### Backend Technologies

#### Laravel 12.0

- **Purpose:** PHP web framework
- **Why:** Robust, secure, feature-rich
- **Key Features Used:**
  - Eloquent ORM
  - Route model binding
  - Validation
  - Middleware
  - Migrations

#### PHP 8.2

- **Purpose:** Server-side scripting
- **Why:** Widely supported, Laravel framework
- **Features:**
  - Object-oriented programming
  - Type declarations
  - Error handling

#### SQLite

- **Purpose:** Database
- **Why:** Lightweight, no server needed, perfect for development
- **Note:** Can be migrated to MySQL/PostgreSQL for production

---

## System Architecture

### Architecture Pattern: RESTful API

```
┌─────────────────────────────────────┐
│         React Frontend              │
│  (TypeScript, React, Vite)          │
│                                     │
│  - Components                       │
│  - Pages                            │
│  - Context (State Management)      │
│  - Hooks                            │
└──────────────┬──────────────────────┘
               │
               │ HTTP Requests
               │ (REST API)
               │
┌──────────────▼──────────────────────┐
│      Laravel Backend                │
│  (PHP, Laravel Framework)           │
│                                     │
│  - Routes (api.php)                 │
│  - Controllers                      │
│  - Models (Eloquent)                │
│  - Validation                       │
└──────────────┬──────────────────────┘
               │
               │ Database Queries
               │
┌──────────────▼──────────────────────┐
│         SQLite Database             │
│                                     │
│  - Tables                           │
│  - Relationships                    │
│  - Migrations                       │
└─────────────────────────────────────┘
```

### Data Flow

1. **User Action** → React Component
2. **Component** → API Request (fetch)
3. **Laravel Route** → Validation
4. **Controller Logic** → Database Query
5. **Database** → Response Data
6. **Laravel** → JSON Response
7. **React** → Update UI

### Component Structure

```
client/src/
├── pages/
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Transactions.tsx
│   ├── Products.tsx
│   ├── Users.tsx
│   ├── Tracking.tsx
│   └── Reports.tsx
├── components/
│   ├── Layout.tsx
│   ├── Modal.tsx
│   ├── SearchableSelect.tsx
│   ├── GlobalRFIDScanner.tsx
│   └── ConfirmationModal.tsx
└── contexts/
    ├── ThemeContext.tsx
    ├── AuthContext.tsx
    └── NotificationContext.tsx
```

---

## Database Schema

### Core Tables

#### users

- `id` - Primary key
- `name` - Customer name (uppercase)
- `email` - Unique email address
- `phone` - Phone number
- `rfid_tag` - Unique RFID identifier
- `status` - active/inactive/expired
- `role` - main_admin/staff/null (for customers)
- `membership_type` - Type of membership
- `membership_fee` - Membership cost
- `membership_start_date` - Start date
- `membership_end_date` - End date
- `notes` - Additional notes
- `created_at`, `updated_at`, `deleted_at`

#### transactions

- `id` - Primary key
- `user_id` - Foreign key to users
- `transaction_type` - membership/product
- `membership_id` - Foreign key (if membership)
- `product_id` - Foreign key (if product)
- `quantity` - Quantity purchased
- `unit_price` - Price per unit
- `total_amount` - Total transaction amount
- `status` - paid/pending/cancelled
- `payment_mode` - cash (cash-only system)
- `transaction_date` - Date of transaction
- `notes` - Transaction notes
- `created_at`, `updated_at`, `deleted_at`

#### products

- `id` - Primary key
- `name` - Product name
- `description` - Product description
- `category` - Product category
- `price` - Product price
- `stock` - Current stock level
- `image_url` - Product image
- `is_active` - Active status
- `created_at`, `updated_at`, `deleted_at`

#### memberships

- `id` - Primary key
- `user_id` - Foreign key to users
- `type` - Membership type
- `amount` - Membership cost
- `start_date` - Start date
- `end_date` - End date
- `status` - active/expired
- `notes` - Membership notes
- `created_at`, `updated_at`, `deleted_at`

#### tracking_entries

- `id` - Primary key
- `user_id` - Foreign key to users
- `user_name` - Customer name (denormalized)
- `rfid_tag` - Scanned RFID tag
- `timestamp` - When scan occurred
- `status` - granted/denied
- `reason` - Why access was granted/denied
- `created_at`, `updated_at`

### Relationships

- **User → Transactions:** One-to-Many
- **User → Memberships:** One-to-Many
- **User → Tracking Entries:** One-to-Many
- **Product → Transactions:** One-to-Many
- **Membership → Transactions:** One-to-Many

---

## Feature Documentation

### 1. Authentication System

#### Login

- **Route:** POST `/api/login`
- **Validation:** Email and password required
- **Response:** User data and session token
- **Features:**
  - Role-based access
  - Session management
  - Error handling

#### Registration

- **Route:** POST `/api/register` or `/api/setup`
- **Setup Mode:** Creates first admin if no admins exist
- **Normal Mode:** Requires Main Admin authentication
- **Validation:** Email uniqueness, password strength

#### Logout

- **Route:** POST `/api/logout`
- **Action:** Clears session

### 2. Dashboard

#### Metrics

- Total Users
- Active Members
- Monthly Revenue (role-based)
- New Signups

#### Charts

- Weekly Revenue (Main Admin only)
- Revenue by Category (Main Admin only)

#### Alerts

- Low Stock Products
- Recent Attendance

#### Month Navigation

- Previous/Next month
- Current month default

### 3. Customer Management

#### Create Customer

- **Fields:** Name, Email, Phone, Age, Address, RFID Tag, Status, Notes
- **Validation:** Email format, unique email, unique RFID
- **Auto-generation:** RFID tag if not provided

#### Edit Customer

- Update any field
- Preserve transaction history
- Update membership info

#### Delete Customer

- Soft delete (preserves data)
- Can restore from trash
- Maintains transaction history

#### Search

- By ID, name, email, phone, RFID tag
- Real-time filtering

### 4. Product Management

#### Create Product

- **Fields:** Name, Description, Category, Price, Stock, Image
- **Validation:** Price > 0, Stock >= 0

#### Edit Product

- Update any field
- Stock adjustments

#### Delete Product

- Soft delete
- Preserves transaction history
- Can restore

#### CSV Import

- Bulk product creation/update
- Stock updates
- Error reporting

### 5. Transaction Management

#### Create Transaction

- **Types:** Membership or Product
- **Fields:** Customer, Type, Item, Quantity, Status
- **Note:** System is cash-only - all transactions are cash payments
- **Auto-calculations:** Total amount
- **Stock Updates:** Automatic for products
- **Membership Updates:** Automatic for memberships

#### Edit Transaction

- Update transaction details
- Adjust stock if product transaction
- Update membership if membership transaction

#### Delete Transaction

- Restore stock if product
- Update membership if membership
- Soft delete

#### Filters

- By type (membership/product)
- By status (paid/pending/cancelled)
- By date range
- By customer

### 6. Access Tracking

#### RFID Scanning

- Global scanner (works from any page)
- Automatic card ID capture
- Real-time validation
- Access grant/deny logic

#### Manual Entry

- Select customer from dropdown
- Record entry manually
- Same logging as RFID

#### Access Logs

- View all access attempts
- Search and filter
- Delete entries (Main Admin only)

### 7. Reports

#### Business Reports (Main Admin Only)

- Executive Summary
- Revenue Breakdown
- Membership Performance
- Product Sales
- Customer Metrics
- Top Products

#### Revenue Reports

- Daily, Weekly, Monthly, Annual
- Date range filtering
- Export capabilities

---

## API Documentation

### Authentication Endpoints

#### POST `/api/login`

- **Body:** `{ email, password }`
- **Response:** `{ user, token }`
- **Errors:** Invalid credentials

#### POST `/api/register`

- **Auth:** Main Admin required
- **Body:** `{ name, email, password, role }`
- **Response:** `{ user }`
- **Errors:** Email exists, unauthorized

#### POST `/api/setup`

- **Auth:** None (only if no admins exist)
- **Body:** `{ name, email, password, role }`
- **Response:** `{ user }`

### User Endpoints

#### GET `/api/users`

- **Query:** `?search=term`
- **Response:** `{ data: [users] }`
- **Auth:** Required

#### POST `/api/users`

- **Body:** User data
- **Response:** `{ user }`
- **Auth:** Required

#### PUT `/api/users/{id}`

- **Body:** User data
- **Response:** `{ user }`
- **Auth:** Required

#### DELETE `/api/users/{id}`

- **Response:** `{ message }`
- **Auth:** Required

#### POST `/api/users/{id}/assign-rfid`

- **Body:** `{ rfid_tag }`
- **Response:** `{ message }`
- **Auth:** Required

### Transaction Endpoints

#### GET `/api/transactions`

- **Query:** `?type=membership&status=paid&search=term`
- **Response:** `{ data: [transactions] }`
- **Auth:** Required

#### POST `/api/transactions`

- **Body:** Transaction data
- **Response:** `{ transaction }`
- **Auth:** Required

#### PUT `/api/transactions/{id}`

- **Body:** Transaction data
- **Response:** `{ transaction }`
- **Auth:** Required

#### DELETE `/api/transactions/{id}`

- **Response:** `{ message }`
- **Auth:** Required

### Product Endpoints

#### GET `/api/products`

- **Query:** `?search=term`
- **Response:** `{ data: [products] }`
- **Auth:** Required

#### POST `/api/products`

- **Body:** Product data
- **Response:** `{ product }`
- **Auth:** Required

#### PUT `/api/products/{id}`

- **Body:** Product data
- **Response:** `{ product }`
- **Auth:** Required

#### DELETE `/api/products/{id}`

- **Response:** `{ message }`
- **Auth:** Required

### Tracking Endpoints

#### POST `/api/rfid/scan`

- **Body:** `{ rfid_tag }`
- **Response:** `{ data: { status, message } }`
- **Auth:** Required

#### GET `/api/tracking`

- **Query:** `?search=term&status=granted&limit=100`
- **Response:** `{ data: [entries], total }`
- **Auth:** Required

#### DELETE `/api/tracking/{id}`

- **Response:** `{ message }`
- **Auth:** Main Admin only

#### DELETE `/api/tracking/clear`

- **Response:** `{ message }`
- **Auth:** Main Admin only

### Metrics Endpoints

#### GET `/api/metrics`

- **Query:** `?year=2025&month=1`
- **Response:** `{ metrics, charts }`
- **Auth:** Required

#### GET `/api/business-reports`

- **Query:** `?year=2025&month=1`
- **Response:** `{ reports }`
- **Auth:** Main Admin only

---

## RFID System Details

### Hardware Specifications

**RFID Reader:**

- Model: 13.56MHz USB RFID Contactless IC S50 S70 Card Reader
- Interface: USB (Keyboard Wedge)
- Frequency: 13.56MHz
- Range: 2-5cm
- Power: USB powered
- Drivers: None required (HID device)

**RFID Cards:**

- Type: 13.56MHz contactless cards
- Format: Hexadecimal IDs (8-16 characters)
- Compatibility: ISO 14443 Type A

### Software Implementation

#### Frontend: GlobalRFIDScanner Component

**Location:** `client/src/components/GlobalRFIDScanner.tsx`

**How it works:**

1. Hidden input field maintains focus
2. Captures keyboard input (from RFID reader)
3. Debounces input (500ms delay)
4. Sends POST request to `/api/rfid/scan`
5. Shows success/error notification
6. Triggers dashboard refresh

**Key Features:**

- Global (works from any page)
- Non-intrusive (doesn't interfere with typing)
- Automatic focus management
- Debouncing prevents duplicates

#### Backend: RFID Scan Endpoint

**Location:** `server/routes/api.php` - `/api/rfid/scan`

**Process:**

1. Receives RFID tag
2. Queries database for customer
3. Validates customer status
4. Checks membership validity
5. Creates tracking entry
6. Returns grant/deny decision

**Validation Logic:**

```php
if (!rfid_assigned) → Deny
if (account_inactive) → Deny
if (no_membership) → Deny
if (membership_expired) → Deny
else → Grant
```

### Access Control Flow

```
RFID Card Scan
    ↓
Card ID Captured
    ↓
POST /api/rfid/scan
    ↓
Database Lookup (users.rfid_tag)
    ↓
Customer Found?
    ├─ No → Deny: "RFID tag not assigned"
    └─ Yes → Continue
        ↓
Account Active?
    ├─ No → Deny: "Account inactive"
    └─ Yes → Continue
        ↓
Has Membership?
    ├─ No → Deny: "No active membership"
    └─ Yes → Continue
        ↓
Membership Valid?
    ├─ Expired → Deny: "Membership expired"
    └─ Valid → Grant: "Access granted"
        ↓
Create Tracking Entry
    ↓
Return Response
```

### Database Tracking

**tracking_entries table:**

- Records every scan attempt
- Stores: user_id, user_name, rfid_tag, timestamp, status, reason
- Enables access history and analytics

**Benefits:**

- Complete audit trail
- Attendance tracking
- Security monitoring
- Analytics data

---

## Security Implementation

### Authentication & Authorization

**Role-Based Access Control (RBAC):**

- Main Admin: Full access
- Admin: Limited access (can't create admins)
- Staff: Basic access (no financial data)

**Session Management:**

- Token-based sessions
- Secure password hashing (bcrypt)
- Session timeout

### Input Validation

**Frontend:**

- Email format validation (strict regex)
- Phone number validation
- Required field checks
- Type checking (TypeScript)

**Backend:**

- Laravel validation rules
- SQL injection prevention (Eloquent ORM)
- XSS protection
- CSRF tokens

### Data Protection

**Soft Deletes:**

- Data recovery capability
- Audit trail preservation
- Transaction history maintained

**Unique Constraints:**

- Email addresses
- RFID tags
- Prevents data duplication

---

## Deployment Guide

### Development Setup

1. **Clone Repository**
2. **Backend Setup:**

   ```bash
   cd server
   composer install
   cp .env.example .env
   php artisan key:generate
   php artisan migrate
   php artisan db:seed
   php artisan serve
   ```

3. **Frontend Setup:**
   ```bash
   cd client
   npm install
   npm run dev
   ```

### Production Deployment

**Requirements:**

- PHP 8.2+
- Composer
- Node.js 18+
- Web server (Apache/Nginx)
- Database (SQLite/MySQL/PostgreSQL)

**Steps:**

1. Configure `.env` file
2. Run migrations
3. Build frontend: `npm run build`
4. Configure web server
5. Set up SSL certificate
6. Configure firewall

---

## System Statistics

- **Total Features:** 50+
- **API Endpoints:** 30+
- **Database Tables:** 8+
- **React Components:** 20+
- **User Roles:** 3
- **Transaction Types:** 2
- **Payment System:** Cash-only

---

**This documentation provides a comprehensive overview of the RNL Gym Management System. Use it as a reference for understanding the system architecture, features, and implementation details.**
