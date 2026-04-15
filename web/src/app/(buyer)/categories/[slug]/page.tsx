'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { productApi, categoryApi, Category } from '@/lib/api/product.api';
import { formatCurrency } from '@/lib/utils';
import { Star, Heart, ShoppingCart, Package, SlidersHorizontal, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { toast } from '@/hooks/use-toast';

const CATEGORY_META: Record<string, { name: string; emoji: string; gradient: string; desc: string }> = {
  'fruits-vegetables': { name: 'Fruits & Vegetables', emoji: '🥦', gradient: 'from-green-600 to-emerald-500',  desc: 'Farm-fresh fruits and vegetables daily' },
  'dairy-eggs':        { name: 'Dairy & Eggs',         emoji: '🥛', gradient: 'from-yellow-500 to-amber-400',  desc: 'Fresh milk, curd, paneer, eggs & more' },
  'grains-pulses':     { name: 'Grains & Pulses',      emoji: '🌾', gradient: 'from-amber-600 to-yellow-500',  desc: 'Rice, dal, flour, atta & whole grains' },
  'meat-seafood':      { name: 'Meat & Seafood',        emoji: '🍗', gradient: 'from-red-600 to-rose-500',      desc: 'Fresh chicken, mutton, fish & more' },
  'snacks-beverages':  { name: 'Snacks & Beverages',   emoji: '🍿', gradient: 'from-orange-500 to-amber-400',  desc: 'Chips, biscuits, tea, coffee & juices' },
  'spices-condiments': { name: 'Spices & Condiments',  emoji: '🌶️', gradient: 'from-red-500 to-orange-400',    desc: 'Masala, sauces, oils & kitchen essentials' },
  'personal-care':     { name: 'Personal Care',         emoji: '🧴', gradient: 'from-purple-600 to-violet-500', desc: 'Soap, shampoo, toothpaste & hygiene' },
  'household-items':   { name: 'Household Items',       emoji: '🧹', gradient: 'from-teal-600 to-cyan-500',    desc: 'Cleaning supplies & home essentials' },
  'frozen-foods':      { name: 'Frozen Foods',          emoji: '🧊', gradient: 'from-cyan-600 to-blue-500',    desc: 'Frozen vegetables, meals & snacks' },
  'bakery-bread':      { name: 'Bakery & Bread',        emoji: '🍞', gradient: 'from-amber-500 to-orange-400', desc: 'Fresh bread, buns, cakes & pastries' },
  grocery:             { name: 'Grocery',                emoji: '🛒', gradient: 'from-teal-600 to-green-500',   desc: 'Daily essentials, fresh & packaged foods' },
};

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest First' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating',     label: 'Best Rated' },
];

function isUrl(s: string) { return s?.startsWith('http') || s?.startsWith('/'); }

