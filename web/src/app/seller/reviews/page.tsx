'use client';

import { useState, useEffect } from 'react';
import { Star, Search, Filter, MessageSquare, ThumbsUp, AlertCircle, CheckCircle, Package } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';

type ReviewStatus = 'all' | 'pending' | 'approved' | 'rejected';
type StarFilter = 0 | 1 | 2 | 3 | 4 | 5;

interface Review {
  _id: string;
  productId: string;
  productName?: string;
  productImage?: string;
  userId: string;
  userName?: string;
  rating: number;
  title?: string;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  images?: string[];
  createdAt: string;
}

function StarRating({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-700 fill-gray-700'}
        />
      ))}
    </span>
  );
}

const STATUS_CONFIG = {
  pending:  { bg: 'bg-yellow-500/10', text: 'text-yellow-400',  border: 'border-yellow-500/20', label: 'Pending'  },
  approved: { bg: 'bg-green-500/10',  text: 'text-green-400',   border: 'border-green-500/20',  label: 'Approved' },
  rejected: { bg: 'bg-red-500/10',    text: 'text-red-400',     border: 'border-red-500/20',    label: 'Rejected' },
};

export default function SellerReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus>('all');
  const [starFilter, setStarFilter] = useState<StarFilter>(0);

  useEffect(() => {
    apiClient.get('/api/v1/seller/reviews')
      .then((res: any) => {
        const data = res.data?.data;
        setReviews(Array.isArray(data) ? data : DEMO_REVIEWS);
      })
      .catch(() => setReviews(DEMO_REVIEWS))
      .finally(() => setLoading(false));
  }, []);

  const filtered = reviews.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (r.productName?.toLowerCase().includes(q)) ||
      (r.comment?.toLowerCase().includes(q)) ||
      (r.userName?.toLowerCase().includes(q));
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchStar = starFilter === 0 || r.rating === starFilter;
    return matchSearch && matchStatus && matchStar;
  });

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const countByStar = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: reviews.filter(r => r.rating === s).length,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Reviews</h1>
          <p className="text-sm text-gray-500 mt-0.5">Product reviews from your customers</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Total Reviews</p>
          <p className="text-2xl font-black text-white">{reviews.length}</p>
        </div>
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Avg Rating</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-black text-white">{avg}</p>
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          </div>
        </div>
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">5-Star Reviews</p>
          <p className="text-2xl font-black text-green-400">{reviews.filter(r => r.rating === 5).length}</p>
        </div>
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Pending</p>
          <p className="text-2xl font-black text-yellow-400">{reviews.filter(r => r.status === 'pending').length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Rating breakdown sidebar */}
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-5 space-y-3 h-fit">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Rating Breakdown</p>
          {countByStar.map(({ star, count }) => (
            <button
              key={star}
              onClick={() => setStarFilter(starFilter === star as StarFilter ? 0 : star as StarFilter)}
              className={`w-full flex items-center gap-2 group transition-opacity ${starFilter !== 0 && starFilter !== star ? 'opacity-40' : ''}`}
            >
              <span className="text-xs font-bold text-gray-400 w-3">{star}</span>
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-xs text-gray-500 w-5 text-right">{count}</span>
            </button>
          ))}
        </div>

        {/* Reviews list */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search reviews, products…"
                className="w-full bg-[#0f1117] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as ReviewStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${
                    statusFilter === s
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-white/5 text-gray-500 border border-transparent hover:text-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Review cards */}
          {filtered.length === 0 ? (
            <div className="bg-[#1a2035] border border-white/5 rounded-2xl flex flex-col items-center justify-center py-20">
              <MessageSquare className="w-10 h-10 text-gray-700 mb-3" />
              <p className="text-sm font-semibold text-gray-500">No reviews found</p>
              <p className="text-xs text-gray-700 mt-1">Try adjusting filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(review => {
                const cfg = STATUS_CONFIG[review.status] || STATUS_CONFIG.pending;
                return (
                  <div
                    key={review._id}
                    className="bg-[#1a2035] border border-white/5 rounded-2xl p-5 space-y-3"
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Product image or icon */}
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                          {review.productImage ? (
                            <img src={review.productImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white truncate max-w-[180px]">
                            {review.productName || 'Product'}
                          </p>
                          <p className="text-xs text-gray-500">{review.userName || 'Customer'}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                    </div>

                    {/* Rating + title */}
                    <div className="flex items-center gap-3">
                      <StarRating value={review.rating} />
                      {review.isVerifiedPurchase && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 rounded-md px-1.5 py-0.5">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>

                    {review.title && (
                      <p className="text-sm font-semibold text-white">{review.title}</p>
                    )}
                    <p className="text-sm text-gray-400 leading-relaxed">{review.comment}</p>

                    {/* Review images */}
                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {review.images.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt=""
                            className="w-14 h-14 rounded-xl object-cover border border-white/10"
                          />
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {review.helpfulCount || 0} helpful
                      </div>
                      <span className="text-xs text-gray-600">{formatDate(review.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Demo data shown when service is not running
const DEMO_REVIEWS: Review[] = [
  {
    _id: '1',
    productId: 'p1',
    productName: 'Wireless Bluetooth Headphones',
    userId: 'u1',
    userName: 'Suman Thapa',
    rating: 5,
    title: 'Excellent quality!',
    comment: 'The sound quality is amazing and the battery life is outstanding. Highly recommend for anyone looking for quality headphones at this price.',
    status: 'approved',
    isVerifiedPurchase: true,
    helpfulCount: 12,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    _id: '2',
    productId: 'p2',
    productName: 'Smart Watch Pro',
    userId: 'u2',
    userName: 'Priya Sharma',
    rating: 4,
    title: 'Good value for money',
    comment: 'Works well overall, tracking is accurate. The strap could be more comfortable but the display is bright and clear.',
    status: 'approved',
    isVerifiedPurchase: true,
    helpfulCount: 5,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    _id: '3',
    productId: 'p1',
    productName: 'Wireless Bluetooth Headphones',
    userId: 'u3',
    userName: 'Bikash Rai',
    rating: 3,
    title: 'Decent but not great',
    comment: 'The sound is okay but I expected better bass. Packaging was good and delivery was fast.',
    status: 'pending',
    isVerifiedPurchase: false,
    helpfulCount: 2,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    _id: '4',
    productId: 'p3',
    productName: 'USB-C Hub 7-in-1',
    userId: 'u4',
    userName: 'Anita Gurung',
    rating: 2,
    title: 'Stopped working after 2 weeks',
    comment: 'The hub worked fine initially but one of the USB ports stopped functioning after 2 weeks of light use. Disappointed.',
    status: 'approved',
    isVerifiedPurchase: true,
    helpfulCount: 8,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];
