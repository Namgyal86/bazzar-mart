'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Package, TrendingUp, ChevronDown, X, MapPin, CreditCard, User, Calendar, ShoppingBag, Clock, Truck, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { orderApi } from '@/lib/api/order.api';
import { toast } from '@/hooks/use-toast';


const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; ring: string }> = {
  PENDING:    { bg: 'bg-yellow-500/10', text: 'text-yellow-400',  dot: 'bg-yellow-400',  ring: 'ring-yellow-500/30' },
  CONFIRMED:  { bg: 'bg-blue-500/10',   text: 'text-blue-400',    dot: 'bg-blue-400',    ring: 'ring-blue-500/30' },
  PROCESSING: { bg: 'bg-purple-500/10', text: 'text-purple-400',  dot: 'bg-purple-400',  ring: 'ring-purple-500/30' },
  SHIPPED:    { bg: 'bg-cyan-500/10',   text: 'text-cyan-400',    dot: 'bg-cyan-400',    ring: 'ring-cyan-500/30' },
  DELIVERED:  { bg: 'bg-green-500/10',  text: 'text-green-400',   dot: 'bg-green-400',   ring: 'ring-green-500/30' },
  CANCELLED:  { bg: 'bg-red-500/10',    text: 'text-red-400',     dot: 'bg-red-400',     ring: 'ring-red-500/30' },
};

const PAYMENT_COLORS: Record<string, string> = {
  KHALTI: 'text-purple-400', ESEWA: 'text-green-400', COD: 'text-orange-400',
};

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

// ── Custom dark status dropdown (replaces native <select> which shows white) ──
const STATUS_DOT: Record<string, string> = {
  PENDING: 'bg-yellow-400', CONFIRMED: 'bg-blue-400', PROCESSING: 'bg-purple-400',
  SHIPPED: 'bg-cyan-400', DELIVERED: 'bg-green-400', CANCELLED: 'bg-red-400',
};
const STATUS_TEXT_COLOR: Record<string, string> = {
  PENDING: 'text-yellow-300', CONFIRMED: 'text-blue-300', PROCESSING: 'text-purple-300',
  SHIPPED: 'text-cyan-300', DELIVERED: 'text-green-300', CANCELLED: 'text-red-300',
};

