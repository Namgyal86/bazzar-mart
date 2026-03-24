'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Clock, CheckCircle, AlertCircle, Banknote, X, Loader2, Building2, Hash } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { apiClient, getErrorMessage } from '@/lib/api/client';
import { toast } from '@/hooks/use-toast';

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-green-500/10 text-green-400 border border-green-500/20',
  PROCESSING: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  PENDING: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  FAILED: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const STATUS_ICON_CLS: Record<string, string> = {
  COMPLETED: 'bg-green-500/10 text-green-400',
  PROCESSING: 'bg-blue-500/10 text-blue-400',
  PENDING: 'bg-yellow-500/10 text-yellow-400',
  FAILED: 'bg-red-500/10 text-red-400',
};

function PayoutModal({ available, onClose, onSuccess }: { available: number; onClose: () => void; onSuccess: (payout: any) => void }) {
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const parsed = parseFloat(amount) || 0;
  const valid = parsed > 0 && parsed <= available && bankName.trim().length > 0 && accountNumber.trim().length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    try {
      const res: any = await apiClient.post('/api/v1/seller/payouts/request', {
        amount: parsed,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
      });
      const payout = res.data?.data ?? { id: `PAY-${Date.now()}`, amount: parsed, status: 'PENDING', date: new Date().toISOString(), method: bankName };
      toast({ title: 'Payout requested!', description: `Rs. ${parsed.toLocaleString()} will be processed in 3–5 days.` });
      onSuccess(payout);
    } catch (err) {
      toast({ title: 'Request failed', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#131929] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <h2 className="font-bold text-white">Request Payout</h2>
            <p className="text-xs text-gray-500 mt-0.5">Available: {formatCurrency(available)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Amount */}
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Amount (Rs.) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">Rs.</span>
              <input
                type="number"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min={1}
                max={available}
                step={0.01}
                className="w-full bg-[#0d1117] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
            {parsed > available && (
              <p className="text-xs text-red-400 mt-1">Amount exceeds available balance</p>
            )}
            <div className="flex gap-2 mt-2">
              {[25, 50, 75, 100].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setAmount(String(Math.floor(available * pct / 100)))}
                  className="flex-1 py-1 text-[10px] font-semibold text-gray-400 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Bank name */}
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Bank Name *</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="e.g. Nabil Bank, Prabhu Bank..."
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                className="w-full bg-[#0d1117] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Account number */}
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Account Number *</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="e.g. 0401234567890"
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                className="w-full bg-[#0d1117] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Summary */}
          {valid && (
            <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-2">Payout Summary</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Amount</span><span className="text-white font-semibold">{formatCurrency(parsed)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Bank</span><span className="text-white">{bankName}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Timeline</span><span className="text-yellow-400 text-xs">3–5 business days</span></div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-400 bg-white/5 hover:bg-white/10 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid || submitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : 'Request Payout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [balance, setBalance] = useState({ available: 0, pending: 0, total: 0 });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    apiClient.get('/api/v1/seller/payouts')
      .then((res: any) => {
        if (res.data?.data?.payouts) setPayouts(res.data.data.payouts);
        if (res.data?.data?.balance) setBalance(res.data.data.balance);
      })
      .catch(() => {});
  }, []);

  const handlePayoutSuccess = (newPayout: any) => {
    setPayouts(prev => [newPayout, ...prev]);
    setBalance(prev => ({ ...prev, available: prev.available - newPayout.amount, pending: prev.pending + newPayout.amount }));
    setShowModal(false);
  };

  return (
    <div>
      {showModal && (
        <PayoutModal
          available={balance.available}
          onClose={() => setShowModal(false)}
          onSuccess={handlePayoutSuccess}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Payouts</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your earnings and withdrawals</p>
        </div>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Available */}
        <div className="relative bg-[#131929] border border-green-500/10 rounded-2xl p-5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-green-600/5 opacity-40" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <div className="w-8 h-8 bg-green-500/10 rounded-xl flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-400" />
              </div>
              Available Balance
            </div>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(balance.available)}</p>
            <button
              onClick={() => setShowModal(true)}
              disabled={balance.available <= 0}
              className="mt-3 w-full py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors shadow-lg shadow-green-500/20"
            >
              Request Payout
            </button>
          </div>
        </div>

        {/* Pending */}
        <div className="relative bg-[#131929] border border-yellow-500/10 rounded-2xl p-5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-yellow-600/5 opacity-40" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <div className="w-8 h-8 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-400" />
              </div>
              Pending
            </div>
            <p className="text-2xl font-bold text-yellow-400">{formatCurrency(balance.pending)}</p>
            <p className="text-xs text-gray-600 mt-3">Processing in 3-5 business days</p>
          </div>
        </div>

        {/* Total */}
        <div className="relative bg-[#131929] border border-blue-500/10 rounded-2xl p-5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-600/5 opacity-40" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Banknote className="w-4 h-4 text-blue-400" />
              </div>
              Total Earnings
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(balance.total)}</p>
            <p className="text-xs text-gray-600 mt-3">All time earnings</p>
          </div>
        </div>
      </div>

      {/* Payout History */}
      <div className="bg-[#131929] border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h2 className="font-semibold text-white">Payout History</h2>
        </div>
        <div className="divide-y divide-white/5">
          {payouts.length === 0 ? (
            <div className="text-center py-16">
              <Banknote className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No payouts yet</p>
              <p className="text-xs text-gray-600 mt-1">Request your first payout when you have available balance</p>
            </div>
          ) : payouts.map((payout) => (
            <div key={payout.id || payout._id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${STATUS_ICON_CLS[payout.status] || 'bg-gray-500/10 text-gray-400'}`}>
                  {payout.status === 'COMPLETED' ? <CheckCircle className="w-4 h-4" /> :
                   payout.status === 'PROCESSING' ? <Clock className="w-4 h-4" /> :
                   <AlertCircle className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">{payout.id || payout._id}</p>
                  <p className="text-xs text-gray-600">{payout.method || payout.bankName} · {formatDate(payout.date || payout.createdAt)}</p>
                  {payout.reference && <p className="text-xs text-gray-600 font-mono">{payout.reference}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-400">+{formatCurrency(payout.amount)}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[payout.status]}`}>
                  {payout.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
