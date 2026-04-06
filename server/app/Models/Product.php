<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'price',
        'cost',
        'stock',
        'image',
        'category',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'stock' => 'integer',
        'is_active' => 'boolean',
    ];

    // Relationships
    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeInStock($query)
    {
        return $query->where('stock', '>', 0);
    }

    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    // Accessors
    public function getFormattedPriceAttribute()
    {
        return '₱' . number_format($this->price, 2);
    }

    public function getStockStatusAttribute()
    {
        if ($this->stock <= 0) {
            return 'Out of Stock';
        } elseif ($this->stock <= 5) {
            return 'Low Stock';
        } else {
            return 'In Stock';
        }
    }

    // Methods
    public function updateStock($quantity, $operation = 'decrease')
    {
        if ($operation === 'decrease') {
            $this->stock = max(0, $this->stock - $quantity);
        } else {
            $this->stock += $quantity;
        }
        $this->save();
    }

    public function isAvailable($quantity = 1)
    {
        return $this->is_active && $this->stock >= $quantity;
    }
}
