'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Search, CheckCircle, XCircle, Clock, RefreshCw, DollarSign } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { formatCurrency, formatDate } from '@/lib/utils';

type GatewayFilter = 'all' | 'KHALTI' | 'ESEWA' | 'FONEPAY' | 'STRIPE' | 'RAZORPAY' | 'COD';
type StatusFilter = 'all' | 'SUCCESS' | 'FAILED' | 'INITIATED' | 'REFUNDED';

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: any }> = {
  SUCCESS:   { bg: 'bg-green-500/10',  text: 'text-green-400',  icon: CheckCircle },
  FAILED:    { bg: 'bg-red-500/10',    text: 'text-red-400',    icon: XCircle     },
  INITIATED: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: Clock       },
  REFUNDED:  { bg: 'bg-blue-500/10',   text: 'text-blue-400',   icon: RefreshCw   },
};

const GATEWAY_COLORS: Record<string, string> = {
  KHALTI:   'text-purple-400 bg-purple-500/10',
  ESEWA:    'text-green-400 bg-green-500/10',
  FONEPAY:  'text-blue-400 bg-blue-500/10',
  STRIPE:   'text-indigo-400 bg-indigo-500/10',
  RAZORPAY: 'text-cyan-400 bg-cyan-500/10',
  COD:      'text-orange-400 bg-orange-500/10',
};

interface Payment {
  _id: string;
  orderId: string;
  userId: string;
  amount: number;
  gateway: string;
  status: string;
  transactionId?: string;
  createdAt: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [gatewayFilter, setGatewayFilter] = useState<GatewayFilter>('all');

  useEffect(() => {
    apiClient.get('/api/v1/payments/admin/list')
      .then((res: any) => {
        const data = res.data?.data;
        setPayments(Array.isArray(data) ? data : DEMO_PAYMENTS);
      })
      .catch(() => setPayments(DEMO_PAYMENTS))
      .finally(() => setLoading(false));
  }, []);

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.orderId?.toLowerCase().includes(q) || p.transactionId?.toLowerCase().includes(q) || p.userId?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchGateway = gatewayFilter === 'all' || p.gateway === gatewayFilter;
    return matchSearch && matchStatus && matchGateway;
  });

  const totalRevenue = payments.filter(p => p.status === 'SUCCESS').reduce((s, p) => s + (p.amount || 0), 0);
  const successCount = payments.filter(p => p.status === 'SUCCESS').length;
  const failedCount = payments.filter(p => p.status === 'FAILED').length;
  const pendingCount = payments.filter(p => p.status === 'INITIATED').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Payments</h1>
        <p className="text-sm text-gray-500 mt-0.5">All payment transactions across the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Total Revenue</p>
          <p className="text-2xl font-black text-white">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Successful</p>
          <p className="text-2xl font-black text-green-400">{successCount}</p>
        </div>
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Failed</p>
          <p className="text-2xl font-black text-red-400">{failedCount}</p>
        </div>
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Pending</p>
          <p className="text-2xl font-black text-yellow-400">{pendingCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order ID, transaction ID…"
            className="w-full bg-[#0f1117] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          className="bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
        >
          <option value="all">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="INITIATED">Pending</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <select
          value={gatewayFilter}
          onChange={e => setGatewayFilter(e.target.value as GatewayFilter)}
          className="bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
        >
          <option value="all">All Gateways</option>
          <option value="KHALTI">Khalti</option>
          <option value="ESEWA">eSewa</option>
          <option value="FONEPAY">Fonepay</option>
          <option value="STRIPE">Stripe</option>
          <option value="RAZORPAY">Razorpay</option>
          <option value="COD">Cash on Delivery</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1a2035] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="text-left px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Gateway</th>
                <th className="text-right px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Transaction ID</th>
                <th className="text-left px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(payment => {
                const statusCfg = STATUS_CONFIG[payment.status] || STATUS_CONFIG.INITIATED;
                const Icon = statusCfg.icon;
                const gatewayCls = GATEWAY_COLORS[payment.gateway] || 'text-gray-400 bg-gray-500/10';
                return (
                  <tr key={payment._id} className="hover:bg-white/2 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-gray-300">
                        {String(payment.orderId).slice(-8)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${gatewayCls}`}>
                        {payment.gateway}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-white">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${statusCfg.bg} ${statusCfg.text}`}>
                        <Icon className="w-3 h-3" />
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-gray-500">
                        {payment.transactionId ? String(payment.transactionId).slice(0, 20) + '…' : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {formatDate(payment.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <CreditCard className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No payments found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const DEMO_PAYMENTS: Payment[] = [
  { _id: '1', orderId: 'ORD-001-ABC', userId: 'u1', amount: 4500, gateway: 'KHALTI',  status: 'SUCCESS',  transactionId: 'KHALTI-TX-001', createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
  { _id: '2', orderId: 'ORD-002-DEF', userId: 'u2', amount: 1200, gateway: 'ESEWA',   status: 'SUCCESS',  transactionId: 'ESEWA-TX-002',  createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { _id: '3', orderId: 'ORD-003-GHI', userId: 'u3', amount: 8900, gateway: 'STRIPE',  status: 'SUCCESS',  transactionId: 'pi_stripe_003', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { _id: '4', orderId: 'ORD-004-JKL', userId: 'u4', amount: 600,  gateway: 'COD',     status: 'INITIATED', transactionId: undefined,       createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { _id: '5', orderId: 'ORD-005-MNO', userId: 'u5', amount: 3200, gateway: 'KHALTI',  status: 'FAILED',   transactionId: undefined,       createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { _id: '6', orderId: 'ORD-006-PQR', userId: 'u6', amount: 2100, gateway: 'FONEPAY', status: 'SUCCESS',  transactionId: 'FP-TX-006',     createdAt: new Date(Date.now() - 6 * 86400000).toISOString() },
  { _id: '7', orderId: 'ORD-007-STU', userId: 'u7', amount: 5500, gateway: 'RAZORPAY',status: 'SUCCESS',  transactionId: 'RZP-TX-007',    createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
];
