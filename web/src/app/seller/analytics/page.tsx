'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, Users, DollarSign, BarChart2, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { sellerApi } from '@/lib/api/seller.api';
import { apiClient } from '@/lib/api/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const EMPTY_DATA = {
  revenue: { current: 0, prev: 0, change: 0 },
  orders: { current: 0, prev: 0, change: 0 },
  customers: { current: 0, prev: 0, change: 0 },
  avgOrder: { current: 0, prev: 0, change: 0 },
  topProducts: [] as { name: string; sold: number; revenue: number }[],
  revenueByMonth: [] as { month: string; revenue: number }[],
};

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

export default function SellerAnalyticsPage() {
  const [data, setData] = useState(EMPTY_DATA);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    apiClient.get(`/api/v1/seller/analytics?period=${period}`)
      .then((res: any) => {
        if (res.data?.data) setData(res.data.data);
      })
      .catch(() => {});
  }, [period]);

  const maxRevenue = data.revenueByMonth.length ? Math.max(...data.revenueByMonth.map(m => m.revenue)) : 1;

  const stats = [
    { icon: DollarSign, label: 'Revenue', current: data.revenue.current, change: data.revenue.change, isCurrency: true, gradient: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/10', iconCls: 'bg-blue-500/10 text-blue-400' },
    { icon: ShoppingBag, label: 'Orders', current: data.orders.current, change: data.orders.change, isCurrency: false, gradient: 'from-indigo-500/20 to-indigo-600/5', border: 'border-indigo-500/10', iconCls: 'bg-indigo-500/10 text-indigo-400' },
    { icon: Users, label: 'Customers', current: data.customers.current, change: data.customers.change, isCurrency: false, gradient: 'from-purple-500/20 to-purple-600/5', border: 'border-purple-500/10', iconCls: 'bg-purple-500/10 text-purple-400' },
    { icon: TrendingUp, label: 'Avg. Order', current: data.avgOrder.current, change: data.avgOrder.change, isCurrency: true, gradient: 'from-green-500/20 to-green-600/5', border: 'border-green-500/10', iconCls: 'bg-green-500/10 text-green-400' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track your store performance</p>
        </div>
        <select
          className="bg-[#131929] border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 transition-colors"
          value={period}
          onChange={e => setPeriod(e.target.value)}
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className={`relative bg-[#131929] border ${stat.border} rounded-2xl p-5 overflow-hidden`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-40`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.iconCls}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${stat.change >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {stat.change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {Math.abs(stat.change)}%
                </div>
              </div>
              <p className="text-2xl font-bold text-white">
                {stat.isCurrency && stat.current > 1000 ? formatCurrency(stat.current) : stat.current}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <div className="bg-[#131929] border border-white/5 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-400" /> Revenue Trend
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.revenueByMonth}>
              <defs>
                <linearGradient id="analyticsRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#analyticsRevGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top products */}
        <div className="bg-[#131929] border border-white/5 rounded-2xl p-5">
          <h2 className="font-semibold text-white mb-5">Top Products</h2>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-8">No sales data yet</p>
          ) : (
            <div className="space-y-5">
              {data.topProducts.map((product, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-gray-600 w-4">#{idx + 1}</span>
                      <span className="font-medium text-gray-300 line-clamp-1">{product.name}</span>
                    </div>
                    <span className="text-gray-500 shrink-0 ml-2 text-xs">{product.sold} sold</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full h-1.5 transition-all"
                      style={{ width: `${(product.sold / (data.topProducts[0].sold || 1)) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{formatCurrency(product.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
