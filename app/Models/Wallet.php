<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Wallet extends Model
{
    protected $fillable = [
        'user_id',
        'currency',
        'available_balance_minor',
        'reserved_balance_minor',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}