'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Zap, Clock, ArrowRight, Flame, ShoppingCart, Heart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { productApi } from '@/lib/api/product.api';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

function useCountdown(target: Date) {
  const [t, setT] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, target.getTime() - Date.now());
      setT({ h: Math.floor(diff / 3600000) % 24, m: Math.floor(diff / 60000) % 60, s: Math.floor(diff / 1000) % 60 });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [target]);
  return t;
}

const dealEnd = new Date(Date.now() + 24 * 3600 * 1000);

function FlipUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <motion.span
        key={value}
        initial={{ rotateX: -90, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-14 h-14 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl flex items-center justify-center font-black text-xl font-mono shadow-md"
        style={{ perspective: 300 }}
      >
        {value}
      </motion.span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

function DealCard({ pid, deal, salePrice, discount, image, sold, sellerName, index }: { pid: string; deal: any; salePrice: number; discount: number; image: string; sold: number; sellerName: string; index: number }) {
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { items, setItems, openCart } = useCartStore();
  const wished = isInWishlist(pid);

  const handleCart = (e: React.MouseEvent) => {
    e.preventDefault();
    const existing = items.find(i => i.id === pid);
    if (existing) {
      setItems(items.map(i => i.id === pid ? { ...i, quantity: i.quantity + 1, totalPrice: i.unitPrice * (i.quantity + 1) } : i));
    } else {
      setItems([...items, { id: pid, productId: pid, productName: deal.name, productImage: image, sellerName, quantity: 1, unitPrice: salePrice, totalPrice: salePrice, stock: deal.stock ?? 20 }]);
    }
    openCart();
    toast({ title: 'Added to cart!', description: deal.name });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleItem({ id: pid, productId: pid, name: deal.name, image, price: salePrice, basePrice: deal.price, rating: deal.rating ?? 0, seller: sellerName, inStock: true });
    toast({ title: wished ? 'Removed from wishlist' : 'Saved to wishlist!' });
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30, scale: 0.96 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
      }}
      whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className="product-card group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden"
    >
      <Link href={`/products/${pid}`}>
        <div className="relative h-44 bg-gray-50 dark:bg-gray-800 overflow-hidden">
          {image ? (
            <Image src={image} alt={deal.name} fill className="object-cover card-img" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-4xl">🛍️</div>
          )}
          {discount > 0 && (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow">
              -{discount}%
            </div>
          )}
          <motion.button
            onClick={handleWishlist}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 dark:bg-gray-800/90 rounded-full flex items-center justify-center shadow-md"
          >
            <Heart className={`w-3.5 h-3.5 transition-colors ${wished ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
          </motion.button>
        </div>
      </Link>
      <div className="p-4">
        <Link href={`/products/${pid}`}>
          <p className="text-sm font-semibold line-clamp-1 text-gray-900 dark:text-white hover:text-orange-500 transition-colors">{deal.name}</p>
        </Link>
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="font-black text-orange-600 dark:text-orange-400">{formatCurrency(salePrice)}</span>
          {discount > 0 && <span className="text-xs text-muted-foreground line-through">{formatCurrency(deal.price)}</span>}
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Sold</span>
            <span className="font-bold text-orange-600 dark:text-orange-400">{sold}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full"
              initial={{ width: 0 }}
              whileInView={{ width: `${sold}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.3 + index * 0.1, ease: 'easeOut' }}
            />
          </div>
        </div>
        <button
          onClick={handleCart}
          className="mt-3 w-full py-2 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
        >
          <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
        </button>
      </div>
    </motion.div>
  );
}

function SkeletonDeal() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-100 dark:bg-gray-800" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full w-full mt-3" />
      </div>
    </div>
  );
}

export function DealsBanner() {
  const { h, m, s } = useCountdown(dealEnd);
  const pad = (n: number) => String(n).padStart(2, '0');
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get products with sale prices (sorted by discount)
    productApi.list({ limit: 4, sort: 'price_asc' })
      .then((res) => {
        const prods = res.data.data.filter(p => p.salePrice && p.salePrice < p.price);
        if (prods.length > 0) setDeals(prods.slice(0, 4));
        else {
          return productApi.list({ limit: 4 }).then(r => setDeals(r.data.data.slice(0, 4)));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && deals.length === 0) return null;

  return (
    <section className="py-20 bg-white dark:bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
        >
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200 dark:shadow-orange-900"
            >
              <Zap className="w-6 h-6 text-white fill-white" />
            </motion.div>
            <div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Flame className="w-7 h-7 text-orange-500 fill-orange-500" /> Flash Deals
              </h2>
              <p className="text-sm text-muted-foreground">Limited time offers – grab before they're gone!</p>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Ends in:</span>
            <FlipUnit value={pad(h)} label="HRS" />
            <span className="text-gray-400 font-bold text-xl mb-4">:</span>
            <FlipUnit value={pad(m)} label="MIN" />
            <span className="text-gray-400 font-bold text-xl mb-4">:</span>
            <FlipUnit value={pad(s)} label="SEC" />
          </div>
        </motion.div>

        {/* Deal Cards */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonDeal key={i} />)
            : deals.map((deal, i) => {
                const pid = deal._id || deal.id;
                const salePrice = deal.salePrice ?? deal.price;
                const discount = deal.price > salePrice ? Math.round(((deal.price - salePrice) / deal.price) * 100) : 0;
                const image = deal.images?.[0] || '';
                const sold = Math.min(95, 40 + i * 13);
                const sellerName = typeof deal.seller === 'object' ? (deal.seller?.storeName ?? '') : (deal.seller ?? '');
                return (
                  <DealCard
                    key={pid}
                    pid={pid}
                    deal={deal}
                    salePrice={salePrice}
                    discount={discount}
                    image={image}
                    sold={sold}
                    sellerName={sellerName}
                    index={i}
                  />
                );
              })
          }
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-center mt-8"
        >
          <Link href="/deals">
            <button
              className="inline-flex items-center gap-2 rounded-xl border-2 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 px-6 py-3 text-sm font-semibold transition-colors"
            >
              View All Deals <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
