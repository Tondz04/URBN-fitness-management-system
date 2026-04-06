<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Product;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $products = [
            [
                'name' => 'Protein Shake',
                'description' => 'High-quality protein shake for muscle building',
                'price' => 149.00,
                'stock' => 23,
                'image' => 'https://images.unsplash.com/photo-1510627498534-cf7e9002facc?w=640&q=80&auto=format&fit=crop',
                'category' => 'supplements',
                'is_active' => true
            ],
            [
                'name' => 'Whey Protein',
                'description' => 'Premium whey protein isolate',
                'price' => 1299.00,
                'stock' => 12,
                'image' => 'https://images.unsplash.com/photo-1588345921523-cf7e9002facc?w=640&q=80&auto=format&fit=crop',
                'category' => 'supplements',
                'is_active' => true
            ],
            [
                'name' => 'Shaker Bottle',
                'description' => 'Professional protein shaker bottle',
                'price' => 199.00,
                'stock' => 40,
                'image' => 'https://images.unsplash.com/photo-1598188306155-cf7e9002facc?w=640&q=80&auto=format&fit=crop',
                'category' => 'equipment',
                'is_active' => true
            ],
            [
                'name' => 'Creatine Monohydrate',
                'description' => 'Pure creatine for strength and power',
                'price' => 899.00,
                'stock' => 15,
                'image' => 'https://images.unsplash.com/photo-1579722827207-cf7e9002facc?w=640&q=80&auto=format&fit=crop',
                'category' => 'supplements',
                'is_active' => true
            ],
            [
                'name' => 'Gym Towel',
                'description' => 'Premium gym towel for workouts',
                'price' => 99.00,
                'stock' => 50,
                'image' => 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=640&q=80&auto=format&fit=crop',
                'category' => 'apparel',
                'is_active' => true
            ],
            [
                'name' => 'Resistance Bands',
                'description' => 'Set of 5 resistance bands for home workouts',
                'price' => 299.00,
                'stock' => 18,
                'image' => 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=640&q=80&auto=format&fit=crop',
                'category' => 'equipment',
                'is_active' => true
            ]
        ];

        foreach ($products as $productData) {
            // Use firstOrCreate to avoid duplicates
            Product::firstOrCreate(
                ['name' => $productData['name']],
                $productData
            );
        }
    }
}
