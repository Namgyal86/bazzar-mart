'use client';

import { useState, useEffect } from 'react';
import { Gift, Copy, CheckCircle, Users, Wallet, Clock, ArrowRight, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useSiteSettingsStore } from '@/store/site-settings.store';

interface Referral {
  _id: string;
  refereeName: string;
  status: 'PENDING' | 'REWARDED' | 'REVOKED';
  rewardAmount: number;
  createdAt: string;
}

interface WalletData {
  balance: number;
  totalEarned: number;
  referralCode: string;
  referrals: Referral[];
}

const STATUS_STYLES: Record<string, string> = {
  REWARDED: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400',
  PENDING:  'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400',
  REVOKED:  'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400',
};

export default function ReferralPage() {
  const { user } = useAuthStore();
  const { settings } = useSiteSettingsStore();
  const siteName = settings.siteName || 'Bazzar';

  const HOW_IT_WORKS = [
    { step: '1', title: 'Share your code', desc: 'Send your unique referral code to friends & family.' },
    { step: '2', title: 'Friend signs up', desc: `They register on ${siteName} using your referral code.` },
    { step: '3', title: 'Both earn rewards', desc: 'You both get Rs. 200 credit after their first order (min Rs. 1000).' },
    { step: '4', title: 'Use at checkout', desc: 'Apply wallet balance at checkout — up to Rs. 200 per order.' },
  ];
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiClient.get('/api/v1/referrals/my')
      .then((res: any) => {
        const d = res.data?.data;
        if (d) setWallet(d);
      })
      .catch(() => {
        // Use user referral code from auth store as fallback
        setWallet({
          balance: 0,
          totalEarned: 0,
          referralCode: user?.referralCode ?? '',
          referrals: [],
        });
      })
      .finally(() => setLoading(false));
  }, [user]);

  const referralCode = wallet?.referralCode ?? user?.referralCode ?? '—';

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied!', description: 'Referral code copied to clipboard.' });
  };

  const shareCode = () => {
    if (navigator.share) {
      navigator.share({
        title: `Join ${siteName}!`,
        text: `Use my referral code ${referralCode} on ${siteName} and get Rs. 200 off your first order!`,
      }).catch(() => {});
    } else {
      copyCode();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 animate-pulse">
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/3 mb-3" />
            <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Referral Wallet</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Earn rewards by inviting friends to {siteName}</p>
      </div>

      {/* Wallet balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))', boxShadow: '0 8px 32px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.3)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 -translate-y-8 translate-x-8" style={{ background: 'radial-gradient(circle, white, transparent)' }} />
          <div className="flex items-center gap-2 mb-3 relative">
            <Wallet className="w-5 h-5 opacity-80" />
            <span className="text-sm font-medium opacity-80">Wallet Balance</span>
          </div>
          <p className="text-3xl font-black relative">{formatCurrency(wallet?.balance ?? 0)}</p>
          <p className="text-xs opacity-70 mt-1 relative">Usable at checkout (max Rs. 200/order)</p>
        </div>

        <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)', boxShadow: '0 8px 32px rgba(34,197,94,0.25)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 -translate-y-8 translate-x-8" style={{ background: 'radial-gradient(circle, white, transparent)' }} />
          <div className="flex items-center gap-2 mb-3 relative">
            <Users className="w-5 h-5 opacity-80" />
            <span className="text-sm font-medium opacity-80">Total Earned</span>
          </div>
          <p className="text-3xl font-black relative">{formatCurrency(wallet?.totalEarned ?? 0)}</p>
          <p className="text-xs opacity-70 mt-1 relative">From {wallet?.referrals?.filter(r => r.status === 'REWARDED').length ?? 0} successful referrals</p>
        </div>
      </div>

      {/* Referral code card */}
      <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))', boxShadow: '0 4px 12px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.3)' }}>
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">Your Referral Code</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Share this code — both you and your friend earn <strong className="text-orange-600 dark:text-orange-400">Rs. 200</strong> after their first order!
            </p>

            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-xl px-6 py-3 font-mono font-bold text-orange-600 dark:text-orange-400 text-xl tracking-widest shadow-sm">
                {referralCode}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-semibold rounded-xl transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))', boxShadow: '0 4px 12px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.3)' }}
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={shareCode}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-all hover:bg-orange-100 dark:hover:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-5">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {HOW_IT_WORKS.map((step, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 text-white"
                style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}>
                {step.step}
              </div>
              <div>
                <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{step.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          Credits expire 90 days after being issued. Max Rs. 200 credit per order.
        </div>
      </div>

      {/* Referral history */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-orange-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Referral History</h2>
          {(wallet?.referrals?.length ?? 0) > 0 && (
            <span className="ml-auto text-xs text-gray-400">{wallet!.referrals.length} referral{wallet!.referrals.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {(wallet?.referrals?.length ?? 0) === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 text-orange-300 dark:text-orange-700" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No referrals yet</p>
            <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">Share your code and start earning!</p>
            <button
              onClick={shareCode}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-white text-sm font-semibold rounded-xl"
              style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
            >
              <Share2 className="w-4 h-4" /> Share Your Code
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {wallet!.referrals.map((ref) => (
              <div key={ref._id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}>
                  {ref.refereeName[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{ref.refereeName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(ref.createdAt)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${ref.status === 'REWARDED' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                    {ref.status === 'REWARDED' ? `+${formatCurrency(ref.rewardAmount)}` : '—'}
                  </p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLES[ref.status]}`}>
                    {ref.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
