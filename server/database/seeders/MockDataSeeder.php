<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\Membership;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;

class MockDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Users to create
        $usersData = [
            [
                'name' => 'CRAIG NICOLAS QUINTO',
                'email' => 'craig.quinto@gmail.com',
                'phone' => '09171234567',
                'rfid_tag' => 'RFID009',
            ],
            [
                'name' => 'BRYLE BUNDALAN',
                'email' => 'bryle.bundalan@yahoo.com',
                'phone' => '09182345678',
                'rfid_tag' => 'RFID010',
            ],
            [
                'name' => 'RALPH CHRISTIAN ANDONI',
                'email' => 'ralph.andoni@outlook.com',
                'phone' => '09193456789',
                'rfid_tag' => 'RFID011',
            ],
            [
                'name' => 'SHANE MICHAEL DELAVEGA',
                'email' => 'shane.delavega@gmail.com',
                'phone' => '09204567890',
                'rfid_tag' => 'RFID012',
            ],
            [
                'name' => 'AYE ARROJADO',
                'email' => 'aye.arrojado@yahoo.com',
                'phone' => '09215678901',
                'rfid_tag' => 'RFID013',
            ],
            [
                'name' => 'JUNE MARK ABALAJON',
                'email' => 'junemark.abalajon@gmail.com',
                'phone' => '09226789012',
                'rfid_tag' => 'RFID014',
            ],
            [
                'name' => 'DARWIN JEE CADIZ',
                'email' => 'darwin.cadiz@outlook.com',
                'phone' => '09237890123',
                'rfid_tag' => 'RFID015',
            ],
        ];

        // Membership types and fees
        $membershipTypes = [
            'student' => 300,
            'regular' => 500,
            'regular_with_coach' => 1500,
        ];

        // Get existing products
        $products = Product::all();
        if ($products->isEmpty()) {
            $this->command->warn('No products found. Please run ProductSeeder first.');
            return;
        }

        $now = Carbon::now();
        $septemberStart = Carbon::create(2025, 9, 1);
        $decemberEnd = Carbon::create(2025, 12, 24);

        foreach ($usersData as $index => $userData) {
            // Create user
            $user = User::firstOrCreate(
                ['email' => $userData['email']],
                array_merge($userData, [
                    'name' => strtoupper($userData['name']),
                    'status' => 'active',
                ])
            );

            // Determine membership type (random but realistic distribution)
            $membershipType = ['student', 'regular', 'regular', 'regular', 'regular_with_coach'][$index % 5];
            $membershipFee = $membershipTypes[$membershipType];

            // Random enrollment date between September and December
            $enrollmentDate = Carbon::create(2025, 9, 1)
                ->addDays(rand(0, $septemberStart->diffInDays($decemberEnd)))
                ->setTime(rand(8, 20), rand(0, 59), 0);

            // Membership duration (30 days)
            $membershipEndDate = $enrollmentDate->copy()->addDays(30);

            // Set membership details
            $user->membership_type = $membershipType;
            $user->membership_fee = $membershipFee;
            $user->membership_start_date = $enrollmentDate;
            $user->membership_end_date = $membershipEndDate;
            $user->status = $membershipEndDate->isFuture() ? 'active' : 'expired';
            $user->save();

            // Create membership record
            $membership = Membership::firstOrCreate(
                [
                    'user_id' => $user->id,
                    'type' => $membershipType,
                ],
                [
                    'amount' => $membershipFee,
                    'start_date' => $enrollmentDate,
                    'end_date' => $membershipEndDate,
                    'status' => $membershipEndDate->isFuture() ? 'active' : 'expired',
                    'notes' => 'Membership enrollment',
                ]
            );

            // Create membership payment transaction
            Transaction::firstOrCreate(
                [
                    'user_id' => $user->id,
                    'transaction_type' => 'membership',
                    'membership_id' => $membership->id,
                    'transaction_date' => $enrollmentDate,
                ],
                [
                    'quantity' => 1,
                    'unit_price' => $membershipFee,
                    'total_amount' => $membershipFee,
                    'status' => 'paid',
                    'payment_mode' => ['cash', 'gcash', 'card', 'gcash', 'cash', 'card', 'gcash'][$index % 7],
                    'notes' => 'Membership enrollment',
                ]
            );

            // Create product purchase transactions (2-5 purchases per user)
            $numPurchases = rand(2, 5);
            $purchaseDates = [];

            for ($i = 0; $i < $numPurchases; $i++) {
                // Random purchase date after enrollment but before December 24
                $purchaseDate = $enrollmentDate->copy()
                    ->addDays(rand(1, min(30, $enrollmentDate->diffInDays($decemberEnd))))
                    ->setTime(rand(8, 20), rand(0, 59), 0);

                // Make sure date is unique and within range
                while (
                    in_array($purchaseDate->format('Y-m-d H:i:s'), $purchaseDates) ||
                    $purchaseDate->gt($decemberEnd)
                ) {
                    $purchaseDate = $enrollmentDate->copy()
                        ->addDays(rand(1, min(30, $enrollmentDate->diffInDays($decemberEnd))))
                        ->setTime(rand(8, 20), rand(0, 59), 0);
                }

                $purchaseDates[] = $purchaseDate->format('Y-m-d H:i:s');

                // Random product
                $product = $products->random();
                $quantity = rand(1, 3); // Realistic quantity
                $totalAmount = $product->price * $quantity;

                // Payment modes (realistic distribution)
                $paymentModes = ['cash', 'gcash', 'card', 'gcash', 'cash'];
                $paymentMode = $paymentModes[array_rand($paymentModes)];

                Transaction::create([
                    'user_id' => $user->id,
                    'transaction_type' => 'product',
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'unit_price' => $product->price,
                    'total_amount' => $totalAmount,
                    'status' => 'paid',
                    'payment_mode' => $paymentMode,
                    'transaction_date' => $purchaseDate,
                    'notes' => 'Product purchase',
                ]);

                // Update product stock (decrease)
                $product->stock = max(0, $product->stock - $quantity);
                $product->save();
            }

            // Some users might renew their membership (30-40% chance)
            if (rand(1, 10) <= 4 && $membershipEndDate->isPast()) {
                $renewalDate = $membershipEndDate->copy()->addDays(rand(0, 5));
                $newEndDate = $renewalDate->copy()->addDays(30);

                if ($newEndDate->lte($decemberEnd)) {
                    // Update user membership
                    $user->membership_start_date = $renewalDate;
                    $user->membership_end_date = $newEndDate;
                    $user->status = $newEndDate->isFuture() ? 'active' : 'expired';
                    $user->save();

                    // Create renewal membership
                    $renewalMembership = Membership::create([
                        'user_id' => $user->id,
                        'type' => $membershipType,
                        'amount' => $membershipFee,
                        'start_date' => $renewalDate,
                        'end_date' => $newEndDate,
                        'status' => $newEndDate->isFuture() ? 'active' : 'expired',
                        'notes' => 'Membership renewal',
                    ]);

                    // Create renewal transaction
                    Transaction::create([
                        'user_id' => $user->id,
                        'transaction_type' => 'membership',
                        'membership_id' => $renewalMembership->id,
                        'quantity' => 1,
                        'unit_price' => $membershipFee,
                        'total_amount' => $membershipFee,
                        'status' => 'paid',
                        'payment_mode' => ['cash', 'gcash', 'card'][rand(0, 2)],
                        'transaction_date' => $renewalDate,
                        'notes' => 'Membership renewal',
                    ]);
                }
            }
        }

        $this->command->info('Mock data created successfully!');
        $this->command->info('Created 7 users with memberships and transactions from September to December 2025.');
    }
}
