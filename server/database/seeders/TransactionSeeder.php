<?php

namespace Database\Seeders;

use App\Models\Transaction;
use App\Models\User;
use App\Models\Product;
use App\Models\Membership;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class TransactionSeeder extends Seeder
{
    public function run(): void
    {
        // Get users and products for creating transactions
        $users = User::all();
        $products = Product::all();

        // Create membership transactions
        foreach ($users as $user) {
            if ($user->membership_type && $user->membership_fee) {
                // Check if membership already exists
                $membership = Membership::firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'type' => $user->membership_type,
                    ],
                    [
                        'amount' => $user->membership_fee,
                        'start_date' => $user->membership_start_date,
                        'end_date' => $user->membership_end_date,
                        'status' => $user->status === 'active' ? 'active' : 'expired',
                        'notes' => $user->notes
                    ]
                );

                // Create transaction for membership if it doesn't exist
                Transaction::firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'transaction_type' => 'membership',
                        'membership_id' => $membership->id,
                        'transaction_date' => $user->membership_start_date,
                    ],
                    [
                        'quantity' => 1,
                        'unit_price' => $user->membership_fee,
                        'total_amount' => $user->membership_fee,
                        'status' => 'paid',
                        'payment_mode' => 'gcash',
                        'notes' => 'Membership enrollment'
                    ]
                );
            }
        }

        // Create product purchase transactions
        $productTransactions = [
            [
                'user_name' => 'Christine Tondag',
                'product_name' => 'Protein Shake',
                'quantity' => 2,
                'payment_mode' => 'cash',
                'transaction_date' => Carbon::now()->subDays(3)
            ],
            [
                'user_name' => 'Mark Talabucon',
                'product_name' => 'Whey Protein',
                'quantity' => 1,
                'payment_mode' => 'card',
                'transaction_date' => Carbon::now()->subDays(5)
            ],
            [
                'user_name' => 'Jemery Luces',
                'product_name' => 'Shaker Bottle',
                'quantity' => 1,
                'payment_mode' => 'gcash',
                'transaction_date' => Carbon::now()->subDays(7)
            ],
            [
                'user_name' => 'Jennylyn Obregon',
                'product_name' => 'Creatine Monohydrate',
                'quantity' => 1,
                'payment_mode' => 'cash',
                'transaction_date' => Carbon::now()->subDays(10)
            ]
        ];

        foreach ($productTransactions as $pt) {
            $user = User::where('name', $pt['user_name'])->first();
            $product = Product::where('name', $pt['product_name'])->first();

            if ($user && $product) {
                // Use firstOrCreate to avoid duplicates
                Transaction::firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'transaction_type' => 'product',
                        'product_id' => $product->id,
                        'transaction_date' => $pt['transaction_date'],
                    ],
                    [
                        'quantity' => $pt['quantity'],
                        'unit_price' => $product->price,
                        'total_amount' => $product->price * $pt['quantity'],
                        'status' => 'paid',
                        'payment_mode' => $pt['payment_mode'],
                        'notes' => 'Product purchase'
                    ]
                );
            }
        }
    }
}
