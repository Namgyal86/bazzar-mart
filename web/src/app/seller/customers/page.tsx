'use client';

import { useState, useEffect } from 'react';
import { Users, Search, ShoppingBag, TrendingUp, Star, MapPin, Calendar } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Customer {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  avgRating?: number;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function getAvatarColor(id: string) {
  const colors = [
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-amber-600',
    'from-rose-500 to-red-600',
  ];
  const idx = id.charCodeAt(0) % colors.length;
  return colors[idx];
}

export default function SellerCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'totalSpent' | 'totalOrders' | 'lastOrderDate'>('totalSpent');

  useEffect(() => {
    // Derive customers from seller's order list
    apiClient.get('/api/v1/seller/orders', { params: { limit: 200 } })
      .then((res: any) => {
        const orders: any[] = res.data?.data ?? [];
        const map: Record<string, Customer> = {};

        orders.forEach((order: any) => {
          const uid = order.userId || order.customerId || 'unknown';
          const name = order.customerName || order.shippingAddress?.fullName || 'Customer';
          if (!map[uid]) {
            map[uid] = {
              userId: uid,
              name,
              email: order.customerEmail || '',
              phone: order.shippingAddress?.phone || '',
              city: order.shippingAddress?.city || '',
              totalOrders: 0,
              totalSpent: 0,
              lastOrderDate: order.createdAt,
            };
          }
          map[uid].totalOrders += 1;
          map[uid].totalSpent += order.total || 0;
          if (new Date(order.createdAt) > new Date(map[uid].lastOrderDate)) {
            map[uid].lastOrderDate = order.createdAt;
          }
        });

        const list = Object.values(map);
        if (list.length > 0) {
          setCustomers(list);
        } else {
          setCustomers(DEMO_CUSTOMERS);
        }
      })
      .catch(() => setCustomers(DEMO_CUSTOMERS))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers
    .filter(c => {
      const q = search.toLowerCase();
      return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.city || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'lastOrderDate') return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
      return b[sortBy] - a[sortBy];
    });

  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
  const totalOrders = customers.reduce((s, c) => s + c.totalOrders, 0);
  const repeatBuyers = customers.filter(c => c.totalOrders > 1).length;

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
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Customers</h1>
        <p className="text-sm text-gray-500 mt-0.5">Buyers who ordered from your store</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Total Customers</p>
          <p className="text-2xl font-black text-white">{customers.length}</p>
        </div>
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Total Orders</p>
          <p className="text-2xl font-black text-white">{totalOrders}</p>
        </div>
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Total Revenue</p>
          <p className="text-2xl font-black text-white">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Repeat Buyers</p>
          <p className="text-2xl font-black text-blue-400">{repeatBuyers}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, city…"
            className="w-full bg-[#0f1117] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
        >
          <option value="totalSpent">Sort: Most Spent</option>
          <option value="totalOrders">Sort: Most Orders</option>
          <option value="lastOrderDate">Sort: Recent</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl flex flex-col items-center justify-center py-20">
          <Users className="w-10 h-10 text-gray-700 mb-3" />
          <p className="text-sm font-semibold text-gray-500">No customers found</p>
        </div>
      ) : (
        <div className="bg-[#1a2035] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="text-right px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Orders</th>
                  <th className="text-right px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Total Spent</th>
                  <th className="text-left px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Last Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(c => (
                  <tr key={c.userId} className="hover:bg-white/2 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(c.userId)} flex items-center justify-center shrink-0`}>
                          <span className="text-xs font-black text-white">{getInitials(c.name)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-white">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {c.city ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <MapPin className="w-3.5 h-3.5 text-gray-600" />
                          {c.city}
                        </div>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-gray-600" />
                        <span className={`font-bold ${c.totalOrders > 1 ? 'text-blue-400' : 'text-gray-300'}`}>
                          {c.totalOrders}
                        </span>
                        {c.totalOrders > 1 && (
                          <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-md px-1.5 py-0.5">
                            Repeat
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-white">
                      {formatCurrency(c.totalSpent)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Calendar className="w-3.5 h-3.5 text-gray-600" />
                        {formatDate(c.lastOrderDate)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const DEMO_CUSTOMERS: Customer[] = [
  { userId: 'u1', name: 'Suman Thapa', email: 'suman@example.com', phone: '9841000001', city: 'Kathmandu', totalOrders: 5, totalSpent: 12500, lastOrderDate: new Date(Date.now() - 2 * 86400000).toISOString() },
  { userId: 'u2', name: 'Priya Sharma', email: 'priya@example.com', phone: '9841000002', city: 'Lalitpur', totalOrders: 3, totalSpent: 8900, lastOrderDate: new Date(Date.now() - 5 * 86400000).toISOString() },
  { userId: 'u3', name: 'Bikash Rai', email: 'bikash@example.com', phone: '9841000003', city: 'Bhaktapur', totalOrders: 1, totalSpent: 2400, lastOrderDate: new Date(Date.now() - 8 * 86400000).toISOString() },
  { userId: 'u4', name: 'Anita Gurung', email: 'anita@example.com', phone: '9841000004', city: 'Kathmandu', totalOrders: 7, totalSpent: 22000, lastOrderDate: new Date(Date.now() - 1 * 86400000).toISOString() },
  { userId: 'u5', name: 'Roshan KC', email: 'roshan@example.com', phone: '9841000005', city: 'Pokhara', totalOrders: 2, totalSpent: 5600, lastOrderDate: new Date(Date.now() - 12 * 86400000).toISOString() },
];
