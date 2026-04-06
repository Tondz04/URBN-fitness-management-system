<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrackingEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'user_name',
        'rfid_tag',
        'timestamp',
        'status',
        'reason',
    ];

    protected $casts = [
        'timestamp' => 'datetime',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

