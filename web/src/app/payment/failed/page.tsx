'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { XCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';

function FailedContent() {
  const params  = useSearchParams();
  const orderId = params.get('orderId');
  const reason  = params.get('reason');

  const reasonLabel: Record<string, string> = {
    missing_params:     'Missing payment parameters.',
    not_found:          'Payment record not found.',
    invalid_response:   'Invalid response from payment gateway.',
    invalid_signature:  'Payment signature verification failed.',
    verification_error: 'Could not verify payment with gateway.',
    missing_data:       'No payment data received.',
    'User canceled':    'Payment was cancelled.',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Payment Failed</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          {reason ? (reasonLabel[reason] ?? decodeURIComponent(reason)) : 'Your payment could not be completed.'}
        </p>

        <div className="flex flex-col gap-3">
          {orderId && (
            <Link
              href="/checkout"
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Link>
          )}
          <Link
            href="/account/orders"
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            My Orders
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense>
      <FailedContent />
    </Suspense>
  );
}
