<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Product;
use App\Models\Membership;
use App\Models\TrackingEntry;

// Authentication endpoints
Route::post('/login', function () {
    try {
        $data = request()->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user || !$user->password || !Hash::check($data['password'], $user->password)) {
            return response()->json([
                'error' => 'Invalid credentials',
                'message' => 'Email or password is incorrect'
            ], 401);
        }

        if (!$user->role) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'This account does not have system access'
            ], 403);
        }

        return response()->json([
            'message' => 'Login successful',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'token' => 'session_token_' . $user->id . '_' . time(), // Simple token for now
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Login failed',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Special setup endpoint - only works if no admins exist
Route::post('/setup', function () {
    try {
        // Check if any admin accounts exist (only check non-null roles)
        $adminExists = User::whereNotNull('role')
            ->whereIn('role', ['main_admin', 'staff'])
            ->exists();

        if ($adminExists) {
            return response()->json([
                'error' => 'Setup already completed',
                'message' => 'Admin accounts already exist. Use /register endpoint instead.'
            ], 403);
        }

        $data = request()->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|in:main_admin,staff',
        ]);

        // Normalize name to uppercase
        $data['name'] = strtoupper($data['name']);
        $data['password'] = Hash::make($data['password']);

        $user = User::create($data);

        return response()->json([
            'message' => 'First admin account created successfully',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ]
        ], 201);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Setup failed',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Register new admin/staff account (only for authorized roles)
Route::post('/register', function () {
    try {
        // Check if user is authenticated (in real app, use proper auth middleware)
        $currentUserEmail = request()->header('X-User-Email');
        $currentUser = $currentUserEmail ? User::where('email', $currentUserEmail)->first() : null;

        if (!$currentUser || $currentUser->role !== 'main_admin') {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Only Main Admin can create accounts'
            ], 403);
        }

        $data = request()->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|in:main_admin,staff',
        ]);

        // Normalize name to uppercase
        $data['name'] = strtoupper($data['name']);
        $data['password'] = Hash::make($data['password']);

        $user = User::create($data);

        return response()->json([
            'message' => 'Account created successfully',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ]
        ], 201);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Registration failed',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Get current user info
Route::get('/me', function () {
    try {
        $userEmail = request()->header('X-User-Email');
        if (!$userEmail) {
            return response()->json(['error' => 'Not authenticated'], 401);
        }

        $user = User::where('email', $userEmail)->first();
        if (!$user || !$user->role) {
            return response()->json(['error' => 'User not found'], 404);
        }

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Failed to fetch user',
            'message' => $e->getMessage()
        ], 500);
    }
});

// Helper function to get current user
function getCurrentUser()
{
    $userEmail = request()->header('X-User-Email');
    return $userEmail ? User::where('email', $userEmail)->first() : null;
}

// Dashboard metrics endpoint
Route::get('/metrics', function () {
    try {
        $currentUser = getCurrentUser();
        $isMainAdmin = $currentUser && $currentUser->role === 'main_admin';

        // Get requested month/year or default to current month
        $requestedYear = request('year', Carbon::now()->year);
        $requestedMonth = request('month', Carbon::now()->month);

        $selectedDate = Carbon::createFromDate($requestedYear, $requestedMonth, 1);
        $transactions = Transaction::with(['user', 'membership', 'product'])
            ->whereMonth('transaction_date', $selectedDate->month)
            ->whereYear('transaction_date', $selectedDate->year)
            ->get();

        // Calculate metrics
        $totalUsers = User::count();
        // Count active members - handle null membership_end_date gracefully
        $activeMembers = User::whereNotNull('membership_end_date')
            ->where('membership_end_date', '>=', Carbon::now())
            ->count();
        $monthlyRevenue = $isMainAdmin ? $transactions->where('status', 'paid')->sum('total_amount') : null;
        $newSignups = User::whereMonth('membership_start_date', $selectedDate->month)
            ->whereYear('membership_start_date', $selectedDate->year)
            ->count();

        // Weekly revenue data (only for main admin)
        $weeklyRevenue = [];
        if ($isMainAdmin) {
            for ($i = 1; $i <= 5; $i++) {
                $weekStart = $selectedDate->copy()->addWeeks($i - 1)->startOfWeek();
                $weekEnd = $weekStart->copy()->endOfWeek();

                $weekRevenue = $transactions
                    ->where('status', 'paid')
                    ->where('transaction_date', '>=', $weekStart)
                    ->where('transaction_date', '<=', $weekEnd)
                    ->sum('total_amount');

                $weeklyRevenue[] = ['x' => "Week $i", 'y' => $weekRevenue];
            }
        }

        // Revenue by category (only for main admin)
        $categoryBreakdown = [];
        if ($isMainAdmin) {
            $membershipRevenue = $transactions
                ->where('transaction_type', 'membership')
                ->where('status', 'paid')
                ->sum('total_amount');

            $productRevenue = $transactions
                ->where('transaction_type', 'product')
                ->where('status', 'paid')
                ->sum('total_amount');

            $categoryBreakdown = [
                ['label' => 'Memberships', 'value' => $membershipRevenue],
                ['label' => 'Products', 'value' => $productRevenue]
            ];
        }

        // Top Seller (1 month range) - product or service with most revenue (visible to all users)
        $topSeller = null;
        $productGroups = $transactions
            ->where('transaction_type', 'product')
            ->where('status', 'paid')
            ->groupBy('product_id')
            ->map(function ($group) {
                return [
                    'id' => $group->first()->product_id,
                    'name' => $group->first()->product->name ?? 'Unknown Product',
                    'revenue' => $group->sum('total_amount'),
                    'type' => 'product'
                ];
            });

        $topProduct = $productGroups->count() > 0 ? $productGroups->sortByDesc('revenue')->first() : null;

        // Top membership type
        $membershipGroups = $transactions
            ->where('transaction_type', 'membership')
            ->where('status', 'paid')
            ->groupBy(function ($transaction) {
                return $transaction->membership->type ?? 'unknown';
            })
            ->map(function ($group) {
                return [
                    'name' => ucfirst(str_replace('_', ' ', $group->first()->membership->type ?? 'Unknown')),
                    'revenue' => $group->sum('total_amount'),
                    'type' => 'membership'
                ];
            });

        $topMembership = $membershipGroups->count() > 0 ? $membershipGroups->sortByDesc('revenue')->first() : null;

        // Compare and get top seller
        if ($topProduct && $topMembership) {
            $topSeller = $topProduct['revenue'] > $topMembership['revenue'] ? $topProduct : $topMembership;
        } elseif ($topProduct) {
            $topSeller = $topProduct;
        } elseif ($topMembership) {
            $topSeller = $topMembership;
        }

        return response()->json([
            'totalUsers' => $totalUsers,
            'activeMembers' => $activeMembers,
            'monthlyRevenue' => $monthlyRevenue,
            'newSignups' => $newSignups,
            'topSeller' => $topSeller,
            'charts' => [
                'line' => $weeklyRevenue,
                'pie' => $categoryBreakdown,
            ],
        ]);
    } catch (\Exception $e) {
        Log::error('Metrics endpoint error: ' . $e->getMessage());
        Log::error('Stack trace: ' . $e->getTraceAsString());
        return response()->json([
            'error' => 'Database error',
            'message' => $e->getMessage(),
            'details' => config('app.debug') ? $e->getTraceAsString() : null
        ], 500);
    }
});

