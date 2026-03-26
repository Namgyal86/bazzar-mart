'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Heart, ShoppingCart, Eye, Zap, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { toast } from '@/hooks/use-toast';
import { productApi } from '@/lib/api/product.api';
import { motion } from 'framer-motion';

function ProductCard({ product, delay, onAddToCart }: { product: any; delay: number; onAddToCart: (p: any) => void }) {
  const { toggleItem, isInWishlist } = useWishlistStore();
  const pid = product.id || product._id;
  const image = product.images?.[0] || '';
  const salePrice = product.salePrice ?? product.price;
  const discount = product.price > salePrice ? Math.round(((product.price - salePrice) / product.price) * 100) : 0;
  const sellerName = product.sellerName ?? (typeof product.seller === 'string' ? product.seller : product.seller?.storeName ?? '');
  const badge = product.badge ?? (product.isFeatured ? 'Featured' : null);
  const badgeVariant: any = badge === 'Sale' ? 'destructive' : badge === 'Best Seller' ? 'warning' : badge === 'Top Rated' ? 'success' : 'default';
  const wished = isInWishlist(pid);

  const handleWishlist = () => {
    toggleItem({ id: pid, productId: pid, name: product.name, image, price: salePrice, basePrice: product.price, rating: product.rating ?? 0, seller: sellerName, inStock: true });
    toast({ title: wished ? 'Removed from wishlist' : 'Saved to wishlist!' });
  };

  const badgeClass = (variant: string) => {
    if (variant === 'destructive') return 'bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full';
    if (variant === 'warning') return 'bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full';
    if (variant === 'success') return 'bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full';
    return 'bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: delay * 0.07, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      whileHover={{ y: -6 }}
      className="product-card group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
    >
      <div className="relative h-56 bg-gray-50 dark:bg-gray-800 overflow-hidden">
        {image ? (
          <Image src={image} alt={product.name} fill className="object-cover card-img" sizes="(max-width: 768px) 50vw, 25vw" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingCart className="w-12 h-12 text-gray-200" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {badge && <span className={`${badgeClass(badgeVariant)} shadow`}>{badge}</span>}
          {discount >= 5 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">-{discount}%</span>}
        </div>
        <motion.button
          onClick={handleWishlist}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-md flex items-center justify-center"
        >
          <Heart className={`w-4 h-4 transition-colors ${wished ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
        </motion.button>
        <div className="card-actions absolute bottom-3 left-3 right-3 flex gap-2">
          <button
            onClick={() => onAddToCart(product)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold shadow-lg text-white px-3 py-2"
            style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
          </button>
          <Link href={`/products/${pid}`}>
            <button className="w-9 h-9 rounded-xl bg-white/90 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-0 shadow-lg hover:bg-white flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs text-muted-foreground truncate mb-1">{sellerName}</p>
        <Link href={`/products/${pid}`}>
          <h3 className="font-semibold text-sm leading-snug hover:text-orange-600 dark:text-orange-400 transition-colors line-clamp-2 text-gray-900 dark:text-white">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-1.5 mt-2">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-3 h-3 ${i < Math.floor(product.rating ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 dark:text-gray-600'}`} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">({(product.reviewCount ?? product.reviews ?? 0).toLocaleString()})</span>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-black text-gray-900 dark:text-white">{formatCurrency(salePrice)}</span>
          {discount > 0 && <span className="text-xs text-muted-foreground line-through">{formatCurrency(product.price)}</span>}
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-pulse">
      <div className="h-56 bg-gray-100 dark:bg-gray-800" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/3" />
        <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
      </div>
    </div>
  );
}

export function FeaturedProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productApi.list({ limit: 8, featured: 1 })
      .then((res) => {
        const prods = res.data.data;
        if (prods.length > 0) setProducts(prods);
        else {
          // Fall back to any products
          return productApi.list({ limit: 8 }).then(r => { if (r.data.data.length > 0) setProducts(r.data.data); });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAddToCart = (product: any) => {
    const { items, setItems, openCart } = useCartStore.getState();
    const pid = product.id || product._id;
    const image = product.images?.[0] || '';
    const salePrice = product.salePrice ?? product.price;
    const sellerName = product.sellerName ?? (typeof product.seller === 'string' ? product.seller : product.seller?.storeName ?? '');
    const existing = items.find((i) => i.id === pid);
    if (existing) {
      setItems(items.map((i) => i.id === pid ? { ...i, quantity: i.quantity + 1, totalPrice: i.unitPrice * (i.quantity + 1) } : i));
    } else {
      setItems([...items, { id: pid, productId: pid, productName: product.name, productImage: image, sellerName, quantity: 1, unitPrice: salePrice, totalPrice: salePrice, stock: product.stock ?? 20 }]);
    }
    openCart();
    toast({ title: 'Added to cart!', description: product.name });
  };

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
              <p className="text-orange-600 dark:text-orange-400 font-semibold text-sm uppercase tracking-widest">Handpicked For You</p>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white">
              Featured <span className="gradient-text">Products</span>
            </h2>
          </div>
          <Link href="/products" className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:underline">
            See all →
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : products.slice(0, 8).map((p, i) => (
                <ProductCard key={p.id || p._id} product={p} delay={i} onAddToCart={handleAddToCart} />
              ))
          }
        </div>
      </div>
    </section>
  );
}
