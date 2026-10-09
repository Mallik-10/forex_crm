
import React, { useEffect, useRef, useState } from 'react';
import { useForm, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';



function TransferFlow({ amount, active, result, snapshot, runId }) {
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (!active) {
            setStep(0);
            return;
        }

        setStep(0);

        const timers = [2000, 4000, 6000, 8000].map((delay, index) =>
            setTimeout(() => setStep(index + 1), delay)
        );

        return () => timers.forEach(clearTimeout);
    }, [active, runId]);

    const money = (minor, currency = 'USD') =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
        }).format((minor ?? 0) / 100);

    const amountMinor = Math.round(Number(amount || 0) * 100);
    const currency = snapshot?.currency || 'USD';

    const walletStart = snapshot?.walletAvailableMinor ?? 0;
    const reserveStart = snapshot?.walletReservedMinor ?? 0;
    const tradingStart = snapshot?.tradingBalanceMinor ?? 0;

    const confirmed = result === 'completed';
    const rejected = ['declined', 'failed'].includes(result);

    // These are display-only values. Laravel remains authoritative.
    const refunded = step >= 4 && rejected;
    const walletBalance =
        walletStart -
        (step >= 1 ? amountMinor : 0) +
        (refunded ? amountMinor : 0);

    const reservedBalance =
        reserveStart +
        (step >= 2 && step < 3 ? amountMinor : 0);

    const tradingBalance =
        tradingStart +
        (step >= 4 && confirmed ? amountMinor : 0);

    const inTransit = step >= 3 && !(step >= 4 && (confirmed || rejected));

    const stages = [
        {
            title: '1. Deduct from wallet',
            detail: 'The amount leaves available funds.',
            reached: step >= 1,
            amount: `−${money(amountMinor, currency)}`,
        },
        {
            title: '2. Add to reserved funds',
            detail: 'The amount is held while processing.',
            reached: step >= 2,
            amount: `+${money(amountMinor, currency)}`,
        },
        {
            title: '3. Deduct from reserve',
            detail: 'The amount leaves the reserve for transfer.',
            reached: step >= 3,
            amount: `−${money(amountMinor, currency)}`,
        },
        {
            title: '4. Add to trading account',
            detail: confirmed
                ? 'Provider confirmed the credit.'
                : rejected
                ? 'The transfer was rejected; funds return to the wallet.'
                : 'Waiting for provider confirmation before showing a credit.',
            reached: step >= 4 && (confirmed || rejected),
            amount: confirmed
                ? `+${money(amountMinor, currency)}`
                : rejected
                ? `↩ ${money(amountMinor, currency)} refunded`
                : 'Awaiting confirmation',
        },
    ];

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                        Live money movement
                    </h2>
                    <p className="text-sm text-gray-500">
                        Each stage shows how the transfer amount moves.
                    </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                    {money(amountMinor, currency)}
                </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Wallet available</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">
                        {money(walletBalance, currency)}
                    </p>
                    {step >= 1 && (
                        <p className="mt-2 text-sm font-semibold text-red-600">
                            −{money(amountMinor, currency)}
                        </p>
                    )}
                    {refunded && (
                        <p className="text-sm font-semibold text-green-600">
                            +{money(amountMinor, currency)} returned
                        </p>
                    )}
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Reserved funds</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">
                        {money(reservedBalance, currency)}
                    </p>
                    {step >= 2 && step < 3 && (
                        <p className="mt-2 text-sm font-semibold text-green-600">
                            +{money(amountMinor, currency)}
                        </p>
                    )}
                    {step >= 3 && (
                        <p className="mt-2 text-sm font-semibold text-red-600">
                            −{money(amountMinor, currency)}
                        </p>
                    )}
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Trading balance</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">
                        {money(tradingBalance, currency)}
                    </p>
                    {step >= 4 && confirmed && (
                        <p className="mt-2 text-sm font-semibold text-green-600">
                            +{money(amountMinor, currency)} credited
                        </p>
                    )}
                    {inTransit && (
                        <p className="mt-2 text-sm font-semibold text-amber-600">
                            Awaiting credit
                        </p>
                    )}
                </div>
            </div>

            {inTransit && (
                <div className="my-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                    <p className="text-sm text-amber-800">
                        Amount in transit
                    </p>
                    <p className="text-2xl font-bold text-amber-700">
                        {money(amountMinor, currency)}
                    </p>
                    <p className="text-xs text-amber-700">
                        This is a visual state, not an additional account balance.
                    </p>
                </div>
            )}

            <div className="mt-5 space-y-3">
                {stages.map((stage, index) => {
                    const current = step === index + 1;
                    const done = stage.reached;

                    return (
                        <div
                            key={stage.title}
                            className={`rounded-lg border p-3 transition-colors duration-300 ${
                                current
                                    ? 'border-blue-400 bg-blue-50'
                                    : done
                                    ? 'border-green-200 bg-green-50'
                                    : 'border-gray-200 bg-white'
                            }`}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold text-gray-800">
                                    {stage.title}
                                </p>
                                <span className="text-sm font-bold text-gray-700">
                                    {stage.amount}
                                </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">
                                {stage.detail}
                            </p>
                        </div>
                    );
                })}
            </div>

            {active && step < 4 && (
                <p className="mt-4 text-sm text-blue-700">
                    Animating stage {step + 1} of 4 · Each stage takes 2 seconds.
                </p>
            )}

            {step >= 4 && confirmed && (
                <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800">
                    Transfer confirmed. The final trading balance includes the credit.
                </p>
            )}

            {step >= 4 && rejected && (
                <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">
                    Transfer {result}. The visual shows the amount returning to the wallet.
                </p>
            )}

            {step >= 4 && !confirmed && !rejected && (
                <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800">
                    Transfer status: {result || 'pending'}. No trading-account credit is shown until success is confirmed.
                </p>
            )}
        </div>
    );
}



