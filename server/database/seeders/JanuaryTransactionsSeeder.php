<?php

namespace Database\Seeders;

use App\Models\Transaction;
use App\Models\Membership;
use App\Models\User;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class JanuaryTransactionsSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Generating January 2025 transactions...');

        // Get existing users and products
        // Get all users except main_admin and staff
        $users = User::where(function($query) {
            $query->where('role', '!=', 'main_admin')
                  ->where('role', '!=', 'staff')
                  ->orWhereNull('role');
        })->get();
        
        // If still no users, use all users (for testing purposes)
        if ($users->isEmpty()) {
            $this->command->warn('No regular users found. Using all users for transaction generation.');
            $users = User::all();
        }
        
        $products = Product::where('is_active', true)->get();

        if ($users->isEmpty()) {
            $this->command->warn('No users found. Please create users first.');
            return;
        }

        if ($products->isEmpty()) {
            $this->command->warn('No products found. Please create products first.');
            return;
        }

        // Define date range: January 1 to today (use current year)
        $currentYear = Carbon::now()->year;
        $startDate = Carbon::create($currentYear, 1, 1);
        $endDate = Carbon::now();
        
        // Only generate if we're still in January
        if ($endDate->month !== 1 || $endDate->year !== $currentYear) {
            $endDate = Carbon::create($currentYear, 1, 31); // Use full January if we're past it
        }

        $this->command->info("Generating transactions from {$startDate->format('Y-m-d')} to {$endDate->format('Y-m-d')} (Year: {$currentYear})");

        // Clear existing January transactions (optional - comment out if you want to keep existing)
        // Transaction::whereBetween('transaction_date', [$startDate, $endDate])->delete();

        $membershipCount = 0;
        $productCount = 0;

        // Membership types distribution (realistic)
        // Note: walk_in is not in the memberships table enum, so we exclude it
        $membershipTypes = [
            'student' => ['weight' => 40, 'price' => 300],
            'regular' => ['weight' => 50, 'price' => 500],
            'regular_with_coach' => ['weight' => 10, 'price' => 1500],
        ];

        // Generate transactions for each day
        $currentDate = $startDate->copy();
        while ($currentDate->lte($endDate)) {
            $dayOfWeek = $currentDate->dayOfWeek; // 0 = Sunday, 6 = Saturday
            
            // Determine activity level based on day of week
            // Weekdays are busier, weekends are lighter
            $isWeekend = $dayOfWeek === 0 || $dayOfWeek === 6;
            $baseTransactions = $isWeekend ? rand(5, 12) : rand(12, 25);

            // Generate transactions for this day
            for ($i = 0; $i < $baseTransactions; $i++) {
                $user = $users->random();
                
                // Determine transaction type (65% membership, 35% product)
                $transactionType = (rand(1, 100) <= 65) ? 'membership' : 'product';
                
                // Generate realistic time (peak hours: 6-9am, 5-9pm)
                $hour = $this->getRealisticHour();
                $minute = rand(0, 59);
                $transactionTime = $currentDate->copy()->setTime($hour, $minute, 0);
                
                // Skip if time is in the future
                if ($transactionTime->isFuture()) {
                    continue;
                }

                if ($transactionType === 'membership') {
                    // Membership transaction
                    $membershipType = $this->getWeightedMembershipType($membershipTypes);
                    $price = $membershipTypes[$membershipType]['price'];
                    
                    // Create membership
                    $membership = Membership::create([
                        'user_id' => $user->id,
                        'type' => $membershipType,
                        'amount' => $price,
                        'start_date' => $transactionTime->toDateString(),
                        'end_date' => $transactionTime->copy()->addDays(Membership::getMembershipDuration($membershipType))->toDateString(),
                        'status' => 'active',
                        'notes' => 'January enrollment',
                        'created_at' => $transactionTime,
                        'updated_at' => $transactionTime,
                    ]);

                    // Create transaction
                    Transaction::create([
                        'user_id' => $user->id,
                        'transaction_type' => 'membership',
                        'membership_id' => $membership->id,
                        'quantity' => 1,
                        'unit_price' => $price,
                        'total_amount' => $price,
                        'status' => (rand(1, 100) <= 95) ? 'paid' : 'pending', // 95% paid
                        'payment_mode' => 'cash',
                        'transaction_date' => $transactionTime->toDateString(),
                        'notes' => 'January membership purchase',
                        'created_at' => $transactionTime,
                        'updated_at' => $transactionTime,
                    ]);

                    // Update user membership info
                    $user->update([
                        'membership_type' => $membershipType,
                        'membership_fee' => $price,
                        'membership_start_date' => $membership->start_date,
                        'membership_end_date' => $membership->end_date,
                        'status' => 'active'
                    ]);

                    $membershipCount++;
                } else {
                    // Product transaction
                    $product = $products->random();
                    $quantity = rand(1, 3);
                    $unitPrice = $product->price;
                    $totalAmount = $unitPrice * $quantity;

                    // Ensure product has enough stock
                    if ($product->stock < $quantity) {
                        $product->stock = $quantity + 20; // Add buffer stock
                        $product->save();
                    }

                    // Create transaction
                    Transaction::create([
                        'user_id' => $user->id,
                        'transaction_type' => 'product',
                        'product_id' => $product->id,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'total_amount' => $totalAmount,
                        'status' => (rand(1, 100) <= 90) ? 'paid' : 'pending', // 90% paid
                        'payment_mode' => 'cash',
                        'transaction_date' => $transactionTime->toDateString(),
                        'notes' => 'January product purchase',
                        'created_at' => $transactionTime,
                        'updated_at' => $transactionTime,
                    ]);

                    // Update product stock
                    $product->updateStock($quantity, 'decrease');

                    $productCount++;
                }
            }

            $currentDate->addDay();
        }

        $this->command->info("Generated {$membershipCount} membership transactions and {$productCount} product transactions for January {$currentYear}!");
        $this->command->info("Total transactions: " . ($membershipCount + $productCount));
    }

    /**
     * Generate realistic hour based on gym activity patterns
     * Peak hours: 6-9am (morning), 5-9pm (evening)
     */
    private function getRealisticHour(): int
    {
        $rand = rand(1, 100);
        
        if ($rand <= 30) {
            // Morning peak (6-9am) - 30% chance
            return rand(6, 9);
        } elseif ($rand <= 60) {
            // Evening peak (5-9pm) - 30% chance
            return rand(17, 21);
        } elseif ($rand <= 75) {
            // Mid-day (10am-4pm) - 15% chance
            return rand(10, 16);
        } elseif ($rand <= 90) {
            // Late night (10pm-11pm) - 15% chance
            return rand(22, 23);
        } else {
            // Early morning (5am) or late night (12am-2am) - 10% chance
            return rand(0, 2) === 0 ? 5 : rand(0, 2);
        }
    }

    /**
     * Get membership type based on weighted distribution
     */
    private function getWeightedMembershipType(array $types): string
    {
        $totalWeight = array_sum(array_column($types, 'weight'));
        $random = rand(1, $totalWeight);
        $currentWeight = 0;

        foreach ($types as $type => $data) {
            $currentWeight += $data['weight'];
            if ($random <= $currentWeight) {
                return $type;
            }
        }

        // Fallback to regular
        return 'regular';
    }
}

