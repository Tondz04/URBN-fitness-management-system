<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'rfid_tag',
        'status',
        'membership_start_date',
        'membership_end_date',
        'membership_type',
        'membership_fee',
        'notes',
        'role',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'membership_start_date' => 'date',
            'membership_end_date' => 'date',
            'membership_fee' => 'decimal:2',
        ];
    }

    // Relationships
    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function memberships()
    {
        return $this->hasMany(Membership::class);
    }

    public function activeMembership()
    {
        return $this->hasOne(Membership::class)->where('status', 'active');
    }

    // Accessors
    public function getIsActiveAttribute()
    {
        if (!$this->membership_end_date) {
            return false;
        }
        return Carbon::now()->lte($this->membership_end_date);
    }

    public function getMembershipDaysLeftAttribute()
    {
        if (!$this->membership_end_date) {
            return 0;
        }
        return max(0, Carbon::now()->diffInDays($this->membership_end_date, false));
    }

    public function getMembershipStatusAttribute()
    {
        if (!$this->membership_end_date) {
            return 'No Membership';
        }

        if (Carbon::now()->gt($this->membership_end_date)) {
            return 'Expired';
        }

        if ($this->membership_days_left <= 7) {
            return 'Expiring Soon';
        }

        return 'Active';
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeExpired($query)
    {
        return $query->where('status', 'expired');
    }

    public function scopeWithValidMembership($query)
    {
        return $query->where('membership_end_date', '>=', Carbon::now());
    }
}
