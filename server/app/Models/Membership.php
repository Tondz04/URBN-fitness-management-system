<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Membership extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'amount',
        'start_date',
        'end_date',
        'status',
        'notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'amount' => 'decimal:2',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    // Accessors
    public function getIsActiveAttribute()
    {
        return $this->status === 'active' && Carbon::now()->lte($this->end_date);
    }

    public function getDaysLeftAttribute()
    {
        return max(0, Carbon::now()->diffInDays($this->end_date, false));
    }

    public function getIsExpiredAttribute()
    {
        return Carbon::now()->gt($this->end_date);
    }

    public function getIsExpiringSoonAttribute()
    {
        return $this->days_left <= 7 && $this->days_left > 0;
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active')->where('end_date', '>=', Carbon::now());
    }

    public function scopeExpired($query)
    {
        return $query->where(function($q) {
            $q->where('status', 'expired')->orWhere('end_date', '<', Carbon::now());
        });
    }

    public function scopeExpiringSoon($query)
    {
        $nextWeek = Carbon::now()->addDays(7);
        return $query->where('status', 'active')
                    ->where('end_date', '<=', $nextWeek)
                    ->where('end_date', '>=', Carbon::now());
    }

    // Static methods for membership types
    public static function getMembershipTypes()
    {
        return [
            'student' => [
                'name' => 'Student Membership',
                'price' => 300,
                'duration_days' => 30
            ],
            'regular' => [
                'name' => 'Regular Membership',
                'price' => 500,
                'duration_days' => 30
            ],
            'regular_with_coach' => [
                'name' => 'Regular with Coach',
                'price' => 1500,
                'duration_days' => 30
            ]
        ];
    }

    public static function getMembershipPrice($type)
    {
        $types = self::getMembershipTypes();
        return $types[$type]['price'] ?? 0;
    }

    public static function getMembershipDuration($type)
    {
        $types = self::getMembershipTypes();
        return $types[$type]['duration_days'] ?? 30;
    }
}