function StatusSelect({ value, disabled, onChange, compact = false }: {
  value: string; disabled?: boolean; onChange: (v: string) => void; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef  = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || dropRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(o => !o);
  };

  const dropdown = mounted && open ? createPortal(
    <div
      ref={dropRef}
      className="w-44 rounded-xl overflow-hidden py-1"
      style={{
        position: 'fixed',
        top: dropPos.top,
        left: dropPos.left,
        zIndex: 99999,
        background: '#0d1117',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
      }}
    >
      {ORDER_STATUSES.map(s => (
        <button
          key={s}
          onClick={(e) => { e.stopPropagation(); onChange(s); setOpen(false); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/[0.06] ${s === value ? 'bg-white/[0.04]' : ''}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[s]}`} />
          <span className={STATUS_TEXT_COLOR[s]}>{s}</span>
          {s === value && <span className="ml-auto text-[9px] text-gray-600 font-normal">current</span>}
        </button>
      ))}
    </div>,
    document.body,
  ) : null;

  return (
    <div ref={wrapRef} className="relative" onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        disabled={disabled}
        onClick={handleOpen}
        className={`flex items-center gap-2 rounded-lg border transition-all disabled:opacity-50 ${
          compact ? 'pl-2.5 pr-7 py-1.5 text-[11px]' : 'pl-3 pr-8 py-2 text-xs'
        } ${open ? 'border-white/25' : 'border-white/10 hover:border-white/20'}`}
        style={{ background: 'rgba(13,17,23,0.9)', minWidth: compact ? 110 : 130 }}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[value] ?? 'bg-gray-400'}`} />
        <span className={`font-semibold ${STATUS_TEXT_COLOR[value] ?? 'text-gray-300'}`}>{value}</span>
        <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {dropdown}
    </div>
  );
}

const FILTER_TAB_STATUS_COLORS: Record<string, string> = {
  PENDING:    'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 shadow-yellow-500/10',
  CONFIRMED:  'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-blue-500/10',
  PROCESSING: 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-purple-500/10',
  SHIPPED:    'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-cyan-500/10',
  DELIVERED:  'bg-green-500/20 text-green-300 border border-green-500/30 shadow-green-500/10',
  CANCELLED:  'bg-red-500/20 text-red-300 border border-red-500/30 shadow-red-500/10',
  ALL:        'bg-gradient-to-r from-orange-500 to-amber-500 text-white border border-orange-500/40 shadow-orange-500/20',
};

function OrderDetailPanel({ order, onClose, onStatusChange, updatingId }: { order: any; onClose: () => void; onStatusChange: (id: string, status: string) => void; updatingId: string | null }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/70 backdrop-blur-md" onClick={onClose} />

      {/* Panel */}
      <div
        className="w-full max-w-md overflow-y-auto border-l"
        style={{
          background: 'linear-gradient(160deg, rgba(22,27,39,0.98) 0%, rgba(13,17,23,0.99) 100%)',
          borderColor: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(24px)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
          style={{
            background: 'linear-gradient(160deg, rgba(22,27,39,0.98) 0%, rgba(13,17,23,0.99) 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Order Details</p>
            <p className="font-mono font-black text-sm mt-0.5" style={{ color: 'var(--ap, #f97316)' }}>
              {order.orderNumber || order._id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Status + Update */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <p className="text-[10px] font-semibold text-gray-500 mb-3 uppercase tracking-widest">Current Status</p>
            <div className="flex items-center justify-between gap-3">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${cfg.dot}`} />
                {order.status}
              </span>
              <StatusSelect
                value={order.status}
                disabled={updatingId === order._id}
                onChange={v => onStatusChange(order._id, v)}
              />
            </div>
            {updatingId === order._id && (
              <div className="mt-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                <span className="text-xs text-gray-500">Updating status...</span>
              </div>
            )}
          </div>

          {/* Customer */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <p className="text-[10px] font-semibold text-gray-500 mb-3 uppercase tracking-widest flex items-center gap-1.5">
              <User className="w-3 h-3" /> Customer
            </p>
            <p className="font-bold text-white text-sm">{order.shippingAddress?.fullName}</p>
            <p className="text-xs text-gray-400 mt-0.5">{order.userEmail}</p>
            {order.shippingAddress?.phone && (
              <p className="text-xs text-gray-400 mt-0.5">{order.shippingAddress.phone}</p>
            )}
          </div>

          {/* Shipping Address */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <p className="text-[10px] font-semibold text-gray-500 mb-3 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Delivery Address
            </p>
            <p className="text-sm text-gray-200">{order.shippingAddress?.addressLine1}</p>
            <p className="text-sm text-gray-400 mt-0.5">{order.shippingAddress?.city}, {order.shippingAddress?.district}</p>
            <p className="text-xs text-gray-500 mt-0.5">{order.shippingAddress?.province}</p>
          </div>

          {/* Items */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <p className="text-[10px] font-semibold text-gray-500 mb-3 uppercase tracking-widest flex items-center gap-1.5">
              <Package className="w-3 h-3" /> Items ({order.items?.length || 0})
            </p>
            <div className="space-y-3">
              {(order.items || []).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3 group">
                  {item.productImage ? (
                    <div
                      className="w-11 h-11 rounded-xl overflow-hidden shrink-0 ring-1 ring-white/10 group-hover:ring-white/20 transition-all"
                      style={{ background: 'rgba(255,255,255,0.08)' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <Package className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-200 line-clamp-1">{item.productName}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{item.sellerName} · Qty: {item.quantity}</p>
                  </div>
                  <p className="text-xs font-bold text-white shrink-0">{formatCurrency(item.totalPrice)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <p className="text-[10px] font-semibold text-gray-500 mb-3 uppercase tracking-widest flex items-center gap-1.5">
              <CreditCard className="w-3 h-3" /> Payment
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-xs">Method</span>
                <span className={`font-bold text-xs ${PAYMENT_COLORS[order.paymentMethod] || 'text-white'}`}>{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-xs">Payment Status</span>
                <span className={`font-bold text-xs ${order.paymentStatus === 'PAID' ? 'text-green-400' : 'text-yellow-400'}`}>{order.paymentStatus}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-xs">Subtotal</span>
                <span className="text-gray-300 text-xs">{formatCurrency(order.subtotal)}</span>
              </div>
              {order.shippingFee > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs">Shipping</span>
                  <span className="text-gray-300 text-xs">{formatCurrency(order.shippingFee)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs">Discount</span>
                  <span className="text-green-400 text-xs font-semibold">-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div
                className="flex justify-between items-center pt-2.5 mt-1"
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span className="font-bold text-white text-sm">Total</span>
                <span className="font-black text-white text-base">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <p className="text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Dates
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Ordered</span>
                <span className="text-gray-300">{formatDate(order.createdAt)}</span>
              </div>
              {order.estimatedDelivery && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Est. Delivery</span>
                  <span className="text-gray-300">{formatDate(order.estimatedDelivery)}</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await orderApi.updateStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
      setSelectedOrder((prev: any) => prev?._id === orderId ? { ...prev, status: newStatus } : prev);
      toast({ title: 'Order status updated', description: `→ ${newStatus}` });
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    orderApi.listAll({ limit: 100 })
      .then(res => { if (Array.isArray(res.data.data)) setOrders(res.data.data); })
      .catch(() => {});
  }, []);

  const filtered = orders.filter(o => {
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.orderNumber?.toLowerCase().includes(q) || o.shippingAddress?.fullName?.toLowerCase().includes(q);
    }
    return true;
  });

  const totalRevenue = orders.filter(o => o.status === 'DELIVERED').reduce((s, o) => s + o.total, 0);

  const statCards = [
    {
      label: 'Total Orders',
      count: orders.length,
      value: null,
      icon: ShoppingBag,
      gradient: 'from-orange-500 to-amber-500',
      glow: 'hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.15)',
      iconBg: 'hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.15)',
      iconColor: 'text-orange-400',
    },
    {
      label: 'Pending',
      count: orders.filter(o => o.status === 'PENDING').length,
      value: null,
      icon: Clock,
      gradient: 'from-yellow-500 to-orange-400',
      glow: 'rgba(234,179,8,0.12)',
      iconBg: 'rgba(234,179,8,0.15)',
      iconColor: 'text-yellow-400',
    },
    {
      label: 'Delivered',
      count: orders.filter(o => o.status === 'DELIVERED').length,
      value: null,
      icon: Truck,
      gradient: 'from-green-500 to-emerald-400',
      glow: 'rgba(34,197,94,0.12)',
      iconBg: 'rgba(34,197,94,0.15)',
      iconColor: 'text-green-400',
    },
    {
      label: 'Revenue',
      count: null,
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      gradient: 'from-blue-500 to-cyan-400',
      glow: 'rgba(59,130,246,0.12)',
      iconBg: 'rgba(59,130,246,0.15)',
      iconColor: 'text-blue-400',
    },
  ];

  return (
    <div className="space-y-6">
      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
          updatingId={updatingId}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {orders.length} total &middot; {formatCurrency(totalRevenue)} delivered revenue
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
          style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.2)',
          }}
        >
          <TrendingUp className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs font-bold text-green-400">{formatCurrency(totalRevenue)}</span>
        </div>
      </div>

      {/* Glassmorphic stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="relative overflow-hidden rounded-2xl p-4 group transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(135deg, rgba(26,32,53,0.9) 0%, rgba(13,17,23,0.95) 100%)`,
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(16px)',
                boxShadow: `0 4px 24px ${s.glow}, 0 1px 0 rgba(255,255,255,0.05) inset`,
              }}
            >
              {/* Gradient overlay on hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300 pointer-events-none rounded-2xl`}
              />
              {/* Top accent line */}
              <div className={`absolute top-0 left-4 right-4 h-px bg-gradient-to-r ${s.gradient} opacity-40`} />

              <div className="relative flex items-start justify-between">
                <div>
                  {s.count !== null ? (
                    <p className="text-3xl font-black text-white tabular-nums leading-none">{s.count}</p>
                  ) : (
                    <p className="text-xl font-black text-white leading-none">{s.value}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5 font-medium">{s.label}</p>
                </div>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: s.iconBg }}
                >
                  <Icon className={`w-4 h-4 ${s.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            placeholder="Search by order # or customer..."
            className="w-full text-sm text-white placeholder:text-gray-600 pl-10 pr-4 py-2.5 rounded-xl transition-all focus:outline-none"
            style={{
              background: 'rgba(26,32,53,0.9)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(8px)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.08)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = 'none'; }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => {
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 shadow-lg ${
                  isActive
                    ? FILTER_TAB_STATUS_COLORS[s]
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]'
                }`}
                style={
                  isActive
                    ? { boxShadow: `0 4px 14px ${FILTER_TAB_STATUS_COLORS[s].includes('orange') ? 'hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.25)' : 'rgba(0,0,0,0.3)'}` }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }
                }
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(26,32,53,0.9) 0%, rgba(13,17,23,0.95) 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Order #', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', 'Update'].map(h => (
                  <th
                    key={h}
                    className="text-left px-5 py-3.5 text-[10px] font-bold text-gray-600 uppercase tracking-widest whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order, idx) => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                return (
                  <tr
                    key={order._id}
                    onClick={() => setSelectedOrder(order)}
                    className="group cursor-pointer transition-all duration-150"
                    style={{
                      borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                    }}
                  >
                    {/* Order # */}
                    <td className="px-5 py-4">
                      <span
                        className="font-mono text-xs font-black tracking-tight"
                        style={{ color: 'var(--ap, #f97316)' }}
                      >
                        {order.orderNumber || order._id}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-white leading-tight">{order.shippingAddress?.fullName}</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">{order.shippingAddress?.city}</p>
                    </td>

                    {/* Items */}
                    <td className="px-5 py-4">
                      <p className="text-xs text-gray-400 line-clamp-1 max-w-36">
                        {order.items?.[0]?.productName}
                        {order.items?.length > 1 && (
                          <span className="text-gray-600"> +{order.items.length - 1}</span>
                        )}
                      </p>
                    </td>

                    {/* Total */}
                    <td className="px-5 py-4">
                      <span className="text-sm font-black text-white">{formatCurrency(order.total)}</span>
                    </td>

                    {/* Payment */}
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold ${PAYMENT_COLORS[order.paymentMethod] || 'text-gray-400'}`}>
                        {order.paymentMethod}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {order.status}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4">
                      <span className="text-[11px] text-gray-500 whitespace-nowrap">{formatDate(order.createdAt)}</span>
                    </td>

                    {/* Update dropdown */}
                    <td className="px-5 py-4">
                      {updatingId === order._id ? (
                        <div className="flex items-center gap-2 pl-2.5">
                          <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--ap)', borderTopColor: 'transparent' }} />
                          <span className="text-[11px] text-gray-500">Saving…</span>
                        </div>
                      ) : (
                        <StatusSelect
                          value={order.status}
                          disabled={false}
                          onChange={v => handleStatusChange(order._id, v)}
                          compact
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {search ? (
                  <Search className="w-7 h-7 text-gray-600" />
                ) : (
                  <Truck className="w-7 h-7 text-gray-600" />
                )}
              </div>
              <p className="text-sm font-semibold text-gray-400">
                {search ? 'No orders match your search' : 'No orders found'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {search
                  ? `No results for "${search}"`
                  : statusFilter !== 'ALL'
                  ? `No ${statusFilter.toLowerCase()} orders at the moment`
                  : 'Orders will appear here once placed'}
              </p>
              {(search || statusFilter !== 'ALL') && (
                <button
                  onClick={() => { setSearch(''); setStatusFilter('ALL'); }}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-orange-400 transition-all hover:text-orange-300"
                  style={{
                    background: 'hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.1)',
                    border: '1px solid hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.2)',
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
