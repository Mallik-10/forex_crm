<?php

namespace App\Services;

use App\Models\User;
use App\Models\TradingAccount;
use App\Models\Transfer;
use App\Services\TradingSimulatorService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Exception;

class TransferService
{
    public function __construct(
        protected TradingSimulatorService $simulator
    ) {}

    /**
     * Execute a transfer to an account.
     *
     * @throws Exception
     */
    public function executeTransfer(
        User $user,
        TradingAccount $account,
        int $amountMinor,
        string $demoMode = 'success'
    ): Transfer {
        $reference = 'tr_' . Str::random(16);
        $externalAccountId = (string) ($account->account_id ?? $account->id);

        // Call HTTP Simulator Service
        $response = $this->simulator->createTransfer(
            reference: $reference,
            accountId: $externalAccountId,
            amountMinor: $amountMinor,
            currency: 'USD',
            demoMode: $demoMode
        );

        return DB::transaction(function () use ($response, $user, $account, $amountMinor, $reference) {
            if ($response->successful()) {
                $data = $response->json();
                $status = $data['status'] ?? 'completed';

                // Create local transfer record
                $transfer = Transfer::create([
                    'user_id' => $user->id,
                    'trading_account_id' => $account->id,
                    'reference' => $reference,
                    'amount_minor' => $amountMinor,
                    'currency' => 'USD',
                    'status' => $status,
                    'response_payload' => $data,
                ]);

                // Update trading account balance if completed
                if ($status === 'completed') {
                    $account->increment('balance_minor', $amountMinor);
                }

                return $transfer;
            }

            // Handle API Failure Response
            $errorData = $response->json();

            Transfer::create([
                'user_id' => $user->id,
                'trading_account_id' => $account->id,
                'reference' => $reference,
                'amount_minor' => $amountMinor,
                'currency' => 'USD',
                'status' => 'failed',
                'response_payload' => $errorData,
            ]);

            $errorMessage = $errorData['message'] ?? 'Transfer failed via simulator.';
            throw new Exception($errorMessage, $response->status());
        });
    }
}