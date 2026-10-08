<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\Response;

class TradingSimulatorService
{
    protected string $baseUrl;
    protected string $apiKey;

    public function __construct()
    {
        $this->baseUrl = config('services.trading_simulator.base_url', 'http://127.0.0.1:9001');
        $this->apiKey = config('services.trading_simulator.api_key', 'local-demo-key');
    }

    /**
     * Get account details by ID
     */
    public function getAccount(string $accountId): array
    {
        $response = Http::withToken($this->apiKey)
            ->get("{$this->baseUrl}/accounts/{$accountId}");

        if ($response->failed()) {
            return ['error' => $response->json('error', 'Unable to fetch account')];
        }

        return $response->json();
    }

    /**
     * Fetch the balance for a given account.
     */
    public function fetchAccountBalance(string $accountId): array|int|null
    {
        $account = $this->getAccount($accountId);

        // Returns full account details or just balance depending on calling expectation
        if (isset($account['balance_minor'])) {
            return (int) $account['balance_minor'];
        }
        return 0;
    }

    /**
     * Execute a transfer to an account.
     */
    public function createTransfer(string $reference, string $accountId, int $amountMinor, string $currency = 'USD', string $demoMode = 'success'): Response
    {
        return Http::withToken($this->apiKey)
            ->withHeaders(['x-demo-mode' => $demoMode])
            ->post("{$this->baseUrl}/transfers", [
                'reference' => $reference,
                'account_id' => $accountId,
                'amount_minor' => $amountMinor,
                'currency' => $currency,
            ]);
    }

    /**
     * Get transfer details by reference
     */
    public function getTransfer(string $reference): array
    {
        $response = Http::withToken($this->apiKey)
            ->get("{$this->baseUrl}/transfers/{$reference}");

        return $response->json();
    }

}