export default function Index({
    transfers,
    filters = {},
    tradingAccounts = [],
    wallet = null,
}) {
    const { flash, errors: pageErrors } = usePage().props;

    const { data, setData, post, processing, reset, errors } = useForm({
        trading_account_id: tradingAccounts[0]
            ? String(tradingAccounts[0].id)
            : '',
        amount: '',
        demo_mode: 'success',
    });

    const [flowSnapshot, setFlowSnapshot] = useState(null);
    const [flowRunId, setFlowRunId] = useState(0);
    const [flowActive, setFlowActive] = useState(false);
    const [flowAmount, setFlowAmount] = useState('');
    const [flowResult, setFlowResult] = useState(null);
    const [checkingIds, setCheckingIds] = useState([]);
    const timerRef = useRef(new Map());
    const autoCheckedIds = useRef(new Set());

    const transferRows = transfers?.data ?? [];
    const paginationLinks = transfers?.links ?? [];

    const selectedAccount = tradingAccounts.find(
        (account) => String(account.id) === String(data.trading_account_id)
    );

    const formatMoney = (minorAmount, currency = 'USD') => {
        if (minorAmount === null || minorAmount === undefined) {
            return 'N/A';
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
        }).format(minorAmount / 100);
    };

    const isChecking = (id) => checkingIds.includes(id);

    const checkStatus = (transferId, automatic = false) => {
        // Stop the scheduled check if the user checks manually.
        const timer = timerRef.current.get(transferId);

        if (timer) {
            clearTimeout(timer);
            timerRef.current.delete(transferId);
        }

        if (isChecking(transferId)) {
            return;
        }

        if (automatic) {
            autoCheckedIds.current.add(transferId);
        }

        setCheckingIds((current) => [...current, transferId]);

        router.post(
            `/transfers/${transferId}/reconcile`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setCheckingIds((current) =>
                        current.filter((id) => id !== transferId)
                    );
                },
            }
        );
    };

    // Automatically check each pending transfer once, 10 seconds
    // after it appears on the page. Manual checks can happen earlier.
    useEffect(() => {
        for (const transfer of transferRows) {
            if (
                transfer.status !== 'pending' ||
                autoCheckedIds.current.has(transfer.id) ||
                timerRef.current.has(transfer.id)
            ) {
                continue;
            }

            const timer = setTimeout(() => {
                timerRef.current.delete(transfer.id);

                if (!autoCheckedIds.current.has(transfer.id)) {
                    checkStatus(transfer.id, true);
                }
            }, 10000);

            timerRef.current.set(transfer.id, timer);
        }

        return () => {
            for (const timer of timerRef.current.values()) {
                clearTimeout(timer);
            }

            timerRef.current.clear();
        };
    }, [transfers?.data]);

    const handleSubmit = (event) => {
        
        event.preventDefault();

        
const handleSubmit = (event) => {
    event.preventDefault();

    const amount = Number(data.amount);
    const account = tradingAccounts.find(
        (item) => String(item.id) === String(data.trading_account_id)
    );

    if (!account || !Number.isFinite(amount) || amount <= 0) {
        return;
    }

    setFlowSnapshot({
        walletAvailableMinor: Number(wallet?.available_balance_minor ?? 0),
        walletReservedMinor: Number(wallet?.reserved_balance_minor ?? 0),
        tradingBalanceMinor: Number(
            account.balance_minor ?? account.provider_balance_minor ?? 0
        ),
        currency: account.currency || wallet?.currency || 'USD',
    });

    setFlowAmount(amount);
    setFlowResult('processing');
    setFlowActive(true);
    setFlowRunId((id) => id + 1);

    post('/transfers', {
        preserveScroll: true,

        onSuccess: (page) => {
            const latestTransfer = page.props.transfers?.data?.[0];

            setFlowResult(latestTransfer?.status ?? 'pending');
            reset('amount');
        },

        onError: () => {
            setFlowResult('failed');
        },
    });
};


        setFlowAmount(Number(data.amount));
        setFlowResult('processing');
        setFlowActive(true);
        setFlowRunId(id => id + 1);


        post('/transfers', {
            preserveScroll: true,
            onSuccess: (page) => {
                const latestTransfer = page.props.transfers?.data?.[0];
                setFlowResult(latestTransfer?.status ?? 'pending');
                reset('amount');
            },
            onError: () => {
                setFlowResult('failed');
            },
        });
    };

    const handleFilter = (status) => {
        router.get(
            '/transfers',
            status ? { status } : {},
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            }
        );
    };

    const goToPage = (url) => {
        if (url) {
            router.visit(url, { preserveScroll: true });
        }
    };

    const statusStyle = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-amber-100 text-amber-800';
            case 'declined':
            case 'failed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const statusLabel = (status) => {
        switch (status) {
            case 'completed':
                return 'Successful';
            case 'declined':
                return 'Declined';
            case 'failed':
                return 'Failed';
            case 'pending':
                return 'Pending';
            default:
                return status;
        }
    };

    return (
        <AuthenticatedLayout>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-800">
                    Wallet to Trading Account Transfer
                </h1>

                {flash?.success && (
                    <div className="rounded-md bg-green-100 p-4 text-green-800">
                        {flash.success}
                    </div>
                )}

                {flash?.info && (
                    <div className="rounded-md bg-blue-100 p-4 text-blue-800">
                        {flash.info}
                    </div>
                )}

                {pageErrors?.amount && (
                    <div className="rounded-md bg-red-100 p-4 text-red-800">
                        {pageErrors.amount}
                    </div>
                )}

                <TransferFlow
                    key={flowRunId}
                    runId={flowRunId}
                    amount={flowAmount}
                    active={flowActive}
                    result={flowResult}
                    snapshot={flowSnapshot}
                />

                {/* Transfer form */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
                    <form
                        onSubmit={handleSubmit}
                        className="grid grid-cols-1 items-end gap-4 md:grid-cols-4"
                    >
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Trading Account
                            </label>

                            <select
                                value={data.trading_account_id}
                                onChange={(event) =>
                                    setData(
                                        'trading_account_id',
                                        event.target.value
                                    )
                                }
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                                required
                            >
                                <option value="" disabled>
                                    Select an account
                                </option>

                                {tradingAccounts.map((account) => (
                                    <option
                                        key={account.id}
                                        value={String(account.id)}
                                    >
                                        {account.account_id} ({account.currency})
                                    </option>
                                ))}
                            </select>

                            {errors.trading_account_id && (
                                <p className="mt-1 text-xs text-red-600">
                                    {errors.trading_account_id}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Amount (USD)
                            </label>

                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={data.amount}
                                onChange={(event) =>
                                    setData('amount', event.target.value)
                                }
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                                placeholder="0.00"
                                required
                            />

                            {errors.amount && (
                                <p className="mt-1 text-xs text-red-600">
                                    {errors.amount}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Simulation Scenario
                            </label>

                            <select
                                value={data.demo_mode}
                                onChange={(event) =>
                                    setData('demo_mode', event.target.value)
                                }
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            >
                                <option value="success">
                                    Success
                                </option>
                                <option value="declined">
                                    Declined
                                </option>
                                <option value="timeout_after_success">
                                    Timeout after provider success
                                </option>
                            </select>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={processing || tradingAccounts.length === 0}
                                className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {processing ? 'Processing...' : 'Execute Transfer'}
                            </button>
                        </div>
                    </form>

                    {selectedAccount && (
                        <div className="mt-4 rounded-md border border-gray-200 p-4">
                            <p className="text-sm text-gray-500">
                                Selected Trading Account
                            </p>
                            <p className="text-xl font-bold text-gray-800">
                                {formatMoney(
                                    selectedAccount.balance_minor,
                                    selectedAccount.currency
                                )}
                            </p>
                            <p className="text-sm text-gray-500">
                                Account ID: {selectedAccount.account_id}
                            </p>
                        </div>
                    )}
                </div>

                {/* Transfer history */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
                    <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">
                                Transfer History
                            </h2>

                            {transfers?.total !== undefined && (
                                <p className="text-sm text-gray-500">
                                    {transfers.total} total transactions
                                    {transfers.total > 0 &&
                                        ` · Showing ${transfers.from}–${transfers.to}`}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {[
                                { label: 'All', value: '' },
                                { label: 'Successful', value: 'completed' },
                                { label: 'Pending', value: 'pending' },
                                { label: 'Declined', value: 'declined' },
                                { label: 'Failed', value: 'failed' },
                            ].map((filter) => (
                                <button
                                    key={filter.label}
                                    type="button"
                                    onClick={() => handleFilter(filter.value)}
                                    className={`rounded px-3 py-1 text-sm ${
                                        (filters.status ?? '') === filter.value
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b text-sm text-gray-600">
                                    <th className="py-3 pr-4">Reference</th>
                                    <th className="py-3 pr-4">Account</th>
                                    <th className="py-3 pr-4">Amount</th>
                                    <th className="py-3 pr-4">Status</th>
                                    <th className="py-3 pr-4">Date</th>
                                    <th className="py-3">Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {transferRows.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan="6"
                                            className="py-8 text-center text-gray-500"
                                        >
                                            No transactions found.
                                        </td>
                                    </tr>
                                )}

                                {transferRows.map((transfer) => (
                                    <tr
                                        key={transfer.id}
                                        className="border-b text-sm"
                                    >
                                        <td className="py-3 pr-4 font-mono">
                                            {transfer.reference}
                                        </td>

                                        <td className="py-3 pr-4">
                                            {transfer.trading_account?.account_id ?? '—'}
                                        </td>

                                        <td className="py-3 pr-4">
                                            {formatMoney(
                                                transfer.amount_minor,
                                                transfer.currency ?? 'USD'
                                            )}
                                        </td>

                                        <td className="py-3 pr-4">
                                            <span
                                                className={`rounded px-2 py-1 text-xs ${statusStyle(transfer.status)}`}
                                            >
                                                {statusLabel(transfer.status)}
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap py-3 pr-4">
                                            {new Date(
                                                transfer.created_at
                                            ).toLocaleString()}
                                        </td>

                                        <td className="py-3">
                                            {transfer.status === 'pending' ? (
                                                <button
                                                    type="button"
                                                    disabled={isChecking(transfer.id)}
                                                    onClick={() =>
                                                        checkStatus(transfer.id)
                                                    }
                                                    className="whitespace-nowrap rounded bg-amber-500 px-3 py-1 text-xs text-white hover:bg-amber-600 disabled:opacity-50"
                                                >
                                                    {isChecking(transfer.id)
                                                        ? 'Checking...'
                                                        : 'Check Status'}
                                                </button>
                                            ) : (
                                                <span className="text-gray-400">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination: 10 transactions per page */}
                    {paginationLinks.length > 0 && (
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                            <p className="text-sm text-gray-500">
                                Page {transfers.current_page} of {transfers.last_page}
                            </p>

                            <div className="flex flex-wrap gap-1">
                                {paginationLinks.map((link, index) => {
                                    const label = link.label
                                        .replace('&laquo;', '«')
                                        .replace('&raquo;', '»');

                                    return (
                                        <button
                                            key={`${link.label}-${index}`}
                                            type="button"
                                            disabled={!link.url || link.active}
                                            onClick={() => goToPage(link.url)}
                                            className={`rounded border px-3 py-1 text-sm ${
                                                link.active
                                                    ? 'border-blue-600 bg-blue-600 text-white'
                                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                                            } disabled:cursor-not-allowed disabled:opacity-50`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
