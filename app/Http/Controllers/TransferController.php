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
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Transfer::where('user_id', $user->id)
            ->with('tradingAccount')
            ->latest();

        // Server-side status filtering
        if ($request->has('status') && in_array($request->status, ['pending', 'completed', 'declined'])) {
            $query->where('status', $request->status);
        }

        // Server-side pagination (10 per page)
        $transfers = $query->paginate(10)->withQueryString();

        return Inertia::render('Transfers/Index', [
            'transfers' => $transfers,
            'filters' => $request->only(['status']),
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
            'completed' => 'Transfer reconciled as completed.',
            'declined' => 'Transfer reconciled as declined.',
            'pending' => 'Provider status is still pending or unreachable.',
        };

        return redirect()->back()->with('info', $message);
    }
}