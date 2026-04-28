'use client';

import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Clock, Store, Star, TrendingUp, Loader2 } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { sellerApi } from '@/lib/api/seller.api';
import { toast } from '@/hooks/use-toast';

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: any }> = {
  ACTIVE:    { bg: 'bg-green-500/10',  text: 'text-green-400',  icon: CheckCircle },
  APPROVED:  { bg: 'bg-green-500/10',  text: 'text-green-400',  icon: CheckCircle },
  PENDING:   { bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: Clock },
  SUSPENDED: { bg: 'bg-red-500/10',    text: 'text-red-400',    icon: XCircle },
};

const STORE_GRADIENTS = [
  'from-brand-500 to-red-500', 'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500', 'from-green-500 to-teal-500',
];

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [acting, setActing] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<{ id: string; storeName: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  useEffect(() => {
    sellerApi.listSellers()
      .then(res => { setSellers(Array.isArray(res.data.data) ? res.data.data : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id: string) => {
    setActing(id);
    try {
      await sellerApi.approveSeller(id);
    } catch {}
    setSellers(prev => prev.map(s => s._id === id ? { ...s, status: 'ACTIVE' } : s));
    toast({ title: 'Seller approved!' });
    setActing(null);
  };

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    const { id } = suspendTarget;
    const reason = suspendReason.trim() || 'Policy violation';
    setActing(id);
    try {
      await sellerApi.suspendSeller(id, reason);
    } catch {}
    setSellers(prev => prev.map(s => s._id === id ? { ...s, status: 'SUSPENDED' } : s));
    toast({ title: 'Seller suspended', variant: 'destructive' });
    setActing(null);
    setSuspendTarget(null);
    setSuspendReason('');
  };

  const filtered = sellers.filter(s => {
    const effectiveFilter = statusFilter === 'APPROVED' ? ['ACTIVE', 'APPROVED'] : [statusFilter];
    if (statusFilter !== 'ALL' && !effectiveFilter.includes(s.status)) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.storeName?.toLowerCase().includes(q) || s.userId?.email?.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = [
    { label: 'Approved', value: sellers.filter(s => s.status === 'ACTIVE' || s.status === 'APPROVED').length, gradient: 'from-green-500 to-emerald-500' },
    { label: 'Pending Review', value: sellers.filter(s => s.status === 'PENDING').length, gradient: 'from-yellow-500 to-orange-500' },
    { label: 'Suspended', value: sellers.filter(s => s.status === 'SUSPENDED').length, gradient: 'from-red-500 to-rose-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Suspend confirmation modal */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a2035] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-white mb-1">Suspend Seller</h3>
            <p className="text-xs text-gray-400 mb-4">Suspending <span className="font-semibold text-white">{suspendTarget.storeName}</span> will hide their products and prevent new orders.</p>
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Reason</label>
              <input
                className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 transition-colors"
                placeholder="e.g. Fake products, policy violation..."
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setSuspendTarget(null); setSuspendReason(''); }} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-400 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleSuspend} disabled={acting === suspendTarget.id} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors disabled:opacity-50">
                {acting === suspendTarget.id ? 'Suspending…' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Sellers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{sellers.length} registered stores</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-[#1a2035] border border-white/5 rounded-2xl p-4 relative overflow-hidden group hover:border-brand-500/20 transition-all">
            <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
            <p className="text-3xl font-black text-white relative">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1 relative">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            placeholder="Search sellers..."
            className="w-full bg-[#1a2035] border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 transition-colors"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {['ALL', 'PENDING', 'APPROVED', 'SUSPENDED'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === s
                  ? 'text-white shadow-lg'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
              style={statusFilter === s ? { backgroundColor: 'var(--ap)' } : {}}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Seller Cards */}
      <div className="space-y-3">
        {filtered.map((seller, i) => {
          const cfg = STATUS_CONFIG[seller.status] || STATUS_CONFIG.PENDING;
          const StatusIcon = cfg.icon;
          const grad = STORE_GRADIENTS[i % STORE_GRADIENTS.length];
          return (
            <div key={seller._id} className="bg-[#1a2035] border border-white/5 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-brand-500/20 transition-all group">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-12 h-12 bg-gradient-to-br ${grad} rounded-2xl flex items-center justify-center shadow-lg shrink-0`}>
                  <Store className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-white">{seller.storeName}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                      <StatusIcon className="w-2.5 h-2.5" />{seller.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{seller.userId?.email} · Joined {formatDate(seller.createdAt)}</p>
                  <div className="flex items-center gap-4 mt-1.5">
                    {seller.totalSales > 0 && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span className="text-xs font-semibold text-green-400">{formatCurrency(seller.totalSales)}</span>
                      </div>
                    )}
                    {seller.rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-semibold text-yellow-400">{seller.rating.toFixed(1)}</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-600">{seller.description}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {seller.status === 'PENDING' && (
                  <button
                    onClick={() => handleApprove(seller._id)}
                    disabled={acting === seller._id}
                    className="px-4 py-2 bg-green-500 hover:bg-green-400 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-green-500/20"
                  >
                    {acting === seller._id ? '...' : '✓ Approve'}
                  </button>
                )}
                {(seller.status === 'ACTIVE' || seller.status === 'APPROVED') && (
                  <button
                    onClick={() => setSuspendTarget({ id: seller._id, storeName: seller.storeName })}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-xl transition-colors"
                  >
                    Suspend
                  </button>
                )}
                {seller.status === 'SUSPENDED' && (
                  <button
                    onClick={() => handleApprove(seller._id)}
                    disabled={acting === seller._id}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {acting === seller._id ? '...' : 'Reinstate'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 bg-[#1a2035] border border-white/5 rounded-2xl">
            <Store className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No sellers found</p>
          </div>
        )}
      </div>
    </div>
  );
}
