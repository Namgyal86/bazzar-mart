'use client';

import { useState, useEffect, useRef } from 'react';
import { Zap, Plus, Trash2, Search, X, Clock, Tag, TrendingDown, Package, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils';

// ─── Countdown ────────────────────────────────────────────────────────────────

function useCountdown(endsAt: string | undefined) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    if (!endsAt) { setLeft('No expiry'); return; }
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setLeft('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 24) {
        const d = Math.floor(h / 24);
        setLeft(`${d}d ${h % 24}h`);
      } else {
        setLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return left;
}

function CountdownBadge({ endsAt }: { endsAt?: string }) {
  const left = useCountdown(endsAt);
  const expired = left === 'Expired';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold ${
      expired ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
    }`}>
      <Clock className="w-3 h-3 shrink-0" />
      {left}
    </span>
  );
}

// ─── Add Deal Modal ────────────────────────────────────────────────────────────

function AddDealModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [salePrice, setSalePrice] = useState('');
  const [duration, setDuration] = useState('24'); // hours
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Load all products initially
    apiClient.get('/api/v1/products?limit=50')
      .then((r: any) => setProducts(r.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setSearching(true);
      const q = search.trim() ? `&search=${encodeURIComponent(search)}` : '';
      apiClient.get(`/api/v1/products?limit=50${q}`)
        .then((r: any) => setProducts(r.data.data || []))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
  }, [search]);

  const discount = selected && salePrice
    ? Math.round(((selected.price - Number(salePrice)) / selected.price) * 100)
    : 0;

  const handleSave = async () => {
    if (!selected) return setError('Pick a product first');
    const sp = Number(salePrice);
    if (!sp || sp <= 0) return setError('Enter a valid sale price');
    if (sp >= selected.price) return setError('Sale price must be below the regular price');
    setSaving(true);
    setError('');
    try {
      const endsAt = duration !== '0'
        ? new Date(Date.now() + Number(duration) * 3600 * 1000).toISOString()
        : undefined;
      await apiClient.put(`/api/v1/products/admin/flash-deal/${selected._id}`, { salePrice: sp, dealEndsAt: endsAt });
      onAdded();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px rgba(0,0,0,0.8)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Add Flash Deal</h2>
              <p className="text-xs text-gray-500">Pick a product and set a discounted price</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-500 hover:text-white hover:bg-white/8 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Product search */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Search Product</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search products…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>

            {/* Product list */}
            <div className="mt-2 max-h-48 overflow-y-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              {searching ? (
                <div className="py-6 text-center text-xs text-gray-600">Searching…</div>
              ) : products.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-600">No products found</div>
              ) : products.map((p) => (
                <button
                  key={p._id}
                  onClick={() => { setSelected(p); setSalePrice(''); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  style={{
                    background: selected?._id === p._id ? 'rgba(var(--ap-rgb,124,58,237),0.15)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-white/5">
                    {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(p.price)}{p.salePrice ? ` · Sale: ${formatCurrency(p.salePrice)}` : ''}</p>
                  </div>
                  {selected?._id === p._id && (
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--ap)' }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Selected product deal config */}
          {selected && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">
                  Sale Price <span className="text-gray-600 font-normal">(regular: {formatCurrency(selected.price)})</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">Rs</span>
                  <input
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="0"
                    min="1"
                    max={selected.price - 1}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
                {discount > 0 && (
                  <p className="text-xs text-green-400 mt-1.5 font-semibold">
                    {discount}% off · saves {formatCurrency(selected.price - Number(salePrice))}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Deal Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <option value="6" style={{ background: '#0d1117' }}>6 hours</option>
                  <option value="12" style={{ background: '#0d1117' }}>12 hours</option>
                  <option value="24" style={{ background: '#0d1117' }}>24 hours (1 day)</option>
                  <option value="48" style={{ background: '#0d1117' }}>48 hours (2 days)</option>
                  <option value="72" style={{ background: '#0d1117' }}>72 hours (3 days)</option>
                  <option value="168" style={{ background: '#0d1117' }}>1 week</option>
                  <option value="0" style={{ background: '#0d1117' }}>No expiry</option>
                </select>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs text-red-400 font-medium" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/8 transition-all">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selected || !salePrice}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))', boxShadow: '0 4px 16px var(--ap, #7c3aed)44' }}
          >
            <Zap className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Launch Deal'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Deal Row ─────────────────────────────────────────────────────────────────

function DealRow({ deal, onRemove }: { deal: any; onRemove: (id: string) => void }) {
  const discount = Math.round(((deal.price - deal.salePrice) / deal.price) * 100);
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await apiClient.delete(`/api/v1/products/admin/flash-deal/${deal._id}`);
      onRemove(deal._id);
    } catch {
      setRemoving(false);
    }
  };

  return (
    <tr className="hover:bg-white/3 transition-colors group">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-white/5">
            {deal.images?.[0] && <img src={deal.images[0]} alt={deal.name} className="w-full h-full object-cover" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-white line-clamp-1">{deal.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{deal.category}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-black text-white">{formatCurrency(deal.salePrice)}</span>
          <span className="text-xs text-gray-600 line-through">{formatCurrency(deal.price)}</span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-green-500/10 text-green-400">
          <TrendingDown className="w-3 h-3" /> -{discount}%
        </span>
      </td>
      <td className="px-5 py-3.5">
        <CountdownBadge endsAt={deal.dealEndsAt} />
      </td>
      <td className="px-5 py-3.5">
        <span className={`text-xs font-semibold ${deal.stock > 0 ? 'text-gray-400' : 'text-red-400'}`}>
          {deal.stock > 0 ? `${deal.stock} in stock` : 'Out of stock'}
        </span>
      </td>
      <td className="px-5 py-3.5 text-right">
        <button
          onClick={handleRemove}
          disabled={removing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {removing ? 'Removing…' : 'Remove'}
        </button>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FlashDealsPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchDeals = () => {
    setLoading(true);
    apiClient.get('/api/v1/products/admin/flash-deals')
      .then((r: any) => setDeals(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDeals(); }, []);

  const removeFromList = (id: string) => setDeals((prev) => prev.filter((d) => d._id !== id));

  const activeCount = deals.filter((d) => !d.dealEndsAt || new Date(d.dealEndsAt) > new Date()).length;
  const totalSaved = deals.reduce((sum, d) => sum + (d.price - d.salePrice), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Zap className="w-6 h-6" style={{ color: 'var(--ap)' }} />
            Flash Deals
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Set limited-time discounts on products</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))', boxShadow: '0 4px 16px var(--ap, #7c3aed)44' }}
        >
          <Plus className="w-4 h-4" /> Add Deal
        </button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Deals', value: activeCount, icon: Zap, color: 'from-amber-500 to-orange-500' },
          { label: 'Total Deals', value: deals.length, icon: Tag, color: 'from-blue-500 to-cyan-500' },
          { label: 'Avg. Discount', value: deals.length ? `${Math.round(deals.reduce((s, d) => s + ((d.price - d.salePrice) / d.price) * 100, 0) / deals.length)}%` : '—', icon: TrendingDown, color: 'from-green-500 to-emerald-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-4 flex items-center gap-4" style={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-black text-white">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-bold text-white">Current Deals</span>
            <span className="text-xs text-gray-600">({deals.length})</span>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-600">
            <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
            <p className="text-sm">Loading deals…</p>
          </div>
        ) : deals.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Zap className="w-7 h-7 text-gray-600" />
            </div>
            <p className="text-sm font-semibold text-gray-500">No flash deals yet</p>
            <p className="text-xs text-gray-600">Click "Add Deal" to create your first flash deal</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Your First Deal
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Product', 'Sale Price', 'Discount', 'Ends In', 'Stock', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {deals.map((deal) => (
                  <DealRow key={deal._id} deal={deal} onRemove={removeFromList} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <AddDealModal onClose={() => setShowModal(false)} onAdded={fetchDeals} />}
    </div>
  );
}
