# RNL Setup - Real Data Application

This is a React + Laravel application that has been updated to use **real data exclusively** instead of demo/mock data.

## What Changed

### ❌ Removed Demo Data
- **Frontend**: All hardcoded mock data fallbacks have been removed
- **Backend**: API routes no longer fall back to demo data
- **Offline Banners**: "API is offline — showing demo data" messages removed

### ✅ Real Data Implementation
- **Database**: Uses SQLite with proper migrations and seeders
- **Error Handling**: Proper error states instead of fallback data
- **Loading States**: Clear loading indicators while fetching data
- **Retry Functionality**: Users can retry failed API calls

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Dashboard, Transactions, Products
│   │   └── components/    # Layout, Status components
│   └── vite.config.ts     # Vite configuration
├── server/                 # Laravel backend
│   ├── app/Models/        # Transaction model
│   ├── database/          # Migrations and seeders
│   └── routes/api.php     # API endpoints
└── setup.sh               # Database setup script
```

## Quick Start

### 1. Setup Database
```bash
cd server
./setup.sh
```

This script will:
- Create `.env` file with SQLite configuration
- Generate Laravel application key
- Create SQLite database
- Run migrations to create tables
- Seed with real transaction data

### 2. Start Backend
```bash
cd server
php artisan serve
```

### 3. Start Frontend
```bash
cd client
npm install
npm run dev
```

## API Endpoints

- `GET /api/metrics` - Dashboard metrics (users, revenue, charts)
- `GET /api/transactions` - Transaction list
- `GET /api/products` - Product list (currently empty)

## Database Schema

### Transactions Table
- `id` - Primary key
- `user_name` - Customer name
- `plan` - Service/membership plan
- `amount` - Transaction amount
- `date` - Transaction date
- `status` - paid/pending/refunded
- `mode` - Payment method

## Real Data Features

### Dashboard
- **Total Users**: Count of unique users with transactions
- **Active Members**: Users with paid memberships
- **Monthly Revenue**: Sum of paid amounts this month
- **New Signups**: New active members this month
- **Charts**: Revenue trends and category breakdowns

### Transactions
- Real transaction data from database
- No fallback to mock data
- Proper error handling for API failures

### Products
- Currently shows empty state (no products table)
- Ready for future product management features

## Error Handling

The application now properly handles:
- **API Failures**: Shows error messages instead of demo data
- **Loading States**: Clear indicators while fetching data
- **Retry Options**: Users can retry failed requests
- **Database Errors**: Proper HTTP status codes and messages

## Development Notes

- **No More Demo Data**: All components require real API responses
- **Database Required**: Application won't work without proper database setup
- **Error States**: Graceful degradation when services are unavailable
- **Real Metrics**: All calculations based on actual transaction data

## Troubleshooting

### "Database not configured" Error
Run the setup script: `./setup.sh`

### "Failed to load data" Error
Check that the Laravel server is running: `php artisan serve`

### Empty Dashboard
Ensure the database is seeded: `php artisan db:seed`

## Future Enhancements

- Product management system
- User authentication
- Real-time updates
- Advanced analytics
- Export functionality
