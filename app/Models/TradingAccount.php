<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TradingAccount extends Model
{
    protected $fillable = [
        'user_id',
        'account_id',
        'currency',
        'provider_balance_minor',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}