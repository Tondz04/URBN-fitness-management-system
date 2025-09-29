<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Carbon\Carbon;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = [
            [
                'name' => 'Christine Tondag',
                'email' => 'christine@example.com',
                'phone' => '09123456789',
                'rfid_tag' => 'RFID001',
                'status' => 'active',
                'membership_type' => 'student',
                'membership_fee' => 300,
                'membership_start_date' => Carbon::now()->subDays(15),
                'membership_end_date' => Carbon::now()->addDays(15),
                'notes' => 'Student member - active'
            ],
            [
                'name' => 'Mark Talabucon',
                'email' => 'mark@example.com',
                'phone' => '09123456790',
                'rfid_tag' => 'RFID002',
                'status' => 'active',
                'membership_type' => 'regular',
                'membership_fee' => 500,
                'membership_start_date' => Carbon::now()->subDays(10),
                'membership_end_date' => Carbon::now()->addDays(20),
                'notes' => 'Regular member - active'
            ],
            [
                'name' => 'Jemery Luces',
                'email' => 'jemery@example.com',
                'phone' => '09123456791',
                'rfid_tag' => 'RFID003',
                'status' => 'active',
                'membership_type' => 'regular_with_coach',
                'membership_fee' => 1500,
                'membership_start_date' => Carbon::now()->subDays(5),
                'membership_end_date' => Carbon::now()->addDays(25),
                'notes' => 'Premium member with coach - active'
            ],
            [
                'name' => 'Jennylyn Obregon',
                'email' => 'jennylyn@example.com',
                'phone' => '09123456792',
                'rfid_tag' => 'RFID004',
                'status' => 'expired',
                'membership_type' => 'regular',
                'membership_fee' => 500,
                'membership_start_date' => Carbon::now()->subDays(35),
                'membership_end_date' => Carbon::now()->subDays(5),
                'notes' => 'Regular member - expired'
            ],
            [
                'name' => 'Angelo Fabela',
                'email' => 'angelo@example.com',
                'phone' => '09123456793',
                'rfid_tag' => 'RFID005',
                'status' => 'active',
                'membership_type' => 'student',
                'membership_fee' => 300,
                'membership_start_date' => Carbon::now()->subDays(25),
                'membership_end_date' => Carbon::now()->addDays(5),
                'notes' => 'Student member - expiring soon'
            ],
            [
                'name' => 'Maria Santos',
                'email' => 'maria@example.com',
                'phone' => '09123456794',
                'rfid_tag' => 'RFID006',
                'status' => 'inactive',
                'membership_type' => null,
                'membership_fee' => null,
                'membership_start_date' => null,
                'membership_end_date' => null,
                'notes' => 'Inactive user - no membership'
            ]
        ];

        foreach ($users as $userData) {
            User::create($userData);
        }
    }
}
