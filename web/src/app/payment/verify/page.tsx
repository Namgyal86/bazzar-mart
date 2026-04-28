'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { paymentApi } from '@/lib/api/payment.api';
import { useCartStore } from '@/store/cart.store';

type VerifyState = 'verifying' | 'success' | 'failed';

function PaymentVerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<VerifyState>('verifying');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const clearCart = useCartStore(s => s.clearCart);

  useEffect(() => {
    const verify = async () => {
      const pidx            = searchParams.get('pidx');
      const status          = searchParams.get('status');
      const purchaseOrderId = searchParams.get('purchase_order_id');
      const esewaData       = searchParams.get('data');
      const gateway         = searchParams.get('gateway') || (pidx ? 'khalti' : esewaData ? 'esewa' : '');

      try {
        if (gateway === 'khalti' || pidx) {
          if (status === 'User canceled') {
            setState('failed');
            setMessage('Payment was cancelled.');
            return;
          }
          const res = await paymentApi.verify({ pidx, orderId: purchaseOrderId, gateway: 'KHALTI' }) as any;
          const payment = res.data?.data;
          if (payment?.status === 'SUCCESS') {
            clearCart();
            sessionStorage.removeItem('pendingOrderId');
            setState('success');
            setOrderId(payment.orderId || purchaseOrderId || '');
          } else {
            setState('failed');
            setMessage('Payment verification failed. Please contact support.');
          }
        } else if (gateway === 'esewa' || esewaData) {
          const decoded = JSON.parse(atob(esewaData || ''));
          const res = await paymentApi.verify({ esewaData: decoded, gateway: 'ESEWA' }) as any;
          const payment = res.data?.data;
          if (payment?.status === 'SUCCESS') {
            clearCart();
            sessionStorage.removeItem('pendingOrderId');
            setState('success');
            setOrderId(payment.orderId || '');
          } else {
            setState('failed');
            setMessage('eSewa payment verification failed.');
          }
        } else {
          setState('failed');
          setMessage('Unknown payment gateway or missing parameters.');
        }
      } catch (err: any) {
        setState('failed');
        setMessage(err?.response?.data?.error || 'Could not verify payment. Please contact support.');
      }
    };

    verify();
  }, [searchParams]);

  useEffect(() => {
    if (state === 'success') {
      const timer = setTimeout(() => {
        router.push(orderId ? `/account/orders/${orderId}` : '/account/orders');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [state, orderId, router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {state === 'verifying' && (
          <>
            <div className="w-20 h-20 bg-orange-50 dark:bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verifying Payment</h1>
            <p className="text-gray-500 dark:text-gray-400">Please wait while we confirm your payment…</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-1">Your order has been confirmed.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">Redirecting to your orders in a moment…</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={orderId ? `/account/orders/${orderId}` : '/account/orders'}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                View Order
              </Link>
              <Link
                href="/products"
                className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold rounded-xl transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </>
        )}

        {state === 'failed' && (
          <>
            <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Failed</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              {message || 'Something went wrong with your payment.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/checkout"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
              >
                Try Again
              </Link>
              <Link
                href="/account/orders"
                className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold rounded-xl transition-colors"
              >
                My Orders
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    }>
      <PaymentVerifyContent />
    </Suspense>
  );
}
