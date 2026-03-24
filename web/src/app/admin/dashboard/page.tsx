'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Store, ShoppingBag, DollarSign, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Clock, ArrowUpRight, Activity, Zap,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';



function StatCard({ title, value, change, icon: Icon, gradient, positive = true }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#1a2035] border border-white/5 p-5 group hover:border-[color:var(--ap-20)] transition-all duration-300">
      <div className={`absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity ${gradient}`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradient} shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${positive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </div>
        </div>
        <p className="text-2xl font-black text-white mb-1">{value}</p>
        <p className="text-xs text-gray-500 font-medium">{title}</p>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#1a2035] border border-white/10 rounded-xl p-3 shadow-2xl">
        <p className="text-xs font-semibold text-gray-400 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-sm font-bold" style={{ color: p.color }}>
            {p.name === 'gmv' ? formatCurrency(p.value) : `${p.value} orders`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function getActionRoute(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('seller') || m.includes('store')) return '/admin/sellers';
  if (m.includes('order') || m.includes('return') || m.includes('refund')) return '/admin/orders';
  if (m.includes('review') || m.includes('report')) return '/admin/reviews';
  if (m.includes('user') || m.includes('ban')) return '/admin/users';
  if (m.includes('coupon')) return '/admin/coupons';
  return '/admin/orders';
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<any>(null);
  const [health, setHealth] = useState<{ metrics: any[]; systemStatus: string } | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/v1/analytics/admin/overview')
      .then((res) => setOverview(res.data.data))
      .catch(() => {});

    fetch('/api/v1/analytics/platform-health')
      .then((r) => r.json())
      .then((r) => setHealth(r.data))
      .catch(() => {})
      .finally(() => setHealthLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Platform Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time metrics · {new Date().toLocaleDateString('en-NP', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-xl">
            <Activity className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs font-semibold text-green-400">All Systems Live</span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Gross Merchandise Value" value={overview ? formatCurrency(overview.gmv ?? 0) : '—'} change={overview?.gmvChange ?? '+0%'} icon={DollarSign} gradient="bg-gradient-to-br from-brand-500 to-red-500" />
        <StatCard title="Total Users" value={overview ? (overview.totalUsers ?? 0).toLocaleString() : '—'} change={overview?.newUsersToday ? `+${overview.newUsersToday} today` : 'Loading…'} icon={Users} gradient="bg-gradient-to-br from-blue-500 to-cyan-500" />
        <StatCard title="Active Sellers" value={overview ? (overview.totalSellers ?? 0).toLocaleString() : '—'} change={overview?.pendingSellers ? `${overview.pendingSellers} pending` : 'Loading…'} icon={Store} gradient="bg-gradient-to-br from-purple-500 to-pink-500" positive={false} />
        <StatCard title="Orders Today" value={overview ? (overview.ordersToday ?? 0).toLocaleString() : '—'} change={overview?.ordersChange ?? '+0%'} icon={ShoppingBag} gradient="bg-gradient-to-br from-emerald-500 to-teal-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* GMV Area Chart */}
        <div className="lg:col-span-2 bg-[#1a2035] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-white">Revenue This Week</h3>
              <p className="text-xs text-gray-500 mt-0.5">Gross Merchandise Value · Daily</p>
            </div>
            {overview?.gmvChange && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-lg">
                <TrendingUp className="w-3 h-3" /> {overview.gmvChange}
              </div>
            )}
          </div>
          {overview?.revenueByDay?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={overview.revenueByDay}>
                <defs>
                  <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--ap)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--ap)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="gmv" stroke="var(--ap)" strokeWidth={2} fill="url(#gmvGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">
              No revenue data yet
            </div>
          )}
        </div>

        {/* Category Pie */}
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Sales by Category</h3>
            <p className="text-xs text-gray-500 mt-0.5">Revenue breakdown</p>
          </div>
          {overview?.categoryData?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={overview.categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {(overview.categoryData as any[]).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `${value}%`} contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {(overview.categoryData as any[]).map((cat: any) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-gray-400">{cat.name}</span>
                    </div>
                    <span className="font-semibold text-gray-300">{cat.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-gray-600 text-sm">
              No category data yet
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Requires Attention */}
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-red-500/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Requires Attention</h3>
              <p className="text-xs text-gray-500">{(overview?.recentActions ?? []).length} pending items</p>
            </div>
          </div>
          {(overview?.recentActions ?? []).length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-6">No pending items</p>
          ) : (
            <div className="space-y-2">
              {(overview.recentActions as any[]).map((action: any, idx: number) => (
                <div key={idx} className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer',
                  action.urgent
                    ? 'bg-red-500/5 border-red-500/10 hover:bg-red-500/10'
                    : 'bg-white/3 border-white/5 hover:bg-white/5',
                )}>
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${action.urgent ? 'bg-red-400' : 'bg-gray-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 leading-relaxed">{action.message}</p>
                    <p className="text-[10px] text-gray-600 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {action.time}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(getActionRoute(action.message))}
                    className="shrink-0 text-xs px-2.5 py-1 bg-white/5 text-gray-400 rounded-lg transition-colors font-medium ap-text hover:opacity-80"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Platform Health */}
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${health?.systemStatus === 'operational' ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
                <Zap className={`w-4 h-4 ${health?.systemStatus === 'operational' ? 'text-green-400' : 'text-orange-400'}`} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Platform Health</h3>
                <p className="text-xs text-gray-500">
                  {healthLoading ? 'Checking services…' : health?.systemStatus === 'operational' ? 'All systems operational' : 'Some services unavailable'}
                </p>
              </div>
            </div>
            {health && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${health.systemStatus === 'operational' ? 'bg-green-500/15 text-green-400' : 'bg-orange-500/15 text-orange-400'}`}>
                {health.systemStatus === 'operational' ? 'LIVE' : 'DEGRADED'}
              </span>
            )}
          </div>
          <div className="space-y-4">
            {healthLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex justify-between mb-1.5">
                    <div className="h-3 bg-white/5 rounded w-32" />
                    <div className="h-3 bg-white/5 rounded w-16" />
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full" />
                </div>
              ))
            ) : (health?.metrics ?? []).map((item: any) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-400">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${item.available ? 'text-white' : 'text-gray-600'}`}>{item.value}</span>
                    {!item.available
                      ? <AlertTriangle className="w-3.5 h-3.5 text-gray-600" />
                      : item.status === 'good'
                        ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                        : <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />}
                  </div>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      !item.available ? 'bg-white/10' :
                      item.status === 'good' ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                      'bg-gradient-to-r from-orange-500 to-yellow-400'
                    }`}
                    style={{ width: item.available ? `${item.pct}%` : '100%' }}
                  />
                </div>
                <p className="text-[10px] text-gray-600 mt-0.5">Target: {item.target}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
