'use client';

import { XCircle, RefreshCw, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function PaymentFailedPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Payment Failed
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Your payment was not completed. Your cart has been preserved — you can try again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/checkout"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Link>
          <Link
            href="/account/orders"
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold rounded-xl transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            My Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
