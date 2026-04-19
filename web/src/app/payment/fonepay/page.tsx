'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { paymentApi } from '@/lib/api/payment.api';
import { formatCurrency } from '@/lib/utils';

function FonepayContent() {
  const params  = useSearchParams();
  const router  = useRouter();
  const prn     = params.get('prn') ?? '';
  const amount  = Number(params.get('amount') ?? 0);
  const orderId = params.get('orderId') ?? '';

  const [verifying, setVerifying] = useState(false);
  const [error, setError]         = useState('');

  // QR content: Fonepay encodes the PRN as the scannable payload
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&ecc=M&data=${encodeURIComponent(prn)}`;

  const handleVerify = async () => {
    setVerifying(true);
    setError('');
    try {
      await paymentApi.verify({ orderId, gateway: 'FONEPAY' });
      router.push(`/payment/success?orderId=${orderId}`);
    } catch {
      setError('Payment not confirmed yet. Please try again after scanning the QR.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">

        {/* Header */}
        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
            <rect width="48" height="48" rx="10" fill="#E8232A"/>
            <path d="M16 14h16a2 2 0 012 2v16a2 2 0 01-2 2H16a2 2 0 01-2-2V16a2 2 0 012-2zm0 2v16h16V16H16zm8 2a6 6 0 110 12A6 6 0 0124 18zm0 2a4 4 0 100 8 4 4 0 000-8zm0 2a2 2 0 110 4 2 2 0 010-4z" fill="white"/>
          </svg>
        </div>

        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white mb-1">Fonepay QR Payment</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Scan the QR code with your banking app to pay
        </p>

        {/* Amount */}
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 mb-5 text-left space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Amount</span>
            <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">PRN</span>
            <span className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all text-right max-w-[180px]">{prn}</span>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-5">
          <div className="p-3 bg-white rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageUrl}
              alt="Fonepay QR Code"
              width={220}
              height={220}
              className="rounded-lg"
            />
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
          Open your bank&apos;s app → QR Pay → scan this code → complete the transaction
        </p>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2 mb-4 text-left">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Verify button */}
        <button
          type="button"
          onClick={handleVerify}
          disabled={verifying}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #E8232A, #b91c1c)' }}
        >
          {verifying ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
          ) : (
            <><CheckCircle className="w-4 h-4" /> I&apos;ve Completed Payment</>
          )}
        </button>

        <button
          type="button"
          onClick={() => router.push(`/payment/failed?orderId=${orderId}&reason=User+canceled`)}
          className="w-full mt-3 py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function FonepayPage() {
  return (
    <Suspense>
      <FonepayContent />
    </Suspense>
  );
}