// Comprehensive business reports endpoint (Main Admin only)
Route::get('/business-reports', function () {
    try {
        $currentUser = getCurrentUser();

        if (!$currentUser) {
            Log::warning('Business reports: User not found', [
                'email' => request()->header('X-User-Email')
            ]);
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'User not found. Please ensure you are logged in.'
            ], 403);
        }

        if ($currentUser->role !== 'main_admin') {
            Log::warning('Business reports: Insufficient permissions', [
                'email' => $currentUser->email,
                'role' => $currentUser->role
            ]);
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Only Main Admin can access business reports'
            ], 403);
        }

        $requestedYear = request('year', Carbon::now()->year);
        $requestedMonth = request('month', Carbon::now()->month);
        $selectedDate = Carbon::createFromDate($requestedYear, $requestedMonth, 1);
        $monthStart = $selectedDate->copy()->startOfMonth();
        $monthEnd = $selectedDate->copy()->endOfMonth();

        // Get all transactions for the month
        $transactions = Transaction::with(['user', 'membership', 'product'])
            ->whereYear('transaction_date', $selectedDate->year)
            ->whereMonth('transaction_date', $selectedDate->month)
            ->get();

        $paidTransactions = $transactions->where('status', 'paid');
        $pendingTransactions = $transactions->where('status', 'pending');
        $cancelledTransactions = $transactions->where('status', 'cancelled');

        // Revenue metrics
        $totalRevenue = $paidTransactions->sum('total_amount');
        $membershipRevenue = $paidTransactions->where('transaction_type', 'membership')->sum('total_amount');
        $productRevenue = $paidTransactions->where('transaction_type', 'product')->sum('total_amount');
        $walkInRevenue = $paidTransactions->filter(function ($t) {
            return $t->membership && $t->membership->type === 'walk_in';
        })->sum('total_amount');

        // Transaction counts
        $totalTransactions = $transactions->count();
        $paidCount = $paidTransactions->count();
        $pendingCount = $pendingTransactions->count();
        $cancelledCount = $cancelledTransactions->count();
        $membershipCount = $paidTransactions->where('transaction_type', 'membership')->count();
        $productCount = $paidTransactions->where('transaction_type', 'product')->count();

        // Average transaction value
        $avgTransactionValue = $paidCount > 0 ? $totalRevenue / $paidCount : 0;

        // Customer metrics
        $totalCustomers = User::count();
        $activeMembers = User::whereNotNull('membership_end_date')
            ->where('membership_end_date', '>=', Carbon::now())
            ->count();
        $newCustomers = User::whereMonth('membership_start_date', $selectedDate->month)
            ->whereYear('membership_start_date', $selectedDate->year)
            ->count();
        $expiredMembers = User::whereNotNull('membership_end_date')
            ->where('membership_end_date', '<', Carbon::now())
            ->count();

        // Top products
        $topProducts = [];
        $productTransactions = $paidTransactions->where('transaction_type', 'product');
        if ($productTransactions->count() > 0) {
            $topProducts = $productTransactions
                ->groupBy('product_id')
                ->map(function ($group) {
                    $firstTransaction = $group->first();
                    $product = $firstTransaction ? $firstTransaction->product : null;
                    return [
                        'id' => $product->id ?? null,
                        'name' => $product->name ?? 'Unknown Product',
                        'quantity' => $group->sum('quantity'),
                        'revenue' => (float)$group->sum('total_amount'),
                        'transactions' => $group->count(),
                    ];
                })
                ->sortByDesc('revenue')
                ->take(10)
                ->values()
                ->toArray();
        }

        // Top membership types
        $topMemberships = [];
        $membershipTransactions = $paidTransactions->where('transaction_type', 'membership');
        if ($membershipTransactions->count() > 0) {
            $topMemberships = $membershipTransactions
                ->groupBy(function ($transaction) {
                    return $transaction->membership->type ?? 'unknown';
                })
                ->map(function ($group) {
                    $firstTransaction = $group->first();
                    $membership = $firstTransaction ? $firstTransaction->membership : null;
                    return [
                        'type' => ucfirst(str_replace('_', ' ', $membership->type ?? 'Unknown')),
                        'count' => $group->count(),
                        'revenue' => (float)$group->sum('total_amount'),
                    ];
                })
                ->sortByDesc('revenue')
                ->values()
                ->toArray();
        }

        // Daily breakdown
        $dailyBreakdown = [];
        for ($day = 1; $day <= $monthStart->daysInMonth; $day++) {
            $date = $selectedDate->copy()->day($day);
            $dayTransactions = $paidTransactions->filter(function ($t) use ($date) {
                return Carbon::parse($t->transaction_date)->isSameDay($date);
            });
            if ($dayTransactions->count() > 0) {
                $dailyBreakdown[] = [
                    'date' => $date->format('Y-m-d'),
                    'label' => $date->format('M d, Y'),
                    'revenue' => $dayTransactions->sum('total_amount'),
                    'transactions' => $dayTransactions->count(),
                ];
            }
        }

        // Weekly breakdown
        $weeklyBreakdown = [];
        $firstWeekStart = $monthStart->copy()->startOfWeek();
        $lastWeekEnd = $monthEnd->copy()->endOfWeek();
        $currentWeek = $firstWeekStart->copy();
        $weekNumber = 1;
        while ($currentWeek <= $lastWeekEnd) {
            $weekStart = $currentWeek->copy();
            $weekEnd = $weekStart->copy()->endOfWeek();
            $weekTransactions = $paidTransactions->filter(function ($t) use ($weekStart, $weekEnd) {
                $tDate = Carbon::parse($t->transaction_date);
                return $tDate->between($weekStart, $weekEnd);
            });
            if ($weekTransactions->count() > 0) {
                $weeklyBreakdown[] = [
                    'week' => $weekNumber,
                    'start' => $weekStart->format('M d'),
                    'end' => $weekEnd->format('M d'),
                    'revenue' => $weekTransactions->sum('total_amount'),
                    'transactions' => $weekTransactions->count(),
                ];
            }
            $currentWeek->addWeek();
            $weekNumber++;
        }

        // Top seller
        $topSeller = null;
        $topProduct = !empty($topProducts) ? $topProducts[0] : null;
        $topMembership = !empty($topMemberships) ? $topMemberships[0] : null;
        if ($topProduct && $topMembership) {
            $topSeller = $topProduct['revenue'] > $topMembership['revenue']
                ? ['name' => $topProduct['name'], 'revenue' => $topProduct['revenue'], 'type' => 'product']
                : ['name' => $topMembership['type'], 'revenue' => $topMembership['revenue'], 'type' => 'membership'];
        } elseif ($topProduct) {
            $topSeller = ['name' => $topProduct['name'], 'revenue' => $topProduct['revenue'], 'type' => 'product'];
        } elseif ($topMembership) {
            $topSeller = ['name' => $topMembership['type'], 'revenue' => $topMembership['revenue'], 'type' => 'membership'];
        }

        // Always return data structure, even if values are zero
        return response()->json([
            'period' => [
                'year' => (int)$requestedYear,
                'month' => (int)$requestedMonth,
                'monthName' => $selectedDate->format('F Y'),
            ],
            'revenue' => [
                'total' => (float)$totalRevenue,
                'membership' => (float)$membershipRevenue,
                'product' => (float)$productRevenue,
                'walkIn' => (float)$walkInRevenue,
                'averageTransaction' => (float)$avgTransactionValue,
            ],
            'transactions' => [
                'total' => (int)$totalTransactions,
                'paid' => (int)$paidCount,
                'pending' => (int)$pendingCount,
                'cancelled' => (int)$cancelledCount,
                'membership' => (int)$membershipCount,
                'product' => (int)$productCount,
            ],
            'customers' => [
                'total' => (int)$totalCustomers,
                'active' => (int)$activeMembers,
                'new' => (int)$newCustomers,
                'expired' => (int)$expiredMembers,
            ],
            'topProducts' => $topProducts,
            'topMemberships' => $topMemberships,
            'topSeller' => $topSeller,
            'dailyBreakdown' => $dailyBreakdown,
            'weeklyBreakdown' => $weeklyBreakdown,
        ]);
    } catch (\Exception $e) {
        Log::error('Business reports error: ' . $e->getMessage());
        Log::error('Business reports stack trace: ' . $e->getTraceAsString());
        return response()->json([
            'error' => 'Failed to generate report',
            'message' => $e->getMessage(),
            'details' => config('app.debug') ? $e->getTraceAsString() : null
        ], 500);
    }
});

