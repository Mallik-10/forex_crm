import React from 'react';
import { Link, usePage } from '@inertiajs/react';

export default function AuthenticatedLayout({ children }) {
    const { auth } = usePage().props;

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
                    <div className="flex items-center space-x-8">
                        <span className="font-bold text-xl text-blue-600">Forex CRM</span>
                        <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">Dashboard</Link>
                        <Link href="/transfers" className="text-gray-700 hover:text-blue-600 font-medium">Transfers</Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">{auth?.user?.email}</span>
                        <Link href="/logout" method="post" as="button" className="text-sm text-red-600 hover:underline">
                            Logout
                        </Link>
                    </div>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
    );
}