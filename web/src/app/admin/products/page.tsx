'use client';

import { useState, useEffect } from 'react';
import { Search, Package, Eye, Trash2, Star, Loader2, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { productApi } from '@/lib/api/product.api';
import { toast } from '@/hooks/use-toast';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    productApi.list({ limit: 100 })
      .then((res: any) => {
        const p = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.products ?? []);
        setProducts(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await productApi.delete(id);
      setProducts(prev => prev.filter(p => (p._id || p.id) !== id));
      toast({ title: 'Product deleted' });
    } catch {
      toast({ title: 'Error', description: 'Could not delete product', variant: 'destructive' });
    }
  };

  const filtered = products.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()));

  const stockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', cls: 'bg-red-500/10 text-red-400' };
    if (stock < 5) return { label: `Low (${stock})`, cls: 'bg-yellow-500/10 text-yellow-400' };
    return { label: stock.toString(), cls: 'bg-green-500/10 text-green-400' };
  };

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
          <h1 className="text-2xl font-black text-white">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} products on platform</p>
        </div>
        <Link href="/admin/products/new">
          <button
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          placeholder="Search products..."
          className="w-full bg-[#1a2035] border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 transition-colors"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-[#1a2035] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Product', 'Category', 'Seller', 'Price', 'Stock', 'Rating', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(product => {
                const pid = product._id || product.id;
                const image = product.images?.[0] || '';
                const salePrice = product.salePrice || product.price;
                const stock = stockStatus(product.stock ?? 0);
                return (
                  <tr key={pid} className="hover:bg-white/3 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white/5 shrink-0">
                          {image
                            ? <Image src={image} alt={product.name} fill className="object-cover" sizes="40px" />
                            : <Package className="w-5 h-5 text-gray-600 absolute inset-0 m-auto" />}
                        </div>
                        <p className="text-sm font-semibold text-white line-clamp-1 max-w-[180px]">{product.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs px-2 py-1 bg-white/5 text-gray-400 rounded-lg">
                        {product.category?.name || product.category || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {product.seller?.storeName || product.sellerName || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-white">{formatCurrency(salePrice)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${stock.cls}`}>{stock.label}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-semibold text-white">{product.rating?.toFixed(1)}</span>
                        <span className="text-xs text-gray-600">({product.reviewCount ?? 0})</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        <Link href={`/products/${pid}`}>
                          <button className="w-8 h-8 rounded-xl bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 flex items-center justify-center transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDelete(pid, product.name)}
                          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Package className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No products found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