// Revenue reports endpoint (Main Admin only)
Route::get('/revenue-reports', function () {
    try {
        $currentUser = getCurrentUser();
        if (!$currentUser || $currentUser->role !== 'main_admin') {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Only Main Admin can access revenue reports'
            ], 403);
        }

        $period = request('period', 'monthly'); // daily, weekly, monthly, annual
        $startDate = request('start_date');
        $endDate = request('end_date');

        // Get selected month/year from query params (for dashboard navigation)
        $selectedYear = request('year', Carbon::now()->year);
        $selectedMonth = request('month', Carbon::now()->month);
        $selectedDate = Carbon::createFromDate($selectedYear, $selectedMonth, 1);

        $reports = [];
        $now = Carbon::now();

        // Helper function to get base query
        $getBaseQuery = function () use ($startDate, $endDate) {
            $query = Transaction::where('status', 'paid');
            if ($startDate) {
                $query->where('transaction_date', '>=', $startDate);
            }
            if ($endDate) {
                $query->where('transaction_date', '<=', $endDate);
            }
            return $query;
        };

        switch ($period) {
            case 'daily':
                // Show only days in the selected month
                $monthStart = $selectedDate->copy()->startOfMonth();
                $monthEnd = $selectedDate->copy()->endOfMonth();
                $daysInMonth = $monthStart->daysInMonth;

                for ($day = 1; $day <= $daysInMonth; $day++) {
                    $date = $selectedDate->copy()->day($day);
                    $dayQuery = $getBaseQuery();
                    $revenue = $dayQuery->whereDate('transaction_date', $date->format('Y-m-d'))->sum('total_amount');
                    $dayQuery = $getBaseQuery();
                    $count = $dayQuery->whereDate('transaction_date', $date->format('Y-m-d'))->count();
                    // Only add if there are transactions
                    if ($count > 0 || $revenue > 0) {
                        $reports[] = [
                            'period' => $date->format('Y-m-d'),
                            'label' => $date->format('M d'),
                            'revenue' => $revenue,
                            'count' => $count,
                        ];
                    }
                }
                break;

            case 'weekly':
                // Show weeks within the selected month
                $monthStart = $selectedDate->copy()->startOfMonth();
                $monthEnd = $selectedDate->copy()->endOfMonth();

                // Get the first week that overlaps with the month
                $firstWeekStart = $monthStart->copy()->startOfWeek();
                $lastWeekEnd = $monthEnd->copy()->endOfWeek();

                $lastMonth = null;
                $currentWeek = $firstWeekStart->copy();

                while ($currentWeek <= $lastWeekEnd) {
                    $weekStart = $currentWeek->copy();
                    $weekEnd = $weekStart->copy()->endOfWeek();

                    // Only include weeks that overlap with the selected month
                    if ($weekEnd >= $monthStart && $weekStart <= $monthEnd) {
                        $weekQuery = $getBaseQuery();
                        $revenue = $weekQuery->whereBetween('transaction_date', [$weekStart, $weekEnd])->sum('total_amount');
                        $weekQuery = $getBaseQuery();
                        $count = $weekQuery->whereBetween('transaction_date', [$weekStart, $weekEnd])->count();

                        // Get week number in month (1st, 2nd, 3rd, 4th, etc.)
                        // Calculate which week of the month (based on day of month)
                        $dayOfMonth = $weekStart->day;
                        $weekNumber = (int)ceil($dayOfMonth / 7);
                        $monthName = $weekStart->format('F');
                        $sundayDate = $weekStart->format('M d');
                        $saturdayDate = $weekEnd->format('M d');

                        // Format week number with suffix
                        $suffix = 'th';
                        if ($weekNumber == 1) $suffix = 'st';
                        elseif ($weekNumber == 2) $suffix = 'nd';
                        elseif ($weekNumber == 3) $suffix = 'rd';

                        // Check if month changed for spacing
                        $currentMonth = $weekStart->format('Y-m');
                        $needsSpacing = $lastMonth !== null && $lastMonth !== $currentMonth;
                        $lastMonth = $currentMonth;

                        $reports[] = [
                            'period' => $weekStart->format('Y-m-d') . ' to ' . $weekEnd->format('Y-m-d'),
                            'label' => $weekNumber . $suffix . ' week of ' . $monthName . ' (' . $sundayDate . ' - ' . $saturdayDate . ')',
                            'revenue' => $revenue,
                            'count' => $count,
                            'month' => $currentMonth,
                            'needsSpacing' => $needsSpacing,
                        ];
                    }

                    // Move to next week
                    $currentWeek->addWeek();
                }
                break;

            case 'monthly':
                // Last 12 months
                for ($i = 11; $i >= 0; $i--) {
                    $month = $now->copy()->subMonths($i);
                    $monthStart = $month->copy()->startOfMonth();
                    $monthEnd = $month->copy()->endOfMonth();
                    $monthQuery = $getBaseQuery();
                    $revenue = $monthQuery->whereBetween('transaction_date', [$monthStart, $monthEnd])->sum('total_amount');
                    $monthQuery = $getBaseQuery();
                    $count = $monthQuery->whereBetween('transaction_date', [$monthStart, $monthEnd])->count();
                    $reports[] = [
                        'period' => $month->format('Y-m'),
                        'label' => $month->format('M Y'),
                        'revenue' => $revenue,
                        'count' => $count,
                    ];
                }
                break;

            case 'annual':
                // Last 5 years
                for ($i = 4; $i >= 0; $i--) {
                    $year = $now->copy()->subYears($i);
                    $yearStart = $year->copy()->startOfYear();
                    $yearEnd = $year->copy()->endOfYear();
                    $yearQuery = $getBaseQuery();
                    $revenue = $yearQuery->whereBetween('transaction_date', [$yearStart, $yearEnd])->sum('total_amount');
                    $yearQuery = $getBaseQuery();
                    $count = $yearQuery->whereBetween('transaction_date', [$yearStart, $yearEnd])->count();
                    $reports[] = [
                        'period' => $year->format('Y'),
                        'label' => $year->format('Y'),
                        'revenue' => $revenue,
                        'count' => $count,
                    ];
                }
                break;
        }

        $totalRevenue = array_sum(array_column($reports, 'revenue'));
        $totalCount = array_sum(array_column($reports, 'count'));

        return response()->json([
            'period' => $period,
            'reports' => $reports,
            'summary' => [
                'total_revenue' => $totalRevenue,
                'total_transactions' => $totalCount,
                'average_per_period' => count($reports) > 0 ? $totalRevenue / count($reports) : 0,
            ],
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Database error',
            'message' => 'Failed to fetch revenue reports: ' . $e->getMessage()
        ], 500);
    }
});

