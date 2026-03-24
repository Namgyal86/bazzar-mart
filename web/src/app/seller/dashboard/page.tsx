'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Package, Star, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { sellerApi } from '@/lib/api/seller.api';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth.store';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_DARK: Record<string, string> = {
  DELIVERED: 'bg-green-500/10 text-green-400 border border-green-500/20',
  SHIPPED: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  PROCESSING: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  CONFIRMED: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  PENDING: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const RANK_COLORS = [
  'bg-gradient-to-br from-blue-500 to-blue-600',
  'bg-gradient-to-br from-purple-500 to-purple-600',
  'bg-gradient-to-br from-gray-500 to-gray-600',
  'bg-gradient-to-br from-green-500 to-green-600',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#131929] border border-white/10 rounded-xl px-3 py-2 shadow-xl">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <p className="text-sm font-semibold text-white">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function SellerDashboardPage() {
  const { user } = useAuthStore();
  const [dashboard, setDashboard] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const profileReq = sellerApi.getProfile().then(res => setProfile(res.data.data)).catch(() => {});
    const dashReq = sellerApi.getDashboard().then(res => setDashboard(res.data.data)).catch(() => {});
    const analyticsReq = apiClient.get('/api/v1/seller/analytics?period=30d').then((res: any) => { if (res.data?.data) setAnalytics(res.data.data); }).catch(() => {});
    Promise.allSettled([profileReq, dashReq, analyticsReq]).finally(() => setLoading(false));
  }, []);

  const storeName = profile?.storeName ?? user?.firstName ?? 'Seller';
  const revenue = dashboard?.revenue ?? 0;
  const totalOrders = dashboard?.orders ?? 0;
  const totalProducts = dashboard?.products ?? 0;
  const rating = profile?.rating ?? 0;
  const topProducts: any[] = dashboard?.topProducts ?? [];
  const recentOrders: any[] = dashboard?.recentOrders ?? [];

  const fmtChange = (change: number | undefined) => change != null ? `${change >= 0 ? '+' : ''}${change}%` : '+0%';

  const stats = [
    {
      title: 'Total Revenue', value: formatCurrency(revenue),
      change: fmtChange(analytics?.revenue?.change), up: (analytics?.revenue?.change ?? 0) >= 0,
      icon: DollarSign,
      gradient: 'from-blue-500/20 to-blue-600/5',
      iconBg: 'bg-blue-500/10 text-blue-400',
      border: 'border-blue-500/10',
    },
    {
      title: 'Total Orders', value: totalOrders.toString(),
      change: fmtChange(analytics?.orders?.change), up: (analytics?.orders?.change ?? 0) >= 0,
      icon: ShoppingBag,
      gradient: 'from-indigo-500/20 to-indigo-600/5',
      iconBg: 'bg-indigo-500/10 text-indigo-400',
      border: 'border-indigo-500/10',
    },
    {
      title: 'Active Products', value: totalProducts.toString(),
      change: '+0', up: true,
      icon: Package,
      gradient: 'from-purple-500/20 to-purple-600/5',
      iconBg: 'bg-purple-500/10 text-purple-400',
      border: 'border-purple-500/10',
    },
    {
      title: 'Avg. Order Value', value: analytics?.avgOrder?.current > 0 ? formatCurrency(analytics.avgOrder.current) : '—',
      change: fmtChange(analytics?.avgOrder?.change), up: (analytics?.avgOrder?.change ?? 0) >= 0,
      icon: Star,
      gradient: 'from-green-500/20 to-green-600/5',
      iconBg: 'bg-green-500/10 text-green-400',
      border: 'border-green-500/10',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {storeName}!</h1>
          <p className="text-gray-500 text-sm mt-0.5">Here's your store performance overview.</p>
        </div>
        <Link
          href="/seller/products/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-blue-500/20"
        >
          + Add Product
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className={`relative bg-[#131929] border ${stat.border} rounded-2xl p-5 overflow-hidden`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-40`} />
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.iconBg}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${stat.up ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {stat.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {stat.change}
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      {analytics?.revenueByMonth?.length > 0 && (
        <div className="bg-[#131929] border border-white/5 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Revenue Trend</h2>
            <span className="text-xs text-gray-500">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={analytics.revenueByMonth} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Top products */}
        <div className="lg:col-span-2 bg-[#131929] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white">Top Products</h2>
            <Link href="/seller/products" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View all</Link>
          </div>
          {topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-600">
              <Package className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">No products yet — add your first product</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.slice(0, 4).map((p, idx) => (
                <div key={p.name || p._id} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${RANK_COLORS[idx] || 'bg-gray-600'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-300 line-clamp-1">{p.name}</p>
                    <p className="text-xs text-gray-600">{p.sales ?? 0} sold</p>
                  </div>
                  {p.change !== undefined && (
                    <div className={`text-xs font-medium flex items-center gap-0.5 ${(p.change ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(p.change ?? 0) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(p.change ?? 0)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="bg-[#131929] border border-white/5 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Store Overview</h2>
          {profile ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-gray-500">Store Name</span>
                <span className="text-xs font-semibold text-white">{profile.storeName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-gray-500">Status</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  profile.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' :
                  profile.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-red-500/10 text-red-400'
                }`}>{profile.status}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-gray-500">Total Sales</span>
                <span className="text-xs font-semibold text-white">{profile.totalSales ?? 0}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-gray-500">Rating</span>
                <span className="text-xs font-semibold text-yellow-400">{(profile.rating ?? 0).toFixed(1)} ★</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <p className="text-sm">No profile data</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-[#131929] border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="font-semibold text-white">Recent Orders</h2>
          <Link href="/seller/orders" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View all</Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
            <ShoppingBag className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-600 uppercase tracking-wide border-b border-white/5">
                  <th className="text-left px-5 py-3">Order</th>
                  <th className="text-left px-5 py-3">Product</th>
                  <th className="text-left px-5 py-3">Buyer</th>
                  <th className="text-left px-5 py-3">Amount</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentOrders.map((order) => (
                  <tr key={order.id || order._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-blue-400">{order.id || order._id}</td>
                    <td className="px-5 py-3.5 text-gray-300">{order.product || order.productName || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500">{order.buyer || order.buyerName || '—'}</td>
                    <td className="px-5 py-3.5 font-semibold text-white">{formatCurrency(order.amount || order.totalAmount || 0)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_DARK[order.status] || 'bg-gray-500/10 text-gray-400'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 text-xs">{formatDate(order.date || order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