function ProductCard({ product }: { product: any }) {
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { items, setItems, openCart } = useCartStore();
  const wished = isInWishlist(product.id);
  const discount = product.basePrice > product.price
    ? Math.round(((product.basePrice - product.price) / product.basePrice) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    const cartItem = {
      id: product.id,
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      sellerName: product.seller,
      quantity: 1,
      unitPrice: product.price,
      totalPrice: product.price,
      stock: 99,
    };
    setItems([...items.filter((i) => i.id !== product.id), cartItem]);
    openCart();
    toast({ title: 'Added to cart!', description: product.name });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleItem({ id: product.id, productId: product.id, name: product.name, image: product.image, price: product.price, basePrice: product.basePrice, rating: product.rating, seller: product.seller, inStock: true });
    toast({ title: wished ? 'Removed from wishlist' : 'Saved to wishlist!' });
  };

  return (
    <div className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all dark:bg-gray-900 dark:border-gray-800">
      <Link href={`/products/${product.id}`}>
        <div className="relative h-44 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 overflow-hidden flex items-center justify-center">
          {isUrl(product.image) ? (
            <Image src={product.image} alt={product.name} fill className="object-contain p-3 group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 640px) 50vw, 25vw" />
          ) : (
            <Package className="w-14 h-14 text-gray-200" />
          )}
          {discount > 0 && (
            <span className="absolute top-2.5 left-2.5 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">-{discount}%</span>
          )}
          {/* Action buttons */}
          <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleWishlist}
              className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow border border-gray-100 hover:bg-red-50 hover:border-red-200 transition-colors"
            >
              <Heart className={`w-3.5 h-3.5 ${wished ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            </button>
          </div>
          {/* Add to cart - shows on hover */}
          <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
            <button
              onClick={handleAddToCart}
              className="w-full py-2.5 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
            </button>
          </div>
        </div>
      </Link>
      <div className="p-3.5 space-y-1.5">
        <p className="text-[10px] text-muted-foreground truncate">{product.seller}</p>
        <Link href={`/products/${product.id}`}>
          <h3 className="text-sm font-semibold line-clamp-2 hover:text-orange-500 dark:hover:text-orange-400 transition-colors text-gray-900 dark:text-white leading-snug">{product.name}</h3>
        </Link>
        {product.rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[11px] text-muted-foreground">{product.rating.toFixed(1)} ({product.reviews})</span>
          </div>
        )}
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-orange-500 dark:text-orange-400 text-sm">{formatCurrency(product.price)}</span>
          {discount > 0 && <span className="text-xs text-muted-foreground line-through">{formatCurrency(product.basePrice)}</span>}
        </div>
      </div>
    </div>
  );
}

function CategoryPageInner() {
  const params = useParams();
  const slug = params.slug as string;
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);

  const meta = CATEGORY_META[slug] ?? {
    name: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' '),
    emoji: '🛍️',
    gradient: 'from-orange-600 to-orange-500',
    desc: 'Browse our collection',
  };

  // Fetch subcategories for this category
  useEffect(() => {
    categoryApi.withSubs().then((res: any) => {
      const cats = res.data?.data ?? [];
      const parent = cats.find((c: any) => c.slug === slug);
      setSubcategories(parent?.subcategories ?? []);
    }).catch(() => {});
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { category: slug, sort, limit: 24 };
    if (selectedSub) params.subCategory = selectedSub;
    productApi.list(params)
      .then((res: any) => {
        const prods = Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.products ?? []);
        setProducts(prods.map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          image: p.images?.[0] || '',
          price: p.salePrice || p.price,
          basePrice: p.price,
          rating: p.rating || 0,
          reviews: p.reviewCount || 0,
          seller: typeof p.seller === 'object' ? (p.seller?.storeName ?? '') : (p.seller ?? ''),
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, sort, selectedSub]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero banner */}
      <div className={`bg-gradient-to-r ${meta.gradient} rounded-2xl p-8 mb-8 text-white relative overflow-hidden`}>
        <div className="absolute right-6 bottom-0 text-8xl opacity-20 select-none">{meta.emoji}</div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1 text-white/70 text-sm">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ArrowRight className="w-3 h-3" />
            <span>Categories</span>
            <ArrowRight className="w-3 h-3" />
            <span className="text-white font-medium">{meta.name}</span>
          </div>
          <h1 className="text-3xl font-black">{meta.emoji} {meta.name}</h1>
          <p className="text-white/80 mt-1">{meta.desc}</p>
          <p className="text-white/60 text-sm mt-2">{loading ? '…' : products.length} products</p>
        </div>
      </div>

      {/* Subcategory filter pills */}
      {subcategories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <button
            onClick={() => setSelectedSub(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              selectedSub === null
                ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700'
            }`}
          >
            All
          </button>
          {subcategories.map((sub) => (
            <button
              key={sub._id}
              onClick={() => setSelectedSub(sub.slug === selectedSub ? null : sub.slug)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                selectedSub === sub.slug
                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{loading ? 'Loading…' : `${products.length} products found`}</p>
        <div className="flex items-center gap-2">
          <select
            className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400/20 transition-colors"
            value={sort}
            onChange={e => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-2xl h-72 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100">
          <div className="text-5xl mb-4">{meta.emoji}</div>
          <p className="font-semibold text-gray-700 dark:text-white">No products in {meta.name} yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-5">Check back soon — sellers are adding products!</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
          >
            Browse All Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Loading…</div>}>
      <CategoryPageInner />
    </Suspense>
  );
}
