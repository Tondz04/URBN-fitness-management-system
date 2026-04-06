<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            AdminSeeder::class, // Create admin account first
            UserSeeder::class,
            ProductSeeder::class,
            TransactionSeeder::class,
            MockDataSeeder::class, // Add mock data for additional users
        ]);
    }
}
