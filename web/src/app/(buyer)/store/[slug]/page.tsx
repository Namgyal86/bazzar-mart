'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Package, ShoppingCart, Heart, MapPin, Award, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { productApi } from '@/lib/api/product.api';
import { useCartStore } from '@/store/cart.store';
import { useGuestCartStore } from '@/store/guest-cart.store';
import { useAuthStore } from '@/store/auth.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { toast } from '@/hooks/use-toast';

function isUrl(s: string) { return s?.startsWith('http') || s?.startsWith('/'); }

function ProductCard({ product }: { product: any }) {
  const { toggleItem, isInWishlist } = useWishlistStore();
  const openCart = useCartStore(s => s.openCart);
  const router = useRouter();
  const wished = isInWishlist(product.id);
  const discount = product.basePrice > product.price
    ? Math.round(((product.basePrice - product.price) / product.basePrice) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    const cartItem = { productId: product.id, productName: product.name, productImage: product.image, sellerName: product.seller, quantity: 1, unitPrice: product.price, salePrice: product.price, stock: 99 };
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      useCartStore.getState().addItem(cartItem).catch(() => {});
    } else {
      useGuestCartStore.getState().addItem(cartItem);
    }
    openCart();
    toast({ title: 'Added to cart!', description: product.name });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!useAuthStore.getState().isAuthenticated) {
      toast({ title: 'Login required', description: 'Please login to save items to your wishlist.' });
      router.push('/auth/login');
      return;
    }
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
          {/* Wishlist */}
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
        <Link href={`/products/${product.id}`}>
          <h3 className="text-sm font-semibold line-clamp-2 hover:text-orange-500 dark:hover:text-orange-400 transition-colors text-gray-900 dark:text-white leading-snug">{product.name}</h3>
        </Link>
        {product.rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[11px] text-muted-foreground">{product.rating.toFixed(1)}</span>
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

export default function StoreDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productApi.list({ seller: slug, limit: 24 })
      .then((res: any) => {
        const prods = Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.products ?? []);
        setProducts(prods.map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          image: p.images?.[0] || '',
          price: p.salePrice || p.price,
          basePrice: p.price,
          rating: p.rating || 0,
          seller: typeof p.seller === 'object' ? (p.seller?.storeName ?? '') : (p.seller ?? ''),
        })));
        if (prods.length > 0 && prods[0].seller && typeof prods[0].seller === 'object') {
          const s = prods[0].seller;
          setStore({
            name: s.storeName || slug,
            description: s.description || '',
            rating: s.rating || 0,
            totalSales: s.totalSales || 0,
            location: s.location || '',
            joinedYear: s.createdAt ? new Date(s.createdAt).getFullYear() : null,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Store header */}
      <div className="rounded-2xl p-8 text-white mb-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))', boxShadow: '0 8px 32px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.25)' }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none select-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute w-32 h-32 border-2 border-white rounded-full"
              style={{ left: `${i * 18}%`, top: `${(i % 3) * 40 - 10}%`, opacity: 0.3 }} />
          ))}
        </div>
        <div className="relative flex items-start gap-5 flex-wrap">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-5xl shadow-lg shrink-0">
            🏪
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black">{store?.name ?? slug}</h1>
            {store?.description && <p className="text-white/80 text-sm mt-1 line-clamp-2">{store.description}</p>}
            <div className="flex flex-wrap items-center gap-4 mt-3">
              {store?.rating > 0 && (
                <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                  <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                  <span className="font-bold text-sm">{store.rating.toFixed(1)}</span>
                  <span className="text-white/70 text-xs">rating</span>
                </div>
              )}
              {store?.totalSales > 0 && (
                <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                  <TrendingUp className="w-4 h-4 text-white/80" />
                  <span className="font-bold text-sm">{store.totalSales.toLocaleString()}</span>
                  <span className="text-white/70 text-xs">sales</span>
                </div>
              )}
              {store?.location && (
                <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                  <MapPin className="w-4 h-4 text-white/80" />
                  <span className="text-sm">{store.location}</span>
                </div>
              )}
              {store?.joinedYear && (
                <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                  <Award className="w-4 h-4 text-white/80" />
                  <span className="text-sm">Since {store.joinedYear}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                <Package className="w-4 h-4 text-white/80" />
                <span className="text-sm">{loading ? '…' : products.length} products</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {loading ? 'Loading products…' : `${products.length} Products`}
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-2xl h-72 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100">
          <div className="text-5xl mb-4">🏪</div>
          <p className="font-semibold text-gray-700 dark:text-white">No products listed yet</p>
          <p className="text-sm text-muted-foreground mt-1">This store hasn't added any products yet.</p>
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
