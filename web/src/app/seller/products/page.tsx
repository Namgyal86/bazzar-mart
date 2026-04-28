'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit2, Trash2, Eye, TrendingUp, Package, Upload, X, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { sellerApi } from '@/lib/api/seller.api';
import { apiClient, getErrorMessage } from '@/lib/api/client';
import { toast } from '@/hooks/use-toast';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.12)]',
  OUT_OF_STOCK: 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.12)]',
  LOW_STOCK: 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.12)]',
  INACTIVE: 'bg-gray-500/15 text-gray-400 border border-gray-500/30',
};

function DeleteConfirmModal({ product, onConfirm, onClose }: { product: any; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div
        className="bg-[#131929] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-[0_32px_64px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-200"
        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 64px rgba(0,0,0,0.6)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(239,68,68,0.15)]">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-white tracking-tight">Delete Product</h3>
            <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-gray-400 mb-5 leading-relaxed">
          Are you sure you want to delete <span className="font-semibold text-white">{product.name}</span>? It will be permanently removed from your store.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-400 bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 rounded-xl transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-xl transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function CsvImportModal({ onClose, onImported }: { onClose: () => void; onImported: (count: number) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
      return obj;
    }).filter(r => r.name || r.Name);
  };

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = parseCSV(e.target?.result as string);
      setPreview(rows.slice(0, 3));
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const rows = parseCSV(e.target?.result as string);
        let imported = 0;
        for (const row of rows) {
          const name = row.name || row.Name;
          const price = parseFloat(row.price || row.Price || '0');
          const stock = parseInt(row.stock || row.Stock || '0', 10);
          if (!name) continue;
          await apiClient.post('/api/v1/seller/products', {
            name,
            basePrice: price,
            salePrice: price,
            stock,
            sku: row.sku || row.SKU || `SKU-${Date.now()}-${imported}`,
            description: row.description || row.Description || name,
            category: row.category || row.Category || 'General',
          });
          imported++;
        }
        onImported(imported);
      } catch (err) {
        toast({ title: 'Import failed', description: getErrorMessage(err), variant: 'destructive' });
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div
        className="bg-[#131929] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-[0_32px_64px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-200"
        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 64px rgba(0,0,0,0.6)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-white tracking-tight">Import Products via CSV</h3>
            <p className="text-xs text-gray-500 mt-0.5">Bulk upload products from a spreadsheet</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/8 border border-transparent hover:border-white/10 transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4 p-3.5 bg-blue-500/8 border border-blue-500/20 rounded-xl text-xs text-blue-300">
          Required columns: <span className="font-mono font-semibold text-blue-200">name, price, stock</span><br />
          Optional: <span className="font-mono text-blue-400">sku, description, category</span>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          className="group border-2 border-dashed border-white/10 hover:border-blue-500/50 bg-white/[0.01] hover:bg-blue-500/5 rounded-xl p-8 text-center cursor-pointer transition-all duration-300 mb-4"
        >
          <div className="w-12 h-12 bg-white/5 group-hover:bg-blue-500/10 border border-white/10 group-hover:border-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 transition-all duration-300">
            <Upload className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors duration-300" />
          </div>
          {file ? (
            <p className="text-sm text-blue-400 font-medium">{file.name}</p>
          ) : (
            <>
              <p className="text-sm text-gray-400 font-medium">Click to select a CSV file</p>
              <p className="text-xs text-gray-600 mt-1">or drag and drop</p>
            </>
          )}
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>

        {preview.length > 0 && (
          <div className="mb-4 text-xs text-gray-500">
            <p className="font-semibold text-gray-400 mb-1.5">Preview (first 3 rows):</p>
            <div className="bg-[#0d1117] border border-white/8 rounded-lg p-3 font-mono space-y-1.5">
              {preview.map((r, i) => (
                <p key={i} className="text-gray-400">
                  <span className="text-white">{r.name || r.Name}</span>
                  <span className="text-gray-600"> — </span>
                  <span className="text-blue-400">{r.price || r.Price}</span>
                  <span className="text-gray-600"> — stock: </span>
                  <span className="text-emerald-400">{r.stock || r.Stock}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-400 bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 rounded-xl transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:shadow-none"
          >
            {importing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Importing…
              </span>
            ) : 'Import Products'}
          </button>
        </div>
      </div>
    </div>
  );
}

const FILTER_OPTIONS = ['ALL', 'ACTIVE', 'LOW_STOCK', 'OUT_OF_STOCK'];

export default function SellerProductsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [products, setProducts] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCsvModal, setShowCsvModal] = useState(false);

  const loadProducts = () => {
    sellerApi.getProducts({ limit: 50 })
      .then(res => {
        const prods: any[] = Array.isArray((res.data as any).data) ? (res.data as any).data : [];
        setProducts(prods.map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          sku: p.sku || '-',
          price: p.salePrice || p.basePrice || p.price,
          stock: p.stock ?? p.stockQuantity ?? 0,
          sales: p.soldCount || 0,
          status: (p.stock ?? p.stockQuantity ?? 0) === 0 ? 'OUT_OF_STOCK' : (p.stock ?? p.stockQuantity ?? 0) < 5 ? 'LOW_STOCK' : 'ACTIVE',
          category: p.category?.name || p.category || 'General',
          image: p.images?.[0] || '',
        })));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  };

  useEffect(() => { loadProducts(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/api/v1/seller/products/${id}`);
      setProducts(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Product deleted' });
    } catch (err) {
      toast({ title: 'Delete failed', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0d1117 0%, #0f1520 50%, #0d1117 100%)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Products</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loaded ? (
              <span>
                <span className="text-gray-400 font-medium">{products.length}</span> total products
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                Loading products…
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setShowCsvModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/8 hover:border-white/20 hover:text-white transition-all duration-200"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <Link
            href="/seller/products/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" /> Add Product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 max-w-sm relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-blue-400 transition-colors duration-200" />
          <input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0d1117] border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-[#0d1117] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] transition-all duration-200"
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {FILTER_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                statusFilter === s
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-white/5 border border-white/8 text-gray-500 hover:bg-white/8 hover:border-white/15 hover:text-gray-300'
              }`}
            >
              {s === 'ALL' ? 'All Products' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
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
                <th className="text-left px-5 py-4 font-semibold">Product</th>
                <th className="text-left px-5 py-4 font-semibold">SKU</th>
                <th className="text-left px-5 py-4 font-semibold">Price</th>
                <th className="text-left px-5 py-4 font-semibold">Stock</th>
                <th className="text-left px-5 py-4 font-semibold">Sales</th>
                <th className="text-left px-5 py-4 font-semibold">Status</th>
                <th className="text-left px-5 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loaded ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-xl animate-pulse" />
                        <div className="space-y-2">
                          <div className="h-3.5 w-36 bg-white/5 rounded-lg animate-pulse" />
                          <div className="h-2.5 w-20 bg-white/[0.03] rounded-lg animate-pulse" />
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-3 w-16 bg-white/5 rounded-lg animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                filtered.map((product) => (
                  <tr
                    key={product.id}
                    className="group transition-all duration-150"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 border border-white/8 rounded-xl flex items-center justify-center text-xl shrink-0 overflow-hidden">
                          {product.image?.startsWith('http') || product.image?.startsWith('/')
                            ? <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                            : <Package className="w-4.5 h-4.5 text-gray-600" />}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-200 line-clamp-1 text-[13px]">{product.name}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600 font-mono text-[11px] tracking-wide">{product.sku}</td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-blue-400 text-[13px]">{formatCurrency(product.price)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-semibold text-[13px] ${product.stock === 0 ? 'text-red-400' : product.stock < 10 ? 'text-amber-400' : 'text-gray-300'}`}>
                          {product.stock}
                        </span>
                        {product.stock < 10 && product.stock > 0 && (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-medium">low</span>
                        )}
                        {product.stock === 0 && (
                          <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-md font-medium">out</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[13px]">{product.sales}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${STATUS_STYLES[product.status]}`}>
                        {product.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/products/${product.id}`}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all duration-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/seller/products/${product.id}/edit`}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all duration-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => setDeletingId(product.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {loaded && filtered.length === 0 && (
          <div className="text-center py-20">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center border border-white/8"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <Package className="w-7 h-7 text-gray-600" />
            </div>
            <p className="text-gray-400 font-semibold text-[15px]">
              {products.length === 0 ? "No products yet" : 'No products match your search'}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              {products.length === 0
                ? "Start by adding your first product to your store"
                : "Try adjusting your search or filter criteria"}
            </p>
            {products.length === 0 && (
              <Link
                href="/seller/products/new"
                className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" /> Add your first product
              </Link>
            )}
          </div>
        )}
      </div>

      {deletingId && (
        <DeleteConfirmModal
          product={products.find(p => p.id === deletingId)!}
          onConfirm={() => handleDelete(deletingId)}
          onClose={() => setDeletingId(null)}
        />
      )}

      {showCsvModal && (
        <CsvImportModal
          onClose={() => setShowCsvModal(false)}
          onImported={(count) => {
            setShowCsvModal(false);
            toast({ title: `${count} product${count !== 1 ? 's' : ''} imported!` });
            loadProducts();
          }}
        />
      )}
    </div>
  );
}
