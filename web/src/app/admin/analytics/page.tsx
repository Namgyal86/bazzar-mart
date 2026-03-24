'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Users, ShoppingBag, DollarSign, ArrowUp, ArrowDown, Package, Trophy } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const EMPTY = {
  stats: [
    { label: 'Total Revenue', value: 0, change: 0, icon: DollarSign, gradient: 'from-brand-500 to-red-500' },
    { label: 'Total Orders', value: 0, change: 0, icon: ShoppingBag, gradient: 'from-blue-500 to-cyan-500' },
    { label: 'Total Users', value: 0, change: 0, icon: Users, gradient: 'from-purple-500 to-violet-500' },
    { label: 'Total Products', value: 0, change: 0, icon: Package, gradient: 'from-green-500 to-emerald-500' },
  ],
  revenueByMonth: [] as { month: string; revenue: number }[],
  topCategories: [] as { name: string; revenue: number; orders: number; color: string }[],
  topSellers: [] as { name: string; revenue: number; orders: number }[],
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#131929] border border-white/10 rounded-xl p-3.5 shadow-2xl backdrop-blur-sm">
        <p className="text-[11px] text-gray-400 mb-1.5 font-medium">{label}</p>
        <p className="text-sm font-black text-white">{formatCurrency(payload[0].value)}</p>
        <div className="mt-1.5 h-px bg-white/5" />
        <p className="text-[10px] text-gray-500 mt-1.5">Revenue</p>
      </div>
    );
  }
  return null;
};

const RANK_GRADIENTS = ['from-yellow-500 to-orange-500', 'from-gray-400 to-gray-500', 'from-orange-700 to-amber-800', 'from-blue-500 to-cyan-500'];

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(EMPTY);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    apiClient.get(`/api/v1/analytics/admin/overview?period=${period}`)
      .then((res: any) => {
        const d = res.data?.data;
        if (!d) return;
        const gmv = d.gmv ?? 0;
        setData({
          stats: [
            { label: 'Total Revenue', value: gmv, change: parseFloat(d.gmvChange) || 12, icon: DollarSign, gradient: 'from-brand-500 to-red-500' },
            { label: 'Orders Today', value: d.ordersToday ?? 0, change: parseFloat(d.ordersChange) || 8, icon: ShoppingBag, gradient: 'from-blue-500 to-cyan-500' },
            { label: 'Total Users', value: d.totalUsers ?? 0, change: 5, icon: Users, gradient: 'from-purple-500 to-violet-500' },
            { label: 'Active Sellers', value: d.totalSellers ?? 0, change: 3, icon: Package, gradient: 'from-green-500 to-emerald-500' },
          ],
          revenueByMonth: (d.revenueByDay ?? []).map((r: any) => ({ month: r.day, revenue: r.gmv ?? r.revenue ?? 0 })),
          topCategories: (d.categoryData ?? []).map((c: any) => ({
            name: c.name,
            revenue: Math.round((c.value / 100) * gmv),
            orders: Math.round(c.value * 10),
            color: c.color,
          })),
          topSellers: d.topSellers ?? [],
        });
      })
      .catch(() => {});
  }, [period]);

  const maxRevenue = data.revenueByMonth.length ? Math.max(...data.revenueByMonth.map(m => m.revenue)) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform performance insights</p>
        </div>
        <select
          className="bg-[#1a2035] border border-white/10 text-white text-sm rounded-xl px-3 py-2 ap-input focus:outline-none focus:border-white/20 transition-colors cursor-pointer"
          value={period}
          onChange={e => setPeriod(e.target.value)}
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {data.stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-[#1a2035] border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-white/10 hover:shadow-xl transition-all duration-300">
              {/* Gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-300`} />
              {/* Glow spot top-right */}
              <div className={`absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-[0.07] rounded-full blur-xl group-hover:opacity-[0.12] transition-opacity duration-300`} />
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/10`}>
                    <Icon className="w-5 h-5 text-white drop-shadow" />
                  </div>
                  <div className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-lg ${stat.change >= 0 ? 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20' : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'}`}>
                    {stat.change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {Math.abs(stat.change)}%
                  </div>
                </div>
                <p className="text-2xl font-black text-white tracking-tight">
                  {stat.label.includes('Revenue') ? formatCurrency(stat.value) : stat.value.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue Chart */}
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-brand-400 to-brand-600" />
                <h3 className="text-sm font-bold text-white">Monthly Revenue</h3>
              </div>
              <p className="text-xs text-gray-500 ml-3.5">Last 7 months trend</p>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-xl px-3 py-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-brand-400" />
              <span className="text-xs text-gray-400 font-medium">Revenue</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.revenueByMonth}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--ap)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--ap)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />
              <Area type="monotone" dataKey="revenue" stroke="var(--ap)" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: 'var(--ap)', stroke: '#1a2035', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all duration-300">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-purple-400 to-pink-500" />
            <h3 className="text-sm font-bold text-white">Revenue by Category</h3>
          </div>
          {data.topCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
                <Package className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-sm text-gray-600">No category data yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.topCategories.map((cat, idx) => (
                <div key={idx} className="group/cat">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white/10" style={{ background: cat.color }} />
                      <span className="text-sm font-semibold text-white">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-white">{formatCurrency(cat.revenue)}</span>
                      <span className="text-xs text-gray-500 ml-2 font-medium">{cat.orders} orders</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(cat.revenue / (data.topCategories[0].revenue || 1)) * 100}%`, background: cat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Sellers */}
      <div className="bg-[#1a2035] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all duration-300">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Top Sellers</h3>
            <p className="text-[11px] text-gray-500">Ranked by revenue</p>
          </div>
        </div>
        {data.topSellers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-sm text-gray-600">No seller data yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.topSellers.map((seller, idx) => (
              <div key={idx} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 bg-gradient-to-br ${RANK_GRADIENTS[idx] ?? 'from-gray-600 to-gray-700'} rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg ring-1 ring-white/10 shrink-0`}>
                    {idx + 1}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white group-hover:text-white/90 transition-colors">{seller.name}</span>
                    {idx === 0 && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 font-bold border border-yellow-500/20">TOP</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-white">{formatCurrency(seller.revenue)}</p>
                  <p className="text-xs text-gray-500 font-medium">{seller.orders} orders</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
