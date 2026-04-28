'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { productApi, categoryApi, CategoryWithSubs } from '@/lib/api/product.api';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Heart, Star, Package, ChevronRight, Layers } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { useGuestCartStore } from '@/store/guest-cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { toast } from '@/hooks/use-toast';

const CAT_EMOJI: Record<string, string> = {
  'fruits-vegetables': '🥦',
  'dairy-eggs': '🥛',
  'grains-pulses': '🌾',
  'meat-fish': '🍗',
  'meat-seafood': '🐟',
  'snacks-beverages': '🍿',
  'spices-condiments': '🌶️',
  'bakery-bread': '🍞',
  'personal-care': '🧴',
  'oils-ghee': '🫙',
  'household-items': '🧹',
  'frozen-foods': '🧊',
};

function isUrl(s: string) {
  return s?.startsWith('http') || s?.startsWith('/');
}

function ProductCard({ product }: { product: any }) {
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { addItem, openCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const guestStore = useGuestCartStore();
  const wished = isInWishlist(product.id);
  const discount = product.basePrice > product.price
    ? Math.round(((product.basePrice - product.price) / product.basePrice) * 100)
    : 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    const cartItem = {
      productId: product.id, productName: product.name,
      productImage: product.image, sellerName: product.seller,
      quantity: 1, unitPrice: product.price, stock: 99,
    };
    if (isAuthenticated) {
      await addItem(cartItem).catch(() => {});
    } else {
      guestStore.addItem(cartItem);
    }
    openCart();
    toast({ title: 'Added to cart!', description: product.name });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleItem({ id: product.id, productId: product.id, name: product.name, image: product.image, price: product.price, basePrice: product.basePrice, rating: product.rating, seller: product.seller, inStock: true });
    toast({ title: wished ? 'Removed from wishlist' : 'Saved to wishlist!' });
  };

  return (
    <div className="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-all dark:bg-gray-900 dark:border-gray-800">
      <Link href={`/products/${product.id}`}>
        <div className="relative h-36 bg-gray-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
          {isUrl(product.image) ? (
            <Image src={product.image} alt={product.name} fill className="object-contain p-2 group-hover:scale-105 transition-transform duration-300" sizes="200px" />
          ) : (
            <Package className="w-10 h-10 text-gray-200" />
          )}
          {discount > 0 && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">-{discount}%</span>
          )}
          <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={handleWishlist} className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow hover:bg-red-50 transition-colors">
              <Heart className={`w-3 h-3 ${wished ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
            <button onClick={handleAddToCart} className="w-full py-2 text-white text-xs font-bold flex items-center justify-center gap-1 transition-all hover:brightness-110" style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}>
              <ShoppingCart className="w-3 h-3" /> Add to Cart
            </button>
          </div>
        </div>
      </Link>
      <div className="p-2.5 space-y-1">
        <p className="text-[9px] text-muted-foreground truncate">{product.seller}</p>
        <Link href={`/products/${product.id}`}>
          <h3 className="text-xs font-semibold line-clamp-2 hover:text-orange-500 transition-colors text-gray-900 dark:text-white leading-snug">{product.name}</h3>
        </Link>
        {product.rating > 0 && (
          <div className="flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
            <span className="text-[9px] text-muted-foreground">{product.rating.toFixed(1)}</span>
          </div>
        )}
        <div className="flex items-baseline gap-1">
          <span className="font-bold text-orange-500 dark:text-orange-400 text-xs">{formatCurrency(product.price)}</span>
          {discount > 0 && <span className="text-[9px] text-muted-foreground line-through">{formatCurrency(product.basePrice)}</span>}
        </div>
      </div>
    </div>
  );
}

function SubcategorySection({ catSlug, sub }: { catSlug: string; sub: any }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productApi.list({ category: catSlug, subCategory: sub.slug, limit: 6 })
      .then((res: any) => {
        const raw = Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.products ?? []);
        setProducts(raw.map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          image: p.images?.[0] || '',
          price: p.salePrice || p.price,
          basePrice: p.price,
          rating: p.rating || 0,
          seller: typeof p.seller === 'object' ? (p.seller?.storeName ?? '') : (p.seller ?? ''),
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [catSlug, sub.slug]);

  if (!loading && products.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <span className="w-1 h-4 rounded-full bg-orange-400 inline-block" />
          {sub.name}
          {!loading && <span className="text-xs font-normal text-muted-foreground">({products.length}+)</span>}
        </h3>
        <Link
          href={`/categories/${catSlug}?sub=${sub.slug}`}
          className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-0.5 font-medium"
        >
          See all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-xl h-48 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

function CategorySection({ cat }: { cat: CategoryWithSubs }) {
  const [catProducts, setCatProducts] = useState<any[]>([]);
  const [loadingCat, setLoadingCat] = useState(true);
  const emoji = CAT_EMOJI[cat.slug] ?? '🛍️';
  const hasSubs = cat.subcategories && cat.subcategories.length > 0;

  useEffect(() => {
    if (!hasSubs) {
      productApi.list({ category: cat.slug, limit: 6 })
        .then((res: any) => {
          const raw = Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.products ?? []);
          setCatProducts(raw.map((p: any) => ({
            id: p._id || p.id,
            name: p.name,
            image: p.images?.[0] || '',
            price: p.salePrice || p.price,
            basePrice: p.price,
            rating: p.rating || 0,
            seller: typeof p.seller === 'object' ? (p.seller?.storeName ?? '') : (p.seller ?? ''),
          })));
        })
        .catch(() => {})
        .finally(() => setLoadingCat(false));
    } else {
      setLoadingCat(false);
    }
  }, [cat.slug, hasSubs]);

  return (
    <section className="mb-10">
      {/* Category header */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-xl">
            {emoji}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{cat.name}</h2>
            {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
          </div>
        </div>
        <Link
          href={`/categories/${cat.slug}`}
          className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
        >
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {hasSubs ? (
        cat.subcategories.map((sub) => (
          <SubcategorySection key={sub._id} catSlug={cat.slug} sub={sub} />
        ))
      ) : loadingCat ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-xl h-48 animate-pulse" />)}
        </div>
      ) : catProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {catProducts.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4">No products yet.</p>
      )}
    </section>
  );
}

export default function AllCategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithSubs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    categoryApi.withSubs()
      .then((res: any) => {
        const cats: CategoryWithSubs[] = res.data?.data ?? [];
        // Only top-level cats (no parentCategory)
        setCategories(cats.filter((c: any) => !c.parentCategory));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-700 dark:text-gray-200 font-medium">All Categories</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Browse by Category</h1>
            <p className="text-sm text-muted-foreground">All products organised by category and subcategory</p>
          </div>
        </div>
      </div>

      {/* Quick jump links */}
      {!loading && categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          {categories.map((cat) => (
            <a key={cat._id} href={`#cat-${cat.slug}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:border-orange-300 hover:text-orange-500 transition-all">
              <span>{CAT_EMOJI[cat.slug] ?? '🛍️'}</span>
              {cat.name}
            </a>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-10">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-48 mb-4 animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[...Array(6)].map((_, j) => <div key={j} className="bg-gray-100 dark:bg-gray-800 rounded-xl h-48 animate-pulse" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {categories.map((cat) => (
            <div key={cat._id} id={`cat-${cat.slug}`}>
              <CategorySection cat={cat} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
