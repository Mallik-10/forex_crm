<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Wallet;
use App\Models\TradingAccount;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // -------------------------------------------------------------
        // Client A Setup
        // -------------------------------------------------------------
        $clientA = User::updateOrCreate(
            ['email' => 'clientA@example.com'],
            [
                'name' => 'Client A',
                'password' => 'ClientA01',
            ]
        );

        // $1,000.00 initial available balance stored as minor units (100000 cents)
        Wallet::updateOrCreate(
            ['user_id' => $clientA->id],
            [
                'currency' => 'USD',
                'available_balance_minor' => 100000,
                'reserved_balance_minor' => 0,
            ]
        );

        TradingAccount::updateOrCreate(
            ['user_id' => $clientA->id],
            [
                'account_id' => '10001',
                'currency' => 'USD',
            ]
        );

        // -------------------------------------------------------------
        // Client B Setup
        // -------------------------------------------------------------
        $clientB = User::updateOrCreate(
            ['email' => 'clientb@example.com'],
            [
                'name' => 'Client B',
                'password' => 'ClientB02',
            ]
        );

        // $500.00 initial available balance stored as minor units (50000 cents)
        Wallet::updateOrCreate(
            ['user_id' => $clientB->id],
            [
                'currency' => 'USD',
                'available_balance_minor' => 50000,
                'reserved_balance_minor' => 0,
            ]
        );

        TradingAccount::updateOrCreate(
            ['user_id' => $clientB->id],
            [
                'account_id' => '20001',
                'currency' => 'USD',
            ]
        );
    }
}