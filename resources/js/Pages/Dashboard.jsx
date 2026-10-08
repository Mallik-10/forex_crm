import React from 'react';
import AuthenticatedLayout from '../Layouts/AuthenticatedLayout';

export default function Dashboard({ wallet, tradingAccount, recentTransfers }) {
    const formatCurrency = (minorAmount, currency) => {
        if (minorAmount === null || minorAmount === undefined) return 'N/A';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minorAmount / 100);
    };

    return (
        <AuthenticatedLayout>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-800">Account Overview</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase">Available Wallet Balance</h3>
                        <p className="text-3xl font-bold text-green-600 mt-2">
                            {formatCurrency(wallet.available_balance_minor, wallet.currency)}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase">Reserved Wallet Balance</h3>
                        <p className="text-3xl font-bold text-amber-600 mt-2">
                            {formatCurrency(wallet.reserved_balance_minor, wallet.currency)}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase">Trading Account Provider Balance</h3>
                        <p className="text-3xl font-bold text-blue-600 mt-2">
                            {formatCurrency(tradingAccount?.provider_balance_minor, tradingAccount?.currency)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">ID: {tradingAccount?.account_id || 'None'}</p>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}