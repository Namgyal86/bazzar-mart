'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Zap, Star, Heart, ShoppingCart, Timer, Package, Flame } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { productApi } from '@/lib/api/product.api';
import { useCartStore } from '@/store/cart.store';
import { useGuestCartStore } from '@/store/guest-cart.store';
import { useAuthStore } from '@/store/auth.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { toast } from '@/hooks/use-toast';

function isUrl(s: string) { return s?.startsWith('http') || s?.startsWith('/'); }

// Countdown timer hook — fixed end time per session so cards don't re-render weirdly
function useCountdown(hoursUntilMidnight: number) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const tick = () => {
      const diff = end.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ h: 0, m: 0, s: 0 }); return; }
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return timeLeft;
}

function CountdownBadge() {
  const { h, m, s } = useCountdown(0);

  const FlipCard = ({ value, label }: { value: string; label: string }) => (
    <div className="flex flex-col items-center gap-1">
      <div className="bg-black/30 backdrop-blur-sm rounded-xl px-3 py-2 min-w-[3rem] text-center border border-white/10 shadow-inner">
        <span className="text-white text-2xl font-black font-mono leading-none tracking-tight">
          {value}
        </span>
      </div>
      <span className="text-white/50 text-[9px] font-semibold uppercase tracking-widest">{label}</span>
    </div>
  );

  return (
    <div className="flex items-end gap-2">
      <FlipCard value={String(h).padStart(2, '0')} label="HRS" />
      <span className="text-white/60 text-2xl font-black font-mono pb-4 leading-none">:</span>
      <FlipCard value={String(m).padStart(2, '0')} label="MIN" />
      <span className="text-white/60 text-2xl font-black font-mono pb-4 leading-none">:</span>
      <FlipCard value={String(s).padStart(2, '0')} label="SEC" />
    </div>
  );
}

