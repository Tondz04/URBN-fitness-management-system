<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create the first Main Admin account
        // Only create if no admin accounts exist
        $adminExists = User::whereIn('role', ['main_admin', 'admin', 'staff'])->exists();

        if (!$adminExists) {
            User::create([
                'name' => 'MAIN ADMIN',
                'email' => 'admin@rnlgym.com',
                'password' => Hash::make('admin123'),
                'role' => 'main_admin',
                'status' => 'active',
            ]);

            $this->command->info('Main Admin account created!');
            $this->command->info('Email: admin@rnlgym.com');
            $this->command->info('Password: admin123');
            $this->command->warn('Please change the password after first login!');
        } else {
            $this->command->info('Admin accounts already exist. Skipping admin seeder.');
        }
    }
}
