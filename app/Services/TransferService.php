<?php

namespace App\Services;

use App\Models\User;
use App\Models\TradingAccount;
use App\Models\Transfer;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Throwable;
use RuntimeException;

class TransferService
{
    public function __construct(
        protected TradingSimulatorService $simulator
    ) {}

    public function executeTransfer(
        User $user,
        TradingAccount $account,
        int $amountMinor,
        string $demoMode = 'success'
    ): Transfer {
        if ($amountMinor <= 0) {
            throw new RuntimeException('Transfer amount must be greater than zero.');
        }

        // Stage 1: reserve the funds and create the durable pending record
        // BEFORE making any external provider call.
        $transfer = DB::transaction(function () use (
            $user, $account, $amountMinor, $demoMode
        ) {
            $lockedAccount = TradingAccount::query()
                ->whereKey($account->id)
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->firstOrFail();

            $wallet = $user->wallet()
                ->lockForUpdate()
                ->first();

            if (!$wallet) {
                throw new RuntimeException('Wallet not found.');
            }

            if ($wallet->currency !== $lockedAccount->currency) {
                throw new RuntimeException('Wallet and trading account currencies do not match.');
            }

            if ((int) $wallet->available_balance_minor < $amountMinor) {
                throw new RuntimeException('Insufficient available wallet balance.');
            }

            $wallet->available_balance_minor -= $amountMinor;
            $wallet->reserved_balance_minor += $amountMinor;
            $wallet->save();

            return Transfer::create([
                'user_id' => $user->id,
                'trading_account_id' => $lockedAccount->id,
                'reference' => 'tr_' . Str::uuid()->toString(),
                'amount_minor' => $amountMinor,
                'currency' => $wallet->currency,
                'status' => 'pending',
                'demo_mode' => $demoMode,
            ]);
        });

        // Stage 2: call the simulator OUTSIDE the database transaction.
        // A network exception means the outcome is uncertain, not failed.
        try {
            $response = $this->simulator->createTransfer(
                reference: $transfer->reference,
                accountId: (string) $account->account_id,
                amountMinor: $amountMinor,
                currency: $transfer->currency,
                demoMode: $demoMode
            );

            $data = $response->json();
            $providerStatus = is_array($data)
                ? $this->normalizeStatus($data['status'] ?? null)
                : null;

            if ($providerStatus !== null) {
                $this->finalizeTransfer($transfer, $providerStatus, $data);
            } elseif ($response->status() === 422) {
                // This simulator uses HTTP 422 for a definitive decline.
                $this->finalizeTransfer($transfer, 'declined', is_array($data) ? $data : []);
            }
            // Other HTTP errors or unexpected responses remain pending.
            // Do not release funds merely because the response was unclear.
        } catch (Throwable $e) {
            // The provider may have completed the transfer before the
            // connection failed. Keep the reservation for reconciliation.
            report($e);
        }

        return $transfer->fresh();
    }

    public function reconcileTransfer(Transfer $transfer): Transfer
    {
        if ($transfer->status !== 'pending') {
            return $transfer;
        }

        try {
            // Always query with the original reference; never create a new one.
            $data = $this->simulator->getTransfer($transfer->reference);

            $status = is_array($data)
                ? $this->normalizeStatus($data['status'] ?? null)
                : null;

            if ($status !== null && $status !== 'pending') {
                $this->finalizeTransfer($transfer, $status, $data);
            }
            // Unknown status, 404, and unreachable provider all stay pending.
        } catch (Throwable $e) {
            report($e);
        }

        return $transfer->fresh();
    }

    private function normalizeStatus(mixed $status): ?string
    {
        if (!is_string($status)) {
            return null;
        }

        return match (strtolower(trim($status))) {
            'completed', 'success', 'successful' => 'completed',
            'declined', 'rejected' => 'declined',
            'failed' => 'failed',
            'pending', 'processing', 'accepted', 'queued' => 'pending',
            default => null,
        };
    }

    private function finalizeTransfer(
        Transfer $transfer,
        string $finalStatus,
        array $providerData = []
    ): void {
        if (!in_array($finalStatus, ['completed', 'declined', 'failed'], true)) {
            return;
        }

        DB::transaction(function () use ($transfer, $finalStatus, $providerData) {
            $lockedTransfer = Transfer::query()
                ->whereKey($transfer->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Idempotency: only a pending transfer can move money.
            if ($lockedTransfer->status !== 'pending') {
                return;
            }

            $wallet = $lockedTransfer->user
                ->wallet()
                ->lockForUpdate()
                ->firstOrFail();

            $amount = (int) $lockedTransfer->amount_minor;

            if ((int) $wallet->reserved_balance_minor < $amount) {
                throw new RuntimeException(
                    "Reserved wallet funds are inconsistent for transfer {$lockedTransfer->reference}."
                );
            }

            // Remove the reservation exactly once.
            $wallet->reserved_balance_minor -= $amount;

            if ($finalStatus === 'completed') {
                // Available balance was already reduced when reserved.
                // Only confirmed provider success credits the CRM account.
                $account = TradingAccount::query()
                    ->whereKey($lockedTransfer->trading_account_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if (Schema::hasColumn('trading_accounts', 'balance_minor')) {
                    DB::table('trading_accounts')
                        ->where('id', $account->id)
                        ->increment('balance_minor', $amount);
                }
            } else {
                // A definitive decline/failure releases the reservation.
                $wallet->available_balance_minor += $amount;
            }

            $wallet->save();

            $lockedTransfer->status = $finalStatus;
            $lockedTransfer->failure_reason = $finalStatus === 'completed'
                ? null
                : ($providerData['message'] ?? "Provider status: {$finalStatus}");
            $lockedTransfer->save();
        });

        // If your schema stores a separate provider_balance_minor column,
        // refresh it from the provider after a confirmed completion.
        if ($finalStatus === 'completed'
            && Schema::hasColumn('trading_accounts', 'provider_balance_minor')) {
            try {
                $account = $transfer->tradingAccount;
                $providerAccount = $this->simulator->getAccount(
                    (string) $account->account_id
                );

                if (isset($providerAccount['balance_minor'])) {
                    DB::table('trading_accounts')
                        ->where('id', $account->id)
                        ->update([
                            'provider_balance_minor' => (int) $providerAccount['balance_minor'],
                            'updated_at' => now(),
                        ]);
                }
            } catch (Throwable $e) {
                // Transfer is already finalized. A balance refresh can be retried
                // separately; it must not reverse a confirmed transfer.
                report($e);
            }
        }
    }
}
