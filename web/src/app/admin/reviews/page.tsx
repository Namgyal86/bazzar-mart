'use client';

import { useState, useEffect } from 'react';
import { Star, Trash2, CheckCircle, XCircle, Search, MessageSquare } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import { toast } from '@/hooks/use-toast';


const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  APPROVED: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', dot: 'bg-green-400' },
  PENDING:  { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', dot: 'bg-yellow-400' },
  REJECTED: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-400' },
};

const AVATAR_GRADIENTS = ['from-brand-500 to-red-500', 'from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-green-500 to-teal-500'];

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiClient.get('/api/v1/reviews/admin/list')
      .then((res: any) => { if (Array.isArray(res.data?.data)) setReviews(res.data.data); })
      .catch(() => {});
  }, []);

  const approve = async (id: string) => {
    try { await apiClient.patch(`/api/v1/reviews/admin/${id}/approve`); } catch {}
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r));
    toast({ title: 'Review approved' });
  };

  const reject = async (id: string) => {
    try { await apiClient.patch(`/api/v1/reviews/admin/${id}/reject`); } catch {}
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED' } : r));
    toast({ title: 'Review rejected' });
  };

  const remove = async (id: string) => {
    try { await apiClient.delete(`/api/v1/reviews/admin/${id}`); } catch {}
    setReviews(prev => prev.filter(r => r.id !== id));
    toast({ title: 'Review deleted' });
  };

  const filtered = reviews.filter(r => {
    const matchFilter = filter === 'All' || r.status === filter;
    const matchSearch = !search || r.user.toLowerCase().includes(search.toLowerCase()) || r.product.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const stats = [
    { label: 'Pending', value: reviews.filter(r => r.status === 'PENDING').length, gradient: 'from-yellow-500 to-orange-500', iconBg: 'bg-yellow-500/10', iconText: 'text-yellow-400', border: 'border-yellow-500/20' },
    { label: 'Approved', value: reviews.filter(r => r.status === 'APPROVED').length, gradient: 'from-green-500 to-emerald-500', iconBg: 'bg-green-500/10', iconText: 'text-green-400', border: 'border-green-500/20' },
    { label: 'Total', value: reviews.length, gradient: 'from-blue-500 to-cyan-500', iconBg: 'bg-blue-500/10', iconText: 'text-blue-400', border: 'border-blue-500/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Reviews</h1>
          <p className="text-sm text-gray-500 mt-0.5">{reviews.length} total reviews</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
          <MessageSquare className="w-4.5 h-4.5 text-brand-400" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-[#1a2035] border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-white/10 hover:shadow-xl transition-all duration-300">
            <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-300`} />
            <div className={`absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br ${s.gradient} opacity-[0.06] rounded-full blur-xl group-hover:opacity-10 transition-opacity duration-300`} />
            <div className="relative">
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-xl ${s.iconBg} border ${s.border} mb-3`}>
                <div className={`w-2 h-2 rounded-full ${s.iconText.replace('text-', 'bg-')}`} />
              </div>
              <p className="text-3xl font-black text-white tracking-tight">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">{s.label} Reviews</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            placeholder="Search by user or product..."
            className="w-full bg-[#1a2035] border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/15 transition-colors"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {['All', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                filter === f
                  ? 'text-white shadow-lg ring-1 ring-white/10'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
              style={filter === f ? { backgroundColor: 'var(--ap)' } : {}}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Review Cards */}
      <div className="space-y-3">
        {filtered.map((review, i) => {
          const cfg = STATUS_CONFIG[review.status] || STATUS_CONFIG.PENDING;
          const grad = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
          return (
            <div
              key={review.id}
              className="bg-[#1a2035] border border-white/5 rounded-2xl p-5 hover:border-white/10 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* User + Product + Status row */}
                  <div className="flex items-center gap-2.5 flex-wrap mb-3">
                    <div className={`w-8 h-8 bg-gradient-to-br ${grad} rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 ring-1 ring-white/10 shadow-md`}>
                      {review.user[0]}
                    </div>
                    <span className="text-sm font-bold text-white">{review.user}</span>
                    <span className="text-gray-600 text-xs">reviewed</span>
                    <span className="text-xs text-brand-400 font-semibold bg-brand-500/8 px-2 py-0.5 rounded-lg">{review.product}</span>
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} inline-block`} />
                      {review.status}
                    </span>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mb-2.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm' : 'text-gray-700'}`} />
                    ))}
                    <span className="text-xs text-gray-500 ml-1.5 font-medium">{review.rating}/5</span>
                  </div>

                  {/* Comment */}
                  <p className="text-sm text-gray-400 leading-relaxed">{review.comment}</p>

                  {/* Meta */}
                  <div className="flex items-center gap-3 mt-2.5">
                    <p className="text-xs text-gray-600">{formatDate(review.createdAt)}</p>
                    <span className="text-gray-700 text-xs">·</span>
                    <p className="text-xs text-gray-600">{review.helpful} found helpful</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {review.status !== 'APPROVED' && (
                    <button
                      onClick={() => approve(review.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 text-xs font-bold rounded-xl transition-all duration-200 hover:shadow-md hover:shadow-green-500/10"
                    >
                      <CheckCircle className="w-3 h-3" /> Approve
                    </button>
                  )}
                  {review.status !== 'REJECTED' && (
                    <button
                      onClick={() => reject(review.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-xl transition-all duration-200 hover:shadow-md hover:shadow-red-500/10"
                    >
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  )}
                  <button
                    onClick={() => remove(review.id)}
                    className="w-full h-7 rounded-xl bg-white/5 hover:bg-red-500/15 text-gray-600 hover:text-red-400 border border-white/5 hover:border-red-500/20 flex items-center justify-center transition-all duration-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-[#1a2035] border border-white/5 rounded-2xl gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-gray-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-400">No reviews found</p>
              <p className="text-xs text-gray-600 mt-0.5">Try adjusting your filters</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
