'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import { Suspense, useEffect } from 'react';
import { useCartStore } from '@/store/cart.store';

function SuccessContent() {
  const params   = useSearchParams();
  const orderId  = params.get('orderId');
  const txn      = params.get('txn');
  const clearCart = useCartStore(s => s.clearCart);

  useEffect(() => {
    clearCart();
    sessionStorage.removeItem('pendingOrderId');
  }, [clearCart]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Payment Successful!</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Your order has been placed and payment confirmed.
        </p>

        {txn && (
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 mb-6 text-left">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Transaction ID</p>
            <p className="text-sm font-mono font-semibold text-gray-800 dark:text-white break-all">{txn}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {orderId ? (
            <Link
              href={`/account/orders/${orderId}`}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
            >
              <Package className="w-4 h-4" />
              View Order
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/account/orders"
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
            >
              <Package className="w-4 h-4" />
              My Orders
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <Link
            href="/"
            className="py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
