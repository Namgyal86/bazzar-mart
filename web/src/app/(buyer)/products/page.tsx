'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { SlidersHorizontal, Star, Heart, ShoppingCart, Grid, List, Loader2, X, Search, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { toast } from '@/hooks/use-toast';
import { productApi, type Category } from '@/lib/api/product.api';
import { motion, AnimatePresence } from 'framer-motion';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'newest', label: 'Newest First' },
];

const PRICE_RANGES = [
  { label: 'Under Rs. 5,000', min: 0, max: 5000 },
  { label: 'Rs. 5,000 – 20,000', min: 5000, max: 20000 },
  { label: 'Rs. 20,000 – 50,000', min: 20000, max: 50000 },
  { label: 'Rs. 50,000 – 1,00,000', min: 50000, max: 100000 },
  { label: 'Above Rs. 1,00,000', min: 100000, max: Infinity },
];

function addToCart(product: any) {
  const { items, setItems, openCart } = useCartStore.getState();
  const pid = product._id || product.id;
  const image = product.images?.[0] || '';
  const salePrice = product.salePrice ?? product.price;
  const sellerName = product.sellerName ?? (typeof product.seller === 'string' ? product.seller : (product.seller?.storeName ?? ''));
  const existing = items.find((i) => i.id === pid);
  if (existing) {
    setItems(items.map((i) => i.id === pid ? { ...i, quantity: i.quantity + 1, totalPrice: i.unitPrice * (i.quantity + 1) } : i));
  } else {
    setItems([...items, { id: pid, productId: pid, productName: product.name, productImage: image, sellerName, quantity: 1, unitPrice: salePrice, totalPrice: salePrice, stock: product.stock ?? 10 }]);
  }
  openCart();
  toast({ title: 'Added to cart!', description: product.name });
}

function SkeletonCard({ list }: { list?: boolean }) {
  if (list) return (
    <div className="flex bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-pulse">
      <div className="w-40 h-36 bg-gray-100 dark:bg-gray-800 shrink-0" />
      <div className="flex-1 p-4 space-y-2">
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/3" />
        <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded w-2/3" />
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/4" />
        <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded w-1/3 mt-4" />
      </div>
    </div>
  );
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-100 dark:bg-gray-800" />
      <div className="p-3.5 space-y-2">
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/3" />
        <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
      </div>
    </div>
  );
}

