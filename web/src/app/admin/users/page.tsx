'use client';

import { useState, useEffect } from 'react';
import { Search, Shield, ShoppingBag, Store, Bike, Ban, CheckCircle, Users, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';

const ROLE_CONFIG: Record<string, { icon: any; gradient: string; bg: string; text: string }> = {
  ADMIN:    { icon: Shield,    gradient: 'from-purple-500 to-violet-600', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  SELLER:   { icon: Store,     gradient: 'from-blue-500 to-cyan-600',     bg: 'bg-blue-500/10',   text: 'text-blue-400' },
  BUYER:    { icon: ShoppingBag, gradient: 'from-green-500 to-emerald-600', bg: 'bg-green-500/10', text: 'text-green-400' },
  DELIVERY: { icon: Bike,      gradient: 'from-orange-500 to-amber-600',  bg: 'bg-orange-500/10', text: 'text-orange-400' },
};

const AVATAR_GRADIENTS = [
  'from-brand-500 to-red-500', 'from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500',
  'from-green-500 to-teal-500', 'from-yellow-500 to-orange-500',
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get('/api/v1/users/admin/list', { params: { limit: 100 } })
      .then(res => { setUsers(Array.isArray(res.data.data) ? res.data.data : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (userId: string, isActive: boolean) => {
    setTogglingId(userId);
    try {
      await apiClient.put(`/api/v1/users/admin/${userId}/status`, { isActive: !isActive });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: !isActive } : u));
    } catch {
      // silently fail — status unchanged
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = users.filter(u => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.email?.toLowerCase().includes(q) || u.firstName?.toLowerCase().includes(q) || u.lastName?.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = [
    { label: 'Total Users', value: users.length, gradient: 'from-brand-500 to-red-500' },
    { label: 'Buyers', value: users.filter(u => u.role === 'BUYER').length, gradient: 'from-green-500 to-emerald-500' },
    { label: 'Sellers', value: users.filter(u => u.role === 'SELLER').length, gradient: 'from-blue-500 to-cyan-500' },
    { label: 'Active Now', value: users.filter(u => u.isActive).length, gradient: 'from-purple-500 to-violet-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} registered accounts</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-[#1a2035] border border-white/5 rounded-2xl p-4 relative overflow-hidden group hover:border-brand-500/20 transition-all">
            <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
            <p className="text-3xl font-black text-white relative">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1 relative">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            placeholder="Search by name or email..."
            className="w-full bg-[#1a2035] border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 transition-colors"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['ALL', 'BUYER', 'SELLER', 'ADMIN', 'DELIVERY'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                roleFilter === r
                  ? 'text-white shadow-lg'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
              style={roleFilter === r ? { backgroundColor: 'var(--ap)' } : {}}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1a2035] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Referral</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((user, i) => {
                const cfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.BUYER;
                const Icon = cfg.icon;
                const grad = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
                const isToggling = togglingId === user._id;
                return (
                  <tr key={user._id} className="hover:bg-white/3 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-sm shadow-lg shrink-0`}>
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                        <Icon className="w-3 h-3" />{user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {user.isActive
                        ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400"><div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />Active</span>
                        : <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400"><div className="w-1.5 h-1.5 bg-red-400 rounded-full" />Inactive</span>}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-600 bg-white/3 rounded-lg">{user.referralCode || '—'}</td>
                    <td className="px-5 py-4 text-right">
                      {user.role !== 'ADMIN' && (
                        <button
                          onClick={() => toggleStatus(user._id, user.isActive)}
                          disabled={isToggling}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                            user.isActive
                              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          }`}
                        >
                          {isToggling ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : user.isActive ? (
                            <><Ban className="w-3 h-3" /> Ban</>
                          ) : (
                            <><CheckCircle className="w-3 h-3" /> Activate</>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No users found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
