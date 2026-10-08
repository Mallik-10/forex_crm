import React from 'react';
import { useForm, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function Index({ transfers, filters }) {
    const { flash } = usePage().props;
    const { data, setData, post, processing, reset, errors } = useForm({
        trading_account_id: '1',
        amount: '',
        demo_mode: 'success',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/transfers', {
            onSuccess: () => reset('amount'),
        });
    };

    const handleFilter = (status) => {
        router.get('/transfers', status ? { status } : {}, { preserveState: true });
    };

    return (
        <AuthenticatedLayout>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-800">Wallet to Trading Account Transfer</h1>

                {flash?.success && <div className="p-4 bg-green-100 text-green-700 rounded-md">{flash.success}</div>}
                {flash?.info && <div className="p-4 bg-blue-100 text-blue-700 rounded-md">{flash.info}</div>}

                {/* Transfer Form */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Amount (USD)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={data.amount}
                                onChange={(e) => setData('amount', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                                placeholder="0.00"
                                required
                            />
                            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Simulation Scenario</label>
                            <select
                                value={data.demo_mode}
                                onChange={(e) => setData('demo_mode', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2"
                            >
                                <option value="success">Success (Immediate 200)</option>
                                <option value="declined">Declined (Immediate 400)</option>
                                <option value="timeout_after_success">Timeout / Network Drop (504)</option>
                            </select>
                        </div>
                        <div>
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {processing ? 'Processing...' : 'Execute Transfer'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Filter and Transfers Table */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Transfer History</h2>
                        <div className="space-x-2">
                            <button onClick={() => handleFilter('')} className="px-3 py-1 text-sm bg-gray-200 rounded">All</button>
                            <button onClick={() => handleFilter('completed')} className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded">Completed</button>
                            <button onClick={() => handleFilter('pending')} className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded">Pending</button>
                            <button onClick={() => handleFilter('declined')} className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded">Declined</button>
                        </div>
                    </div>

                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b text-sm text-gray-600">
                                <th className="py-2">Reference</th>
                                <th className="py-2">Amount</th>
                                <th className="py-2">Status</th>
                                <th className="py-2">Date</th>
                                <th className="py-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transfers.data.map((t) => (
                                <tr key={t.id} className="border-b text-sm">
                                    <td className="py-3 font-mono">{t.reference}</td>
                                    <td className="py-3">${(t.amount_minor / 100).toFixed(2)}</td>
                                    <td className="py-3">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            t.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            t.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td className="py-3">{new Date(t.created_at).toLocaleString()}</td>
                                    <td className="py-3">
                                        {t.status === 'pending' && (
                                            <button
                                                onClick={() => router.post(`/transfers/${t.id}/reconcile`)}
                                                className="px-2 py-1 bg-amber-500 text-white text-xs rounded hover:bg-amber-600"
                                            >
                                                Reconcile
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}