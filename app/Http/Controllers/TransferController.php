<?php

namespace App\Http\Controllers;

use App\Models\TradingAccount;
use App\Models\Transfer;
use App\Services\TransferService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Exception;

class TransferController extends Controller
{
    
public function index(
    Request $request,
    \App\Services\TradingSimulatorService $simulator
) {
    $user = $request->user();

    $transfers = Transfer::where('user_id', $user->id)
        ->with('tradingAccount')
        ->latest()
        ->when(
            in_array($request->query('status'), [
                'pending', 'completed', 'declined', 'failed'
            ], true),
            fn ($query) => $query->where('status', $request->query('status'))
        )
        ->paginate(10)
        ->withQueryString();

    $wallet = $user->wallet;

    $tradingAccounts = $user->tradingAccounts()
        ->get()
        ->map(function ($account) use ($simulator) {
            $providerData = $simulator->getAccount(
                (string) $account->account_id
            );

            // Only use a real balance returned by the simulator.
            $balanceMinor = isset($providerData['balance_minor'])
                ? (int) $providerData['balance_minor']
                : null;

            return [
                'id' => $account->id,
                'account_id' => $account->account_id,
                'currency' => $account->currency,
                'balance_minor' => $balanceMinor,
                'provider_balance_minor' => $balanceMinor,
            ];
        });

    return Inertia::render('Transfers/Index', [
        'transfers' => $transfers,
        'filters' => $request->only(['status']),
        'wallet' => $wallet ? [
            'currency' => $wallet->currency,
            'available_balance_minor' => (int) $wallet->available_balance_minor,
            'reserved_balance_minor' => (int) $wallet->reserved_balance_minor,
        ] : null,
        'tradingAccounts' => $tradingAccounts,
    ]);
}


    public function store(Request $request, TransferService $transferService)
    {
        $validated = $request->validate([
            'trading_account_id' => 'required|exists:trading_accounts,id',
            'amount' => 'required|numeric|min:0.01|regex:/^\d+(\.\d{1,2})?$/',
            'demo_mode' => ['required', Rule::in(['success', 'declined', 'timeout_after_success'])],
        ]);

        $account = TradingAccount::findOrFail($validated['trading_account_id']);

        // Explicit Client Authorization Check
        if ($account->user_id !== auth()->id()) {
            return back()->withErrors(['trading_account_id' => 'Unauthorized trading account access.']);
        }

        // Convert USD float input into integer minor units (cents)
        $amountMinor = (int) round($validated['amount'] * 100);

        try {
            $transfer = $transferService->executeTransfer(
                auth()->user(),
                $account,
                $amountMinor,
                $validated['demo_mode']
            );

            $message = match ($transfer->status) {
                'failed' => 'Transfer definitively failed; the reserved funds were released.',
                'completed' => 'Transfer confirmed successful.',
                'declined' => 'Transfer was declined by provider.',
                'pending' => 'Transfer timed out or is uncertain. Status is pending.',
            };

            return redirect()->back()->with('success', $message);
        } catch (Exception $e) {
            return back()->withErrors(['amount' => $e->getMessage()]);
        }
    }

    public function reconcile(Transfer $transfer, TransferService $transferService)
    {
        // Explicit Ownership Protection
        if ($transfer->user_id !== auth()->id()) {
            abort(403, 'Unauthorized action.');
        }

        $reconciled = $transferService->reconcileTransfer($transfer);

        $message = match ($reconciled->status) {
            'failed' => 'Transfer definitively failed; the reserved funds were released.',
            'completed' => 'Transfer reconciled as completed.',
            'declined' => 'Transfer reconciled as declined.',
            'pending' => 'Provider status is still pending or unreachable.',
        };

        return redirect()->back()->with('info', $message);
    }
}