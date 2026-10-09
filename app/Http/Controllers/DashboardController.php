<?php

namespace App\Http\Controllers;

use App\Models\TradingAccount;
use App\Models\Transfer;
use App\Services\TradingSimulatorService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request, TradingSimulatorService $simulator)
    {
        $user = $request->user();
        $wallet = $user->wallet;
        $tradingAccount = $user->tradingAccounts()->first();

        // Fetch live balance from external trading provider simulator
        $providerBalanceMinor = null;
        if ($tradingAccount) {
            $providerBalanceMinor = $simulator->fetchAccountBalance(
            $tradingAccount->account_id
            );
        }

        // Recent transfers for dashboard widget
        $recentTransfers = Transfer::where('user_id', $user->id)
            ->with('tradingAccount')
            ->latest()
            ->take(5)
            ->get();

        return Inertia::render('Dashboard', [
            'user' => $user,
            'wallet' => [
                'currency' => $wallet->currency,
                'available_balance_minor' => $wallet->available_balance_minor,
                'reserved_balance_minor' => $wallet->reserved_balance_minor,
            ],
            'tradingAccount' => $tradingAccount ? [
                'id' => $tradingAccount->id,
                'account_id' => $tradingAccount->account_id,
                'currency' => $tradingAccount->currency,
                'provider_balance_minor' => $providerBalanceMinor,
            ] : null,
            'recentTransfers' => $recentTransfers,
        ]);
    }
}