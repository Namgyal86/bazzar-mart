'use client';

import { useState, useEffect } from 'react';
import { Package, Search, Clock, Truck, CheckCircle, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { sellerApi } from '@/lib/api/seller.api';
import { toast } from '@/hooks/use-toast';
import { orderApi } from '@/lib/api/order.api';


const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.12)]',
  CONFIRMED: 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.12)]',
  PROCESSING: 'bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.12)]',
  SHIPPED: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-[0_0_8px_rgba(99,102,241,0.12)]',
  DELIVERED: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.12)]',
  CANCELLED: 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.12)]',
};

const NEXT_STATUS: Record<string, string> = {
  CONFIRMED: 'PROCESSING',
  PROCESSING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
};

const NEXT_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Start Processing',
  PROCESSING: 'Mark Shipped',
  SHIPPED: 'Mark Delivered',
};

const STAT_CARDS = [
  { key: 'CONFIRMED', label: 'Pending', icon: AlertCircle, gradient: 'from-amber-500/20 to-transparent', border: 'border-amber-500/15', iconBg: 'bg-amber-500/10 border-amber-500/20', iconCls: 'text-amber-400' },
  { key: 'PROCESSING', label: 'Processing', icon: Clock, gradient: 'from-purple-500/20 to-transparent', border: 'border-purple-500/15', iconBg: 'bg-purple-500/10 border-purple-500/20', iconCls: 'text-purple-400' },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck, gradient: 'from-blue-500/20 to-transparent', border: 'border-blue-500/15', iconBg: 'bg-blue-500/10 border-blue-500/20', iconCls: 'text-blue-400' },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle, gradient: 'from-emerald-500/20 to-transparent', border: 'border-emerald-500/15', iconBg: 'bg-emerald-500/10 border-emerald-500/20', iconCls: 'text-emerald-400' },
];

const ALL_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [updating, setUpdating] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    sellerApi.getOrders()
      .then(res => {
        const data = res.data?.data;
        if (Array.isArray(data)) setOrders(data);
        else if (Array.isArray(data?.orders)) setOrders(data.orders);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      await orderApi.updateStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
      toast({ title: 'Order updated!', description: `Status changed to ${newStatus}` });
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    } finally {
      setUpdating(null);
    }
  };

  const filtered = orders.filter(o => {
    if (filter !== 'ALL' && o.status !== filter) return false;
    if (search && !o.orderNumber?.toLowerCase().includes(search.toLowerCase()) &&
        !o.shippingAddress?.fullName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0d1117 0%, #0f1520 50%, #0d1117 100%)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Orders</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loaded ? (
              <span>
                <span className="text-gray-400 font-medium">{orders.length}</span> total orders
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                Loading orders…
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((s) => (
          <div
            key={s.key}
            className={`relative border ${s.border} rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:-translate-y-0.5`}
            style={{
              background: 'linear-gradient(135deg, #131929 0%, #0f1520 100%)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.03)',
            }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-50`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">{s.label}</p>
                <p className="text-3xl font-bold text-white mt-2 tracking-tight">
                  {loaded ? orders.filter(o => o.status === s.key).length : (
                    <span className="inline-block w-8 h-7 bg-white/5 rounded-lg animate-pulse" />
                  )}
                </p>
              </div>
              <div className={`w-10 h-10 ${s.iconBg} border rounded-xl flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.iconCls}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex gap-2 flex-wrap items-center">
          {ALL_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                filter === s
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-white/5 border border-white/8 text-gray-500 hover:bg-white/8 hover:border-white/15 hover:text-gray-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative group max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-blue-400 transition-colors duration-200" />
          <input
            placeholder="Search by order # or customer name..."
            className="w-full bg-[#0d1117] border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] transition-all duration-200"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div
        className="border border-white/8 rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #131929 0%, #0f1520 100%)', boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-[11px] text-gray-600 uppercase tracking-widest"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}
              >
                <th className="text-left px-5 py-4 font-semibold">Order</th>
                <th className="text-left px-5 py-4 font-semibold">Customer</th>
                <th className="text-left px-5 py-4 font-semibold">Items</th>
                <th className="text-left px-5 py-4 font-semibold">Total</th>
                <th className="text-left px-5 py-4 font-semibold">Status</th>
                <th className="text-left px-5 py-4 font-semibold">Date</th>
                <th className="text-left px-5 py-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {!loaded ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-5 py-4"><div className="h-3 w-24 bg-white/5 rounded-lg animate-pulse" /></td>
                    <td className="px-5 py-4">
                      <div className="space-y-2">
                        <div className="h-3.5 w-28 bg-white/5 rounded-lg animate-pulse" />
                        <div className="h-2.5 w-16 bg-white/[0.03] rounded-lg animate-pulse" />
                      </div>
                    </td>
                    <td className="px-5 py-4"><div className="h-3 w-32 bg-white/5 rounded-lg animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-3.5 w-16 bg-white/5 rounded-lg animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-20 bg-white/5 rounded-full animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-3 w-20 bg-white/5 rounded-lg animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-7 w-28 bg-white/5 rounded-lg animate-pulse" /></td>
                  </tr>
                ))
              ) : (
                filtered.map(order => (
                  <tr
                    key={order._id}
                    className="transition-all duration-150"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-bold text-blue-400 tracking-wide">
                        {order.orderNumber || order._id}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-200 text-[13px]">{order.shippingAddress?.fullName || 'Customer'}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{order.shippingAddress?.city || ''}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-300 line-clamp-1 text-[13px]">{order.items?.[0]?.productName || '-'}</p>
                      {order.items?.length > 1 && (
                        <p className="text-xs text-gray-600 mt-0.5">+{order.items.length - 1} more item{order.items.length - 1 > 1 ? 's' : ''}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-white text-[14px]">{formatCurrency(order.total)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${STATUS_COLORS[order.status] || 'bg-gray-500/15 text-gray-400 border border-gray-500/30'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600 text-xs">{formatDate(order.createdAt)}</td>
                    <td className="px-5 py-4">
                      {NEXT_STATUS[order.status] && (
                        <button
                          disabled={updating === order._id}
                          onClick={() => handleUpdateStatus(order._id, NEXT_STATUS[order.status])}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 hover:text-blue-200 hover:border-blue-500/35 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {updating === order._id ? (
                            <>
                              <span className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                              Updating…
                            </>
                          ) : (
                            NEXT_STATUS_LABELS[order.status] || `→ ${NEXT_STATUS[order.status]}`
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {loaded && filtered.length === 0 && (
            <div className="text-center py-20">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center border border-white/8"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <Package className="w-7 h-7 text-gray-600" />
              </div>
              <p className="text-gray-400 font-semibold text-[15px]">
                {orders.length === 0 ? 'No orders yet' : 'No orders match your filter'}
              </p>
              <p className="text-gray-600 text-sm mt-1">
                {orders.length === 0
                  ? 'Orders from customers will appear here once placed'
                  : 'Try adjusting your search or filter criteria'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
