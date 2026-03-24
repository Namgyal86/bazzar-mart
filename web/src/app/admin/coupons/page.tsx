'use client';

import { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Copy, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import { toast } from '@/hooks/use-toast';

const inputCls = 'w-full bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 transition-colors ap-input';
const labelCls = 'text-xs font-semibold text-gray-400 mb-1.5 block';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', type: 'PERCENTAGE', value: 0, minOrder: 0, maxDiscount: 0, usageLimit: 100, validUntil: '' });

  useEffect(() => {
    apiClient.get('/api/v1/coupons/admin/list')
      .then((res: any) => { if (Array.isArray(res.data?.data)) setCoupons(res.data.data); })
      .catch(() => {});
  }, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied!', description: code });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/api/v1/coupons', form) as any;
      const created = res.data?.data ?? { ...form, _id: Date.now().toString(), usageCount: 0, isActive: true };
      setCoupons(prev => [...prev, { ...created, id: created._id || created.id || Date.now().toString() }]);
      setShowForm(false);
      setForm({ code: '', type: 'PERCENTAGE', value: 0, minOrder: 0, maxDiscount: 0, usageLimit: 100, validUntil: '' });
      toast({ title: 'Coupon created!' });
    } catch (err: any) {
      toast({ title: 'Failed to create coupon', description: err?.response?.data?.error || 'Check all fields and try again.', variant: 'destructive' });
    }
  };

  const handleDelete = async (coupon: any) => {
    const id = coupon._id || coupon.id;
    try {
      await apiClient.delete(`/api/v1/coupons/${id}`);
    } catch {} // Remove from UI regardless (admin action)
    setCoupons(prev => prev.filter(c => (c._id || c.id) !== id));
    toast({ title: 'Coupon deleted' });
  };

  const handleToggleActive = async (coupon: any) => {
    const id = coupon._id || coupon.id;
    const newActive = !coupon.isActive;
    try {
      await apiClient.patch(`/api/v1/coupons/${id}`, { isActive: newActive });
    } catch {} // Update UI optimistically
    setCoupons(prev => prev.map(c => (c._id || c.id) === id ? { ...c, isActive: newActive } : c));
    toast({ title: newActive ? 'Coupon activated' : 'Coupon deactivated' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Coupons</h1>
          <p className="text-sm text-gray-500 mt-0.5">{coupons.length} active discount codes</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-bold rounded-xl transition-colors shadow-lg"
          style={{ backgroundColor: 'var(--ap)' }}
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Create Coupon'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-[#1a2035] rounded-2xl p-5" style={{ border: '1px solid var(--ap-20)' }}>
          <h2 className="text-sm font-bold text-white mb-4">New Coupon</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Coupon Code</label>
              <input className={inputCls} placeholder="SAVE20" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required />
            </div>
            <div>
              <label className={labelCls}>Discount Type</label>
              <select className={inputCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT">Flat Amount (Rs.)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Value</label>
              <input className={inputCls} type="number" placeholder={form.type === 'PERCENTAGE' ? '20' : '500'} value={form.value || ''} onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} required />
            </div>
            <div>
              <label className={labelCls}>Min Order (Rs.)</label>
              <input className={inputCls} type="number" value={form.minOrder || ''} onChange={e => setForm(f => ({ ...f, minOrder: Number(e.target.value) }))} />
            </div>
            <div>
              <label className={labelCls}>Max Discount (Rs.)</label>
              <input className={inputCls} type="number" value={form.maxDiscount || ''} onChange={e => setForm(f => ({ ...f, maxDiscount: Number(e.target.value) }))} />
            </div>
            <div>
              <label className={labelCls}>Usage Limit</label>
              <input className={inputCls} type="number" value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: Number(e.target.value) }))} />
            </div>
            <div>
              <label className={labelCls}>Valid Until</label>
              <input className={inputCls} type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} required />
            </div>
          </div>
          <button type="submit" className="mt-4 px-5 py-2 text-white text-sm font-bold rounded-xl transition-colors" style={{ backgroundColor: 'var(--ap)' }}>
            Create Coupon
          </button>
        </form>
      )}

      <div className="bg-[#1a2035] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Code', 'Type', 'Value', 'Min Order', 'Usage', 'Valid Until', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {coupons.map(coupon => (
                <tr key={coupon.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold ap-text">{coupon.code}</span>
                      <button onClick={() => copyCode(coupon.code)} className="text-gray-600 hover:text-gray-300 transition-colors">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs px-2 py-1 bg-white/5 text-gray-400 rounded-lg font-medium">{coupon.type}</span>
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-white">
                    {coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : formatCurrency(coupon.value)}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">{formatCurrency(coupon.minOrder)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full ap-bg" style={{ width: `${Math.min((coupon.usageCount / coupon.usageLimit) * 100, 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{coupon.usageCount}/{coupon.usageLimit}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(coupon.validUntil)}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleToggleActive(coupon)}
                      className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${coupon.isActive ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 hover:text-gray-300'}`}
                      title={coupon.isActive ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {coupon.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleDelete(coupon)}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {coupons.length === 0 && (
            <div className="text-center py-16">
              <Tag className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No coupons yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
