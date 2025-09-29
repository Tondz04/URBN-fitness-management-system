<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'transaction_type',
        'membership_id',
        'product_id',
        'quantity',
        'unit_price',
        'total_amount',
        'status',
        'payment_mode',
        'transaction_date',
        'notes',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'unit_price' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'quantity' => 'integer',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function membership()
    {
        return $this->belongsTo(Membership::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // Scopes for filtering
    public function scopeMembership($query)
    {
        return $query->where('transaction_type', 'membership');
    }

    public function scopeProduct($query)
    {
        return $query->where('transaction_type', 'product');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }
}