function DealCard({ deal }: { deal: any }) {
  const { toggleItem, isInWishlist } = useWishlistStore();
  const openCart = useCartStore(s => s.openCart);
  const router = useRouter();
  const wished = isInWishlist(deal.id);
  const discount = deal.basePrice > deal.price
    ? Math.round(((deal.basePrice - deal.price) / deal.basePrice) * 100)
    : 0;

  const handleCart = (e: React.MouseEvent) => {
    e.preventDefault();
    const cartItem = { productId: deal.id, productName: deal.name, productImage: deal.image, sellerName: deal.seller, quantity: 1, unitPrice: deal.price, salePrice: deal.price, stock: 99 };
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      useCartStore.getState().addItem(cartItem).catch(() => {});
    } else {
      useGuestCartStore.getState().addItem(cartItem);
    }
    openCart();
    toast({ title: 'Added to cart!', description: deal.name });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!useAuthStore.getState().isAuthenticated) {
      toast({ title: 'Login required', description: 'Please login to save items to your wishlist.' });
      router.push('/auth/login');
      return;
    }
    toggleItem({ id: deal.id, productId: deal.id, name: deal.name, image: deal.image, price: deal.price, basePrice: deal.basePrice, rating: deal.rating, seller: deal.seller, inStock: true });
    toast({ title: wished ? 'Removed from wishlist' : 'Saved to wishlist!' });
  };

  return (
    <div className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-orange-100/60 hover:-translate-y-1.5 transition-all duration-300 dark:bg-gray-900 dark:border-gray-800 dark:hover:shadow-orange-900/20">
      <Link href={`/products/${deal.id}`}>
        <div className="relative h-44 border-b border-gray-100 dark:border-gray-800 overflow-hidden flex items-center justify-center">
          {/* Gradient placeholder background */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900" />

          {isUrl(deal.image) ? (
            <Image
              src={deal.image}
              alt={deal.name}
              fill
              className="object-contain p-3 group-hover:scale-105 transition-transform duration-300 relative z-10"
              sizes="(max-width: 640px) 50vw, 25vw"
            />
          ) : (
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-gray-700 dark:to-gray-700 flex items-center justify-center">
                <Package className="w-8 h-8 text-orange-300 dark:text-gray-500" />
              </div>
            </div>
          )}

          {/* Discount badge */}
          <span className="absolute top-2.5 left-2.5 z-20 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-lg shadow-red-500/30">
            -{discount}%
          </span>

          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            className="absolute top-2.5 right-2.5 z-20 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md border border-gray-100 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 transition-all duration-200"
          >
            <Heart className={`w-3.5 h-3.5 ${wished ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
          </button>
        </div>
      </Link>

      <div className="p-4">
        {/* Flash deal tag — orange gradient pill */}
        <div className="inline-flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full mb-2.5 shadow-sm shadow-orange-300/40">
          <Flame className="w-2.5 h-2.5 fill-white" />
          Flash Deal · Today Only
        </div>

        <Link href={`/products/${deal.id}`}>
          <p className="font-semibold text-sm line-clamp-2 hover:text-orange-500 transition-colors text-gray-900 dark:text-white leading-snug">{deal.name}</p>
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{deal.seller}</p>

        {deal.rating > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-muted-foreground">{deal.rating.toFixed(1)} ({deal.reviews})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-lg font-black text-orange-500">{formatCurrency(deal.price)}</span>
          <span className="text-sm text-muted-foreground line-through">{formatCurrency(deal.basePrice)}</span>
        </div>

        {/* Savings badge */}
        <div className="inline-flex items-center gap-1 mt-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-lg px-2 py-0.5">
          <span className="text-xs text-green-600 dark:text-green-400 font-bold">
            You save {formatCurrency(deal.basePrice - deal.price)}!
          </span>
        </div>

        {/* Add to Cart — orange gradient with glow */}
        <button
          onClick={handleCart}
          className="mt-3 w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-orange-400/40 active:scale-[0.98]"
        >
          <ShoppingCart className="w-4 h-4" /> Add to Cart
        </button>
      </div>
    </div>
  );
}

export default function DealsPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productApi.list({ onSale: 'true', limit: 24 })
      .then((res: any) => {
        const prods = Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.products ?? []);
        setDeals(
          prods
            .filter((p: any) => {
              if (!p.salePrice || p.salePrice >= p.price) return false;
              if (p.dealEndsAt && new Date(p.dealEndsAt) <= new Date()) return false;
              return true;
            })
            .map((p: any) => ({
              id: p._id || p.id,
              name: p.name,
              image: p.images?.[0] || '',
              price: p.salePrice,
              basePrice: p.price,
              dealEndsAt: p.dealEndsAt,
              rating: p.rating || 0,
              reviews: p.reviewCount || 0,
              seller: typeof p.seller === 'object' ? (p.seller?.storeName ?? '') : (p.sellerName ?? p.seller ?? ''),
            }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ── Hero Banner ── */}
      <div className="relative bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 rounded-3xl p-8 md:p-12 mb-8 overflow-hidden">

        {/* Animated orb blobs */}
        <div
          className="absolute -top-16 -left-16 w-72 h-72 rounded-full opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-20 right-10 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #ef4444 0%, transparent 65%)' }}
        />
        <div
          className="absolute top-4 right-1/3 w-48 h-48 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
        />

        {/* Subtle grid pattern overlay at 5% opacity */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.05,
            backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Content */}
        <div className="relative text-center text-white z-10">
          {/* Flash Sale pill tag */}
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-xs font-bold px-4 py-1.5 rounded-full mb-4 shadow-inner">
            🔥 Flash Sale
          </div>

          {/* Title */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <Zap className="w-7 h-7 text-yellow-300 fill-yellow-300 shrink-0" />
            <h1 className="text-4xl md:text-5xl font-black tracking-tight drop-shadow-md">Flash Deals</h1>
            <Zap className="w-7 h-7 text-yellow-300 fill-yellow-300 shrink-0" />
          </div>

          <p className="text-white/80 text-base md:text-lg mb-4">Limited time offers — don't miss out!</p>

          {/* Up to 80% OFF badge */}
          <div className="inline-flex items-center bg-white text-orange-600 font-black text-sm md:text-base px-5 py-1.5 rounded-full shadow-lg mb-6 tracking-wide">
            Up to 80% OFF
          </div>

          {/* Countdown — flip card style */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
              <Timer className="w-4 h-4 text-yellow-300" />
              Deals end in:
            </div>
            <CountdownBadge />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && deals.length > 0 && (
        <div className="flex items-center gap-4 mb-6 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl">
          <Flame className="w-5 h-5 text-orange-500 fill-orange-500 shrink-0" />
          <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
            🔥 {deals.length} deals live now — prices updated daily
          </p>
        </div>
      )}

      {/* Loading — animated skeleton grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
              {/* Image skeleton */}
              <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 animate-pulse" />
              {/* Content skeletons */}
              <div className="p-4 space-y-3">
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="h-5 w-1/2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="h-9 w-full bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>

      /* Empty state */
      ) : deals.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/20 flex items-center justify-center">
            <Zap className="w-10 h-10 text-orange-400 dark:text-orange-500" />
          </div>
          <p className="text-xl font-black bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent mb-1">
            No deals right now
          </p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Check back soon — new flash deals drop every day!</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-2.5 text-white text-sm font-semibold rounded-xl shadow-md transition-all hover:shadow-orange-400/40 hover:scale-105"
            style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
          >
            Browse All Products
          </Link>
        </div>

      /* Deals grid */
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