// Users endpoint with ID search support
Route::get('/users', function () {
    try {
        $search = request('search');
        $query = User::with(['activeMembership']);

        // Add ID and name search
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('id', '=', $search)
                    ->orWhere('name', 'LIKE', '%' . $search . '%')
                    ->orWhere('email', 'LIKE', '%' . $search . '%')
                    ->orWhere('phone', 'LIKE', '%' . $search . '%')
                    ->orWhere('rfid_tag', 'LIKE', '%' . $search . '%');
            });
        }

        $users = $query->orderBy('name')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'rfid_tag' => $user->rfid_tag,
                    'status' => $user->status,
                    'membership_type' => $user->membership_type,
                    'membership_fee' => $user->membership_fee,
                    'membership_start_date' => $user->membership_start_date,
                    'membership_end_date' => $user->membership_end_date,
                    'membership_status' => $user->membership_status,
                    'membership_days_left' => $user->membership_days_left,
                    'is_active' => $user->is_active,
                    'notes' => $user->notes,
                    'role' => $user->role, // Include role for admin/staff management
                ];
            });

        return response()->json(['data' => $users]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Database error',
            'message' => 'Failed to fetch users from database'
        ], 500);
    }
});

// Create new user endpoint
Route::post('/users', function () {
    try {
        $data = request()->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'regex:/^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/', 'unique:users,email'],
            'phone' => 'nullable|string|max:20',
            'rfid_tag' => 'nullable|string|unique:users,rfid_tag',
            'status' => 'required|in:active,inactive',
            'notes' => 'nullable|string'
        ]);

        // Normalize name to ALL CAPS
        $data['name'] = strtoupper($data['name']);

        $user = User::create($data);

        return response()->json([
            'message' => 'User created successfully',
            'data' => $user
        ], 201);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Validation error',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Update user endpoint