function ProductGridCard({ product }: { product: any }) {
  const { toggleItem, isInWishlist } = useWishlistStore();
  const pid = product._id || product.id;
  const image = product.images?.[0] || '';
  const salePrice = product.salePrice ?? product.price;
  const discount = product.price > salePrice ? Math.round(((product.price - salePrice) / product.price) * 100) : 0;
  const sellerName = product.sellerName ?? (typeof product.seller === 'string' ? product.seller : (product.seller?.storeName ?? ''));
  const wished = isInWishlist(pid);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="product-card group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
    >
      <div className="relative h-48 bg-gray-50 dark:bg-gray-800 overflow-hidden">
        {image ? (
          <Image src={image} alt={product.name} fill className="object-cover card-img" sizes="(max-width: 768px) 50vw, 25vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><Package className="w-12 h-12 text-gray-200" /></div>
        )}
        {discount > 0 && (
          <span className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">-{discount}%</span>
        )}
        <motion.button
          onClick={() => { toggleItem({ id: pid, productId: pid, name: product.name, image, price: salePrice, basePrice: product.price, rating: product.rating ?? 0, seller: sellerName, inStock: (product.stock ?? 1) > 0 }); toast({ title: wished ? 'Removed from wishlist' : 'Saved to wishlist!' }); }}
          whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
          className="absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 dark:bg-gray-800/90 rounded-full flex items-center justify-center shadow">
          <Heart className={`w-3.5 h-3.5 transition-colors ${wished ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
        </motion.button>
        <div className="card-actions absolute bottom-2.5 left-2.5 right-2.5">
          <button
            onClick={() => addToCart(product)}
            className="w-full text-xs flex items-center justify-center gap-1 py-2 text-white font-semibold rounded-xl shadow transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
          >
            <ShoppingCart className="w-3 h-3" /> Add to Cart
          </button>
        </div>
      </div>
      <div className="p-3.5 space-y-1.5">
        <p className="text-[11px] text-muted-foreground truncate">{sellerName}</p>
        <Link href={`/products/${pid}`}>
          <h3 className="text-sm font-semibold line-clamp-2 hover:text-orange-500 dark:hover:text-orange-400 transition-colors leading-snug text-gray-900 dark:text-white">{product.name}</h3>
        </Link>
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          <span className="text-[11px] text-muted-foreground">{(product.rating ?? 0).toFixed(1)} ({product.reviewCount ?? 0})</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-black text-gray-900 dark:text-white text-sm">{formatCurrency(salePrice)}</span>
          {discount > 0 && <span className="text-xs text-muted-foreground line-through">{formatCurrency(product.price)}</span>}
        </div>
      </div>
    </motion.div>
  );
}

function ProductListCard({ product }: { product: any }) {
  const { toggleItem, isInWishlist } = useWishlistStore();
  const pid = product._id || product.id;
  const image = product.images?.[0] || '';
  const salePrice = product.salePrice ?? product.price;
  const discount = product.price > salePrice ? Math.round(((product.price - salePrice) / product.price) * 100) : 0;
  const sellerName = product.sellerName ?? (typeof product.seller === 'string' ? product.seller : (product.seller?.storeName ?? ''));
  const wished = isInWishlist(pid);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="product-card group flex bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
    >
      <div className="relative w-40 h-36 bg-gray-50 dark:bg-gray-800 shrink-0 overflow-hidden">
        {image ? (
          <Image src={image} alt={product.name} fill className="object-cover card-img" sizes="160px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><Package className="w-8 h-8 text-gray-200" /></div>
        )}
        {discount > 0 && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">-{discount}%</span>}
      </div>
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <p className="text-xs text-muted-foreground">{sellerName}</p>
          <Link href={`/products/${pid}`}><h3 className="font-semibold hover:text-orange-500 dark:hover:text-orange-400 transition-colors mt-0.5 text-gray-900 dark:text-white">{product.name}</h3></Link>
          <div className="flex items-center gap-1 mt-1.5">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-muted-foreground">{(product.rating ?? 0).toFixed(1)} ({product.reviewCount ?? 0} reviews)</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-black text-gray-900 dark:text-white">{formatCurrency(salePrice)}</span>
            {discount > 0 && <span className="text-sm text-muted-foreground line-through">{formatCurrency(product.price)}</span>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => addToCart(product)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-white font-semibold rounded-xl transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Add
            </button>
            <button
              onClick={() => { toggleItem({ id: pid, productId: pid, name: product.name, image, price: salePrice, basePrice: product.price, rating: product.rating ?? 0, seller: sellerName, inStock: (product.stock ?? 1) > 0 }); toast({ title: wished ? 'Removed from wishlist' : 'Saved!' }); }}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <Heart className={`w-3.5 h-3.5 ${wished ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProductsPageInner() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('category'));
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [searchQ, setSearchQ] = useState(searchParams.get('q') || '');

  // Load categories
  useEffect(() => {
    productApi.listCategories().then(r => setCategories(r.data.data)).catch(() => {});
  }, []);

  // Load products
  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { limit: 40 };
    if (sort !== 'relevance') params.sort = sort;
    if (selectedCategory) params.category = selectedCategory;
    if (selectedRating) params.minRating = selectedRating;
    if (selectedPriceRange !== null) {
      params.minPrice = PRICE_RANGES[selectedPriceRange].min;
      if (PRICE_RANGES[selectedPriceRange].max !== Infinity) params.maxPrice = PRICE_RANGES[selectedPriceRange].max;
    }
    if (inStockOnly) params.inStock = 1;
    if (searchQ) params.q = searchQ;

    productApi.list(params)
      .then((res) => {
        setProducts(res.data.data);
        setTotal(res.data.meta?.total ?? res.data.data.length);
      })
      .catch(() => { setProducts([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [sort, selectedCategory, selectedRating, selectedPriceRange, inStockOnly, searchQ]);

  const clearFilters = () => {
    setSelectedCategory(null); setSelectedRating(null);
    setSelectedPriceRange(null); setInStockOnly(false); setSearchQ('');
  };

  const activeFilterCount = [selectedCategory, selectedRating, selectedPriceRange, inStockOnly].filter(Boolean).length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {selectedCategory ? categories.find(c => c.slug === selectedCategory)?.name || 'Products' : 'All Products'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {loading ? 'Loading…' : `${total.toLocaleString()} product${total !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowFilters(!showFilters)} className="md:hidden relative flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <SlidersHorizontal className="w-4 h-4" /> Filters
            {activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center">{activeFilterCount}</span>}
          </button>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button className={`p-2 transition-colors ${view === 'grid' ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400' : 'text-muted-foreground hover:bg-gray-50'}`} onClick={() => setView('grid')}><Grid className="w-4 h-4" /></button>
            <button className={`p-2 transition-colors ${view === 'list' ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400' : 'text-muted-foreground hover:bg-gray-50'}`} onClick={() => setView('list')}><List className="w-4 h-4" /></button>
          </div>
          <select className="border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-900" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar filters */}
        <AnimatePresence>
          {(showFilters || true) && (
            <motion.aside
              initial={false}
              className={`w-64 shrink-0 ${showFilters ? 'block' : 'hidden'} md:block`}
            >
              <div className="bg-white dark:bg-gray-800 border rounded-2xl p-5 sticky top-24 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 dark:text-white">Filters</h3>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1">
                      <X className="w-3 h-3" /> Clear all
                    </button>
                  )}
                </div>

                {/* Search */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                      placeholder="Search products..."
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                    />
                  </div>
                </div>

                {/* Categories */}
                {categories.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">Categories</h3>
                    <div className="space-y-1.5">
                      {categories.map((cat) => (
                        <label key={cat._id} className="flex items-center gap-2 text-sm cursor-pointer group">
                          <input type="radio" name="category" onChange={() => setSelectedCategory(cat.slug)} checked={selectedCategory === cat.slug} className="text-orange-500" />
                          <span className="group-hover:text-orange-500 dark:hover:text-orange-400 transition-colors">{cat.name}</span>
                          {cat.productCount !== undefined && <span className="ml-auto text-xs text-muted-foreground">{cat.productCount}</span>}
                        </label>
                      ))}
                      {selectedCategory && (
                        <button className="text-xs text-orange-600 dark:text-orange-400 hover:underline mt-1" onClick={() => setSelectedCategory(null)}>Clear</button>
                      )}
                    </div>
                  </div>
                )}

                {/* Price Range */}
                <div>
                  <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">Price Range</h3>
                  <div className="space-y-1.5">
                    {PRICE_RANGES.map((range, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-sm cursor-pointer group">
                        <input type="radio" name="price" onChange={() => setSelectedPriceRange(idx)} checked={selectedPriceRange === idx} className="text-orange-500" />
                        <span className="group-hover:text-orange-500 dark:hover:text-orange-400 transition-colors">{range.label}</span>
                      </label>
                    ))}
                    {selectedPriceRange !== null && (
                      <button className="text-xs text-orange-600 dark:text-orange-400 hover:underline mt-1" onClick={() => setSelectedPriceRange(null)}>Clear</button>
                    )}
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">Rating</h3>
                  <div className="space-y-1.5">
                    {[4, 3, 2].map((r) => (
                      <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="rating" onChange={() => setSelectedRating(r)} checked={selectedRating === r} className="text-orange-500" />
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < r ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                          ))}
                          <span className="text-muted-foreground text-xs">& up</span>
                        </div>
                      </label>
                    ))}
                    {selectedRating && <button className="text-xs text-orange-600 dark:text-orange-400 hover:underline" onClick={() => setSelectedRating(null)}>Clear</button>}
                  </div>
                </div>

                {/* In Stock */}
                <label className="flex items-center gap-2 text-sm cursor-pointer font-medium">
                  <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="rounded text-orange-500" />
                  In Stock Only
                </label>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Products grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-3'}>
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} list={view === 'list'} />)}
            </div>
          ) : products.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">No products found</p>
              <p className="text-muted-foreground mb-6">Try adjusting your filters or search terms</p>
              <button onClick={clearFilters} className="px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-all hover:brightness-110" style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}>Clear Filters</button>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${view}-${sort}-${selectedCategory}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-3'}
              >
                {products.map((p) =>
                  view === 'grid'
                    ? <ProductGridCard key={p._id || p.id} product={p} />
                    : <ProductListCard key={p._id || p.id} product={p} />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
      <ProductsPageInner />
    </Suspense>
  );
}
