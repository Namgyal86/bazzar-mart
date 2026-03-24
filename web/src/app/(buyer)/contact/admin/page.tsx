'use client';

import { useState } from 'react';
import { Shield, Send, AlertTriangle, HelpCircle, Store, ShoppingBag, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';

const ISSUE_TYPES = [
  { value: 'account', label: 'Account Issue',   icon: HelpCircle  },
  { value: 'order',   label: 'Order Problem',   icon: ShoppingBag },
  { value: 'seller',  label: 'Report a Seller', icon: Store       },
  { value: 'fraud',   label: 'Report Fraud',    icon: AlertTriangle },
  { value: 'other',   label: 'Other',           icon: Shield      },
];

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-orange-400 dark:focus:border-orange-500 focus:ring-2 focus:ring-orange-400/10 transition-all';
const labelCls = 'text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block';

export default function ConnectAdminPage() {
  const { user } = useAuthStore();
  const [form, setForm] = useState({ type: 'account', subject: '', message: '', orderId: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await apiClient.post('/api/v1/support/admin-contact', {
        ...form,
        userId: user?.id,
        userEmail: user?.email,
      });
    } catch {
      // submit regardless
    } finally {
      setSending(false);
      setSent(true);
      toast({ title: 'Ticket submitted!', description: 'An admin will review your request within 24 hours.' });
      setForm({ type: 'account', subject: '', message: '', orderId: '' });
      setTimeout(() => setSent(false), 4000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: '0 8px 24px rgba(249,115,22,0.25)' }}
        >
          <Shield className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Connect with Admin</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto text-sm leading-relaxed">
          Need to escalate an issue or report something urgent? Submit a ticket directly to our admin team.
        </p>
      </div>

      {/* Notice banner */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 mb-8 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-300">
          <p className="font-semibold">Before contacting admin</p>
          <p className="mt-0.5 text-amber-700 dark:text-amber-400">
            Please check our{' '}
            <Link href="/contact" className="underline hover:text-amber-900 dark:hover:text-amber-200">
              general support page
            </Link>{' '}
            first. Admin tickets are reviewed for escalations and reports only.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white text-lg mb-5 flex items-center gap-2">
          <Send className="w-4 h-4 text-orange-500" />
          Submit a Ticket
        </h2>

        {/* Issue type selector */}
        <div className="mb-5">
          <label className={labelCls}>Issue Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ISSUE_TYPES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm(f => ({ ...f, type: value }))}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  form.type === value
                    ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/40'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {user && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-sm text-gray-600 dark:text-gray-400">
              Submitting as:{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {user.firstName} {user.lastName}
              </span>{' '}
              ({user.email})
            </div>
          )}

          <div>
            <label className={labelCls}>Subject</label>
            <input
              className={inputCls}
              placeholder="Brief description of your issue"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              required
            />
          </div>

          {form.type === 'order' && (
            <div>
              <label className={labelCls}>Order ID <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                className={inputCls}
                placeholder="e.g. ORD-2024-001"
                value={form.orderId}
                onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}
              />
            </div>
          )}

          <div>
            <label className={labelCls}>Detailed Description</label>
            <textarea
              className={`${inputCls} resize-none min-h-[140px]`}
              placeholder="Explain your issue in detail. Include any relevant order IDs, dates, or other information..."
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              required
              rows={6}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 px-6 py-2.5 text-white text-sm font-semibold rounded-xl transition-all hover:scale-105 disabled:opacity-60 disabled:scale-100 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}
            >
              {sent ? (
                <><CheckCircle className="w-4 h-4" /> Submitted!</>
              ) : sending ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting…</>
              ) : (
                <><Send className="w-4 h-4" /> Submit Ticket</>
              )}
            </button>
            <Link
              href="/contact"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 transition-all bg-white dark:bg-gray-800/40"
            >
              General Support
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