Route::put('/users/{id}', function ($id) {
    try {
        $data = request()->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'regex:/^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/', 'unique:users,email,' . $id],
            'phone' => 'nullable|string|max:20',
            'rfid_tag' => 'nullable|string|unique:users,rfid_tag,' . $id,
            'status' => 'required|in:active,inactive,expired',
            'notes' => 'nullable|string'
        ]);

        // Normalize name to ALL CAPS
        $data['name'] = strtoupper($data['name']);

        $user = User::findOrFail($id);
        $user->update($data);

        return response()->json([
            'message' => 'User updated successfully',
            'data' => $user
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Validation error',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Update user status endpoint
Route::patch('/users/{id}/status', function ($id) {
    try {
        $data = request()->validate([
            'status' => 'required|in:active,inactive,expired',
        ]);

        $user = User::findOrFail($id);
        $user->update(['status' => $data['status']]);

        return response()->json([
            'message' => 'User status updated successfully',
            'data' => $user
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Validation error',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Delete user endpoint (soft delete)
Route::delete('/users/{id}', function ($id) {
    try {
        $user = User::findOrFail($id);
        $user->delete(); // Soft delete

        return response()->json([
            'message' => 'User deleted successfully'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Error',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Restore user
Route::post('/users/{id}/restore', function ($id) {
    try {
        $user = User::withTrashed()->findOrFail($id);
        $user->restore();

        return response()->json([
            'message' => 'User restored successfully',
            'data' => $user
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Error',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Permanently delete user
Route::delete('/users/{id}/force', function ($id) {
    try {
        $userEmail = request()->header('X-User-Email');
        $user = $userEmail ? User::where('email', $userEmail)->first() : null;

        if (!$user || $user->role !== 'main_admin') {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Only Main Admin can permanently delete items'
            ], 403);
        }

        $deletedUser = User::withTrashed()->findOrFail($id);
        $deletedUser->forceDelete();

        return response()->json([
            'message' => 'User permanently deleted'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Error',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Transactions endpoint with filtering and ID search
Route::get('/transactions', function () {
    try {
        $query = Transaction::with([
            'user', 
            'membership', 
            'product' => function ($q) {
                $q->withTrashed(); // Include soft-deleted products so transaction history is preserved
            }
        ]);

        // Add ID search
        $search = request('search');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('id', '=', $search)
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'LIKE', '%' . $search . '%')
                            ->orWhere('email', 'LIKE', '%' . $search . '%');
                    })
                    ->orWhereHas('product', function ($productQuery) use ($search) {
                        $productQuery->where('name', 'LIKE', '%' . $search . '%');
                    });
            });
        }

        // Filter by transaction type
        if (request('type')) {
            $query->where('transaction_type', request('type'));
        }

        // Filter by status
        if (request('status')) {
            $query->where('status', request('status'));
        }

        // Filter by date range
        if (request('start_date')) {
            $query->where('transaction_date', '>=', request('start_date'));
        }
        if (request('end_date')) {
            $query->where('transaction_date', '<=', request('end_date'));
        }

        $transactions = $query->orderBy('transaction_date', 'desc')->get();

        return response()->json(['data' => $transactions]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Database error',
            'message' => 'Failed to fetch transactions from database'
        ], 500);
    }
});

// Add new transaction endpoint
Route::post('/transactions', function () {
    try {
        $data = request()->validate([
            'user_id' => 'required|exists:users,id',
            'transaction_type' => 'required|in:membership,product',
            'membership_type' => 'nullable|required_if:transaction_type,membership|in:student,regular,regular_with_coach,walk_in',
            'product_id' => 'nullable|required_if:transaction_type,product|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'payment_mode' => 'required|in:cash',
            'transaction_date' => 'required|date',
            'notes' => 'nullable|string'
        ]);

        $transaction = new Transaction();
        $transaction->user_id = $data['user_id'];
        $transaction->transaction_type = $data['transaction_type'];
        $transaction->quantity = $data['quantity'];
        $transaction->payment_mode = $data['payment_mode'];
        $transaction->transaction_date = $data['transaction_date'];
        $transaction->notes = $data['notes'] ?? '';
        $transaction->status = 'paid';

        if ($data['transaction_type'] === 'membership') {
            // Create membership
            $membership = Membership::create([
                'user_id' => $data['user_id'],
                'type' => $data['membership_type'],
                'amount' => Membership::getMembershipPrice($data['membership_type']),
                'start_date' => $data['transaction_date'],
                'end_date' => Carbon::parse($data['transaction_date'])->addDays(Membership::getMembershipDuration($data['membership_type'])),
                'status' => 'active'
            ]);

            $transaction->membership_id = $membership->id;
            $transaction->unit_price = $membership->amount;
            $transaction->total_amount = $membership->amount;

            // Update user membership info
            $user = User::find($data['user_id']);
            $user->update([
                'membership_type' => $data['membership_type'],
                'membership_fee' => $membership->amount,
                'membership_start_date' => $membership->start_date,
                'membership_end_date' => $membership->end_date,
                'status' => 'active'
            ]);
        } else {
            // Product purchase
            $product = Product::find($data['product_id']);
            $transaction->product_id = $data['product_id'];
            $transaction->unit_price = $product->price;
            $transaction->total_amount = $product->price * $data['quantity'];

            // Update product stock
            $product->updateStock($data['quantity'], 'decrease');
        }

        $transaction->save();

        return response()->json([
            'message' => 'Transaction created successfully',
            'data' => $transaction->load(['user', 'membership', 'product'])
        ], 201);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Validation error',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Delete transaction endpoint
Route::delete('/transactions/{id}', function ($id) {
    try {
        $transaction = Transaction::with(['membership', 'product'])->findOrFail($id);

        // If it's a product transaction, restore stock
        if ($transaction->transaction_type === 'product' && $transaction->product) {
            $transaction->product->updateStock($transaction->quantity, 'increase');
        }

        // If it's a membership transaction, update user status
        if ($transaction->transaction_type === 'membership' && $transaction->membership) {
            $user = $transaction->user;
            $user->update([
                'membership_type' => null,
                'membership_fee' => null,
                'membership_start_date' => null,
                'membership_end_date' => null,
                'status' => 'inactive'
            ]);

            // Delete the membership
            $transaction->membership->delete();
        }

        $transaction->delete(); // Soft delete

        return response()->json([
            'message' => 'Transaction deleted successfully'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Error',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Restore transaction
Route::post('/transactions/{id}/restore', function ($id) {
    try {
        $transaction = Transaction::withTrashed()->findOrFail($id);
        $transaction->restore();

        return response()->json([
            'message' => 'Transaction restored successfully',
            'data' => $transaction
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Error',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Permanently delete transaction
Route::delete('/transactions/{id}/force', function ($id) {
    try {
        $userEmail = request()->header('X-User-Email');
        $user = $userEmail ? User::where('email', $userEmail)->first() : null;

        if (!$user || $user->role !== 'main_admin') {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Only Main Admin can permanently delete items'
            ], 403);
        }

        $transaction = Transaction::withTrashed()->findOrFail($id);
        $transaction->forceDelete();

        return response()->json([
            'message' => 'Transaction permanently deleted'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Error',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Products endpoints with ID search support
Route::get('/products', function () {
    try {
        $search = request('search');
        $query = Product::active(); // Only get non-deleted products

        // Add ID and name search
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('id', '=', $search)
                    ->orWhere('name', 'LIKE', '%' . $search . '%')
                    ->orWhere('description', 'LIKE', '%' . $search . '%')
                    ->orWhere('category', 'LIKE', '%' . $search . '%');
            });
        }

        $products = $query->orderBy('name')->get();
        return response()->json(['data' => $products]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Database error',
            'message' => 'Failed to fetch products from database'
        ], 500);
    }
});

// Create product
Route::post('/products', function () {
    try {
        // Custom validation for image field to handle both file uploads and strings
        $validator = \Illuminate\Support\Facades\Validator::make(request()->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'cost' => 'nullable|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'category' => 'required|string|in:supplements,equipment,apparel,other',
        ]);

        // Add image validation based on whether it's a file or string
        if (request()->hasFile('image')) {
            $validator->addRules(['image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048']);
        } else {
            $validator->addRules(['image' => 'nullable|string|max:500']);
        }

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'message' => $validator->errors()->first()
            ], 400);
        }

        $data = $validator->validated();

        $product = new Product();
        $product->name = $data['name'];
        $product->description = $data['description'] ?? '';
        $product->price = $data['price'];
        $product->cost = $data['cost'] ?? null;
        $product->stock = $data['stock'];
        $product->category = $data['category'];
        $product->is_active = true;

        // Handle image - either file upload or external URL
        if (request()->hasFile('image')) {
            $image = request()->file('image');
            $imageName = time() . '_' . $image->getClientOriginalName();
            $image->move(public_path('uploads/products'), $imageName);
            $product->image = '/uploads/products/' . $imageName;
        } elseif (isset($data['image']) && $data['image']) {
            // Handle external URL or direct image path
            $product->image = $data['image'];
        } else {
            $product->image = '/images/placeholder-product.jpg'; // Default placeholder
        }

        $product->save();

        return response()->json([
            'message' => 'Product created successfully',
            'data' => $product
        ], 201);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Error',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Update product
Route::put('/products/{id}', function ($id) {
    try {
        $product = Product::findOrFail($id);

        // Custom validation for image field to handle both file uploads and strings
        $validator = \Illuminate\Support\Facades\Validator::make(request()->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'cost' => 'nullable|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'category' => 'required|string|in:supplements,equipment,apparel,other',
            'is_active' => 'nullable|in:true,false,1,0',
        ]);

        // Add image validation based on whether it's a file or string
        if (request()->hasFile('image')) {
            $validator->addRules(['image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048']);
        } else {
            $validator->addRules(['image' => 'nullable|string|max:500']);
        }

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'message' => $validator->errors()->first()
            ], 400);
        }

        $data = $validator->validated();

        $product->name = $data['name'];
        $product->description = $data['description'] ?? '';
        $product->price = $data['price'];
        $product->cost = $data['cost'] ?? null;
        $product->stock = $data['stock'];
        $product->category = $data['category'];
        $product->is_active = filter_var($data['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN);

        // Handle image - either file upload or external URL
        if (request()->hasFile('image')) {
            // Delete old image if it exists and is not placeholder
            if ($product->image && !str_contains($product->image, 'placeholder') && !str_starts_with($product->image, 'http')) {
                $oldImagePath = public_path($product->image);
                if (file_exists($oldImagePath)) {
                    unlink($oldImagePath);
                }
            }

            $image = request()->file('image');
            $imageName = time() . '_' . $image->getClientOriginalName();
            $image->move(public_path('uploads/products'), $imageName);
            $product->image = '/uploads/products/' . $imageName;
        } elseif (isset($data['image']) && $data['image']) {
            // Handle external URL or direct image path
            $product->image = $data['image'];
        }

        $product->save();

        return response()->json([
            'message' => 'Product updated successfully',
            'data' => $product
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Error',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Delete product (soft delete)
Route::delete('/products/{id}', function ($id) {
    try {
        $product = Product::findOrFail($id);
        $product->delete(); // Soft delete

        return response()->json([
            'message' => 'Product deleted successfully'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Error',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Restore product
Route::post('/products/{id}/restore', function ($id) {
    try {
        $product = Product::withTrashed()->findOrFail($id);
        $product->restore();

        return response()->json([
            'message' => 'Product restored successfully',
            'data' => $product
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Error',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Permanently delete product
Route::delete('/products/{id}/force', function ($id) {
    try {
        $userEmail = request()->header('X-User-Email');
        $user = $userEmail ? User::where('email', $userEmail)->first() : null;

        if (!$user || $user->role !== 'main_admin') {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Only Main Admin can permanently delete items'
            ], 403);
        }

        $product = Product::withTrashed()->findOrFail($id);

        // Delete image file if it exists and is not placeholder
        if ($product->image && !str_contains($product->image, 'placeholder')) {
            $imagePath = public_path($product->image);
            if (file_exists($imagePath)) {
                unlink($imagePath);
            }
        }

        $product->forceDelete();

        return response()->json([
            'message' => 'Product permanently deleted'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Error',
            'message' => $e->getMessage()
        ], 400);
    }
});

// Get membership types
Route::get('/membership-types', function () {
    return response()->json([
        'data' => Membership::getMembershipTypes()
    ]);
});

// Get transaction filters
Route::get('/transaction-filters', function () {
    return response()->json([
        'types' => ['membership', 'product'],
        'statuses' => ['pending', 'paid', 'refunded', 'cancelled'],
        'payment_modes' => ['cash']
    ]);
});

// Trash Bin - Get all deleted items
Route::get('/trash', function () {
    try {
        $userEmail = request()->header('X-User-Email');
        $user = $userEmail ? User::where('email', $userEmail)->first() : null;

        if (!$user) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Authentication required'
            ], 401);
        }

        $category = request('category', 'all'); // all, products, customers, transactions
        $search = request('search');

        $result = [
            'products' => [],
            'customers' => [],
            'transactions' => []
        ];

        // Get deleted products
        if ($category === 'all' || $category === 'products') {
            $productsQuery = Product::onlyTrashed();
            if ($search) {
                $productsQuery->where(function ($q) use ($search) {
                    $q->where('id', '=', $search)
                        ->orWhere('name', 'LIKE', '%' . $search . '%');
                });
            }
            $result['products'] = $productsQuery->get()->map(function ($product) {
                $deletedAt = $product->deleted_at ? \Carbon\Carbon::parse($product->deleted_at) : null;
                $daysUntilPermanent = $deletedAt
                    ? max(0, 30 - \Carbon\Carbon::now()->diffInDays($deletedAt))
                    : 0;
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'deleted_at' => $deletedAt ? $deletedAt->toDateTimeString() : null,
                    'days_until_permanent' => $daysUntilPermanent
                ];
            });
        }

        // Get deleted customers (users)
        if ($category === 'all' || $category === 'customers') {
            $usersQuery = User::onlyTrashed()->whereNull('role'); // Only customers, not staff/admin
            if ($search) {
                $usersQuery->where(function ($q) use ($search) {
                    $q->where('id', '=', $search)
                        ->orWhere('name', 'LIKE', '%' . $search . '%')
                        ->orWhere('email', 'LIKE', '%' . $search . '%');
                });
            }
            $result['customers'] = $usersQuery->get()->map(function ($user) {
                $deletedAt = $user->deleted_at ? \Carbon\Carbon::parse($user->deleted_at) : null;
                $daysUntilPermanent = $deletedAt
                    ? max(0, 30 - \Carbon\Carbon::now()->diffInDays($deletedAt))
                    : 0;
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'deleted_at' => $deletedAt ? $deletedAt->toDateTimeString() : null,
                    'days_until_permanent' => $daysUntilPermanent
                ];
            });
        }

        // Get deleted transactions
        if ($category === 'all' || $category === 'transactions') {
            $transactionsQuery = Transaction::onlyTrashed()->with(['user', 'product']);
            if ($search) {
                $transactionsQuery->where(function ($q) use ($search) {
                    $q->where('id', '=', $search)
                        ->orWhereHas('user', function ($userQuery) use ($search) {
                            $userQuery->where('name', 'LIKE', '%' . $search . '%');
                        });
                });
            }
            $result['transactions'] = $transactionsQuery->get()->map(function ($transaction) {
                $deletedAt = $transaction->deleted_at ? \Carbon\Carbon::parse($transaction->deleted_at) : null;
                $daysUntilPermanent = $deletedAt
                    ? max(0, 30 - \Carbon\Carbon::now()->diffInDays($deletedAt))
                    : 0;
                return [
                    'id' => $transaction->id,
                    'user_name' => $transaction->user->name ?? 'Unknown',
                    'type' => $transaction->transaction_type,
                    'amount' => $transaction->total_amount,
                    'deleted_at' => $deletedAt ? $deletedAt->toDateTimeString() : null,
                    'days_until_permanent' => $daysUntilPermanent
                ];
            });
        }

        // Auto-delete items older than 30 days (only Main Admin can see this)
        if ($user->role === 'main_admin') {
            $thirtyDaysAgo = \Carbon\Carbon::now()->subDays(30);

            Product::onlyTrashed()->where('deleted_at', '<', $thirtyDaysAgo)->forceDelete();
            User::onlyTrashed()->where('deleted_at', '<', $thirtyDaysAgo)->whereNull('role')->forceDelete();
            Transaction::onlyTrashed()->where('deleted_at', '<', $thirtyDaysAgo)->forceDelete();
        }

        return response()->json(['data' => $result]);
    } catch (\Exception $e) {
        Log::error('Trash endpoint error: ' . $e->getMessage(), [
            'trace' => $e->getTraceAsString()
        ]);
        return response()->json([
            'error' => 'Error',
            'message' => $e->getMessage()
        ], 500);
    }
});

// RFID Tracking Endpoints

// Record RFID scan (called when card is scanned)
Route::post('/rfid/scan', function () {
    try {
        $data = request()->validate([
            'rfid_tag' => 'required|string|max:255',
        ]);

        $rfidTag = trim($data['rfid_tag']);
        
        // Find user by RFID tag
        $user = User::where('rfid_tag', $rfidTag)->first();

        $now = \Carbon\Carbon::now();
        $entry = new TrackingEntry();
        $entry->rfid_tag = $rfidTag;
        $entry->timestamp = $now;

        if (!$user) {
            $entry->status = 'denied';
            $entry->reason = 'RFID tag not assigned to any customer';
            $entry->user_name = 'Unknown';
        } else {
            $entry->user_id = $user->id;
            $entry->user_name = $user->name;

            // Check if user is active
            if ($user->status !== 'active') {
                $entry->status = 'denied';
                $entry->reason = 'Account inactive';
            }
            // Check if membership is valid
            elseif (!$user->membership_end_date) {
                $entry->status = 'denied';
                $entry->reason = 'No active membership';
            }
            // Check if membership is expired
            elseif (\Carbon\Carbon::now()->gt($user->membership_end_date)) {
                $entry->status = 'denied';
                $entry->reason = 'Membership expired';
            }
            // Check if membership is expiring soon (within 7 days)
            elseif (\Carbon\Carbon::now()->diffInDays($user->membership_end_date, false) <= 7) {
                $entry->status = 'granted';
                $entry->reason = 'Access granted (Membership expiring soon)';
            }
            // All checks passed
            else {
                $entry->status = 'granted';
                $entry->reason = 'Access granted';
            }
        }

        $entry->save();

        // Dispatch event for real-time updates (if needed)
        // You can use Laravel Events/Broadcasting here for real-time updates

        return response()->json([
            'success' => true,
            'data' => $entry,
            'message' => $entry->status === 'granted' ? 'Access granted' : 'Access denied: ' . $entry->reason
        ]);
    } catch (\Exception $e) {
        Log::error('RFID scan error: ' . $e->getMessage());
        return response()->json([
            'error' => 'Error',
            'message' => 'Failed to process RFID scan: ' . $e->getMessage()
        ], 500);
    }
});

// Get tracking entries (with pagination and filters)
Route::get('/tracking', function () {
    try {
        $limit = request('limit', 100);
        $offset = request('offset', 0);
        $search = request('search');
        $status = request('status'); // 'granted' or 'denied'
        $startDate = request('start_date');
        $endDate = request('end_date');

        $query = TrackingEntry::query()->orderBy('timestamp', 'desc');

        // Search filter
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('user_name', 'LIKE', '%' . $search . '%')
                    ->orWhere('rfid_tag', 'LIKE', '%' . $search . '%')
                    ->orWhere('reason', 'LIKE', '%' . $search . '%');
            });
        }

        // Status filter
        if ($status && in_array($status, ['granted', 'denied'])) {
            $query->where('status', $status);
        }

        // Date range filter
        if ($startDate) {
            $query->whereDate('timestamp', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('timestamp', '<=', $endDate);
        }

        $total = $query->count();
        $entries = $query->limit($limit)->offset($offset)->get();

        return response()->json([
            'data' => $entries,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset
        ]);
    } catch (\Exception $e) {
        Log::error('Tracking fetch error: ' . $e->getMessage());
        return response()->json([
            'error' => 'Error',
            'message' => 'Failed to fetch tracking entries'
        ], 500);
    }
});

// Delete single tracking entry (Main Admin only)
Route::delete('/tracking/{id}', function ($id) {
    try {
        $userEmail = request()->header('X-User-Email');
        $user = $userEmail ? User::where('email', $userEmail)->first() : null;

        if (!$user || $user->role !== 'main_admin') {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Only Main Admin can delete access logs'
            ], 403);
        }

        $entry = TrackingEntry::findOrFail($id);
        $entry->delete();

        return response()->json([
            'message' => 'Access log deleted successfully'
        ]);
    } catch (\Exception $e) {
        Log::error('Delete tracking entry error: ' . $e->getMessage());
        return response()->json([
            'error' => 'Error',
            'message' => 'Failed to delete access log'
        ], 500);
    }
});

// Clear tracking entries (Main Admin only)
Route::delete('/tracking/clear', function () {
    try {
        $userEmail = request()->header('X-User-Email');
        $user = $userEmail ? User::where('email', $userEmail)->first() : null;

        if (!$user || $user->role !== 'main_admin') {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Only Main Admin can clear tracking data'
            ], 403);
        }

        TrackingEntry::truncate();

        return response()->json([
            'message' => 'Tracking data cleared successfully'
        ]);
    } catch (\Exception $e) {
        Log::error('Clear tracking error: ' . $e->getMessage());
        return response()->json([
            'error' => 'Error',
            'message' => 'Failed to clear tracking data'
        ], 500);
    }
});

// Assign RFID tag to user
Route::post('/users/{id}/assign-rfid', function ($id) {
    try {
        $userEmail = request()->header('X-User-Email');
        $currentUser = $userEmail ? User::where('email', $userEmail)->first() : null;

        if (!$currentUser) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Authentication required'
            ], 401);
        }

        $data = request()->validate([
            'rfid_tag' => 'required|string|max:255|unique:users,rfid_tag,' . $id,
        ]);

        $user = User::findOrFail($id);
        $user->rfid_tag = trim($data['rfid_tag']);
        $user->save();

        return response()->json([
            'message' => 'RFID tag assigned successfully',
            'data' => $user
        ]);
    } catch (\Illuminate\Validation\ValidationException $e) {
        return response()->json([
            'error' => 'Validation Error',
            'message' => $e->getMessage(),
            'errors' => $e->errors()
        ], 422);
    } catch (\Exception $e) {
        Log::error('Assign RFID error: ' . $e->getMessage());
        return response()->json([
            'error' => 'Error',
            'message' => 'Failed to assign RFID tag: ' . $e->getMessage()
        ], 500);
    }
});

// Remove RFID tag from user
Route::delete('/users/{id}/remove-rfid', function ($id) {
    try {
        $userEmail = request()->header('X-User-Email');
        $currentUser = $userEmail ? User::where('email', $userEmail)->first() : null;

        if (!$currentUser) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Authentication required'
            ], 401);
        }

        $user = User::findOrFail($id);
        $user->rfid_tag = null;
        $user->save();

        return response()->json([
            'message' => 'RFID tag removed successfully',
            'data' => $user
        ]);
    } catch (\Exception $e) {
        Log::error('Remove RFID error: ' . $e->getMessage());
        return response()->json([
            'error' => 'Error',
            'message' => 'Failed to remove RFID tag'
        ], 500);
    }
});

Route::fallback(function () {
    return response()->json(['message' => 'Not Found'], 404);
});
