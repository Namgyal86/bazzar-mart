'use client';

import { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingDown, Search, ArrowUpDown, Edit2, Check, X } from 'lucide-react';

interface InventoryItem {
  _id: string;
  name: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  images: string[];
  basePrice: number;
  category: string;
  isActive: boolean;
}

const DEMO: InventoryItem[] = [
  { _id: '1', name: 'Wireless Earbuds Pro', sku: 'WE-001', stock: 45, lowStockThreshold: 10, images: [], basePrice: 3499, category: 'Electronics', isActive: true },
  { _id: '2', name: 'Mechanical Keyboard', sku: 'MK-002', stock: 3, lowStockThreshold: 10, images: [], basePrice: 7999, category: 'Electronics', isActive: true },
  { _id: '3', name: 'USB-C Hub 7-in-1', sku: 'UC-003', stock: 0, lowStockThreshold: 5, images: [], basePrice: 2299, category: 'Electronics', isActive: false },
  { _id: '4', name: 'Laptop Stand Aluminium', sku: 'LS-004', stock: 18, lowStockThreshold: 5, images: [], basePrice: 1899, category: 'Accessories', isActive: true },
  { _id: '5', name: 'Desk Lamp LED', sku: 'DL-005', stock: 7, lowStockThreshold: 10, images: [], basePrice: 1299, category: 'Accessories', isActive: true },
  { _id: '6', name: 'Cable Management Kit', sku: 'CM-006', stock: 62, lowStockThreshold: 15, images: [], basePrice: 599, category: 'Accessories', isActive: true },
];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/seller/inventory');
      const data = await res.json();
      setItems(data.data ?? DEMO);
    } catch {
      setItems(DEMO);
    } finally {
      setLoading(false);
    }
  }

  async function saveStock(id: string) {
    const qty = parseInt(editValue, 10);
    if (isNaN(qty) || qty < 0) return;
    setSaving(true);
    try {
      await fetch(`/api/v1/seller/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: qty }),
      });
      setItems(prev => prev.map(item => item._id === id ? { ...item, stock: qty } : item));
    } catch {
      setItems(prev => prev.map(item => item._id === id ? { ...item, stock: qty } : item));
    } finally {
      setSaving(false);
      setEditId(null);
    }
  }

  const filtered = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'out' && item.stock === 0) || (filter === 'low' && item.stock > 0 && item.stock <= item.lowStockThreshold);
    return matchSearch && matchFilter;
  });

  const outOfStock = items.filter(i => i.stock === 0).length;
  const lowStock = items.filter(i => i.stock > 0 && i.stock <= i.lowStockThreshold).length;
  const totalUnits = items.reduce((s, i) => s + i.stock, 0);
  const totalValue = items.reduce((s, i) => s + i.stock * i.basePrice, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-gray-500 text-sm mt-1">Track stock levels and update quantities</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-500">Total Products</span>
          </div>
          <p className="text-2xl font-bold">{items.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpDown className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-500">Total Units</span>
          </div>
          <p className="text-2xl font-bold">{totalUnits.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-gray-500">Low Stock</span>
          </div>
          <p className="text-2xl font-bold text-amber-500">{lowStock}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-gray-500">Out of Stock</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{outOfStock}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'low', 'out'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'}`}
            >
              {f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Product</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">SKU</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Category</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Price</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Stock</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No products found</td></tr>
            ) : filtered.map(item => {
              const isLow = item.stock > 0 && item.stock <= item.lowStockThreshold;
              const isOut = item.stock === 0;
              const isEditing = editId === item._id;

              return (
                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {item.images[0] ? <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-400" />}
                      </div>
                      <span className="font-medium text-gray-900 line-clamp-1">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{item.sku}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{item.category}</td>
                  <td className="px-4 py-3 text-right font-medium">Rs {item.basePrice.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="w-20 border border-orange-400 rounded px-2 py-1 text-right text-sm focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className={`font-semibold ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-gray-900'}`}>{item.stock}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isOut ? 'bg-red-100 text-red-700' : isLow ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => saveStock(item._id)} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditId(item._id); setEditValue(String(item.stock)); }}
                        className="p-1 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && items.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            Inventory value: <span className="font-semibold text-gray-900">Rs {totalValue.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
