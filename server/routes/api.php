<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Product;
use App\Models\Membership;

// Dashboard metrics endpoint
Route::get('/metrics', function () {
    try {
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
        $activeMembers = User::withValidMembership()->count();
        $monthlyRevenue = $transactions->where('status', 'paid')->sum('total_amount');
        $newSignups = User::whereMonth('membership_start_date', $selectedDate->month)
            ->whereYear('membership_start_date', $selectedDate->year)
            ->count();

        // Weekly revenue data
        $weeklyRevenue = [];
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

        // Revenue by category
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

        return response()->json([
            'totalUsers' => $totalUsers,
            'activeMembers' => $activeMembers,
            'monthlyRevenue' => $monthlyRevenue,
            'newSignups' => $newSignups,
            'charts' => [
                'line' => $weeklyRevenue,
                'pie' => $categoryBreakdown,
            ],
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Database error',
            'message' => 'Failed to fetch metrics from database'
        ], 500);
    }
});

// Users endpoint
Route::get('/users', function () {
    try {
        $users = User::with(['activeMembership'])
            ->orderBy('name')
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
                    'notes' => $user->notes
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
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'rfid_tag' => 'nullable|string|unique:users,rfid_tag',
            'status' => 'required|in:active,inactive',
            'notes' => 'nullable|string'
        ]);

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

// Delete user endpoint
Route::delete('/users/{id}', function ($id) {
    try {
        $user = User::findOrFail($id);

        // Check if user has active transactions
        $activeTransactions = Transaction::where('user_id', $id)->where('status', 'paid')->count();
        if ($activeTransactions > 0) {
            return response()->json([
                'error' => 'Cannot delete user',
                'message' => 'User has active transactions and cannot be deleted'
            ], 400);
        }

        $user->delete();

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

// Transactions endpoint with filtering
Route::get('/transactions', function () {
    try {
        $query = Transaction::with(['user', 'membership', 'product']);

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
            'membership_type' => 'nullable|required_if:transaction_type,membership|in:student,regular,regular_with_coach',
            'product_id' => 'nullable|required_if:transaction_type,product|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'payment_mode' => 'required|in:cash,gcash,card,bank_transfer',
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

        $transaction->delete();

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

// Products endpoints
Route::get('/products', function () {
    try {
        $products = Product::active()->orderBy('name')->get();
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

// Delete product
Route::delete('/products/{id}', function ($id) {
    try {
        $product = Product::findOrFail($id);

        // Check if product has transactions
        $hasTransactions = $product->transactions()->exists();
        if ($hasTransactions) {
            return response()->json([
                'error' => 'Cannot delete product',
                'message' => 'This product has associated transactions and cannot be deleted'
            ], 400);
        }

        // Delete image file if it exists and is not placeholder
        if ($product->image && !str_contains($product->image, 'placeholder')) {
            $imagePath = public_path($product->image);
            if (file_exists($imagePath)) {
                unlink($imagePath);
            }
        }

        $product->delete();

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
        'payment_modes' => ['cash', 'gcash', 'card', 'bank_transfer']
    ]);
});

Route::fallback(function () {
    return response()->json(['message' => 'Not Found'], 404);
});
