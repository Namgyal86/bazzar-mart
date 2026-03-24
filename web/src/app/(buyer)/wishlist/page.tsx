'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart, Trash2, Star, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { toast } from '@/hooks/use-toast';

function isUrl(s: string) {
  return s?.startsWith('http') || s?.startsWith('/');
}

export default function WishlistPage() {
  const { items: wishlist, removeItem } = useWishlistStore();
  const { setItems, items: cartItems, openCart } = useCartStore();

  const addToCart = (item: typeof wishlist[0]) => {
    const cartItem = {
      id: item.productId,
      productId: item.productId,
      productName: item.name,
      productImage: item.image,
      sellerName: item.seller,
      quantity: 1,
      unitPrice: item.price,
      totalPrice: item.price,
      stock: 99,
    };
    setItems([...cartItems.filter((i) => i.id !== item.productId), cartItem]);
    openCart();
    toast({ title: 'Added to cart!', description: item.name });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── Gradient banner strip ── */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-b from-orange-50 to-transparent dark:from-orange-950/20 dark:to-transparent pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative max-w-5xl mx-auto px-4 pt-10 pb-8">
          <div className="flex items-center gap-4">
            {/* Heart icon with orange glow */}
            <div className="relative p-3 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-orange-100 dark:border-orange-900/40">
              <div
                className="absolute inset-0 rounded-2xl opacity-40 blur-md"
                style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }}
                aria-hidden="true"
              />
              <Heart className="relative w-6 h-6 text-orange-500 fill-orange-500 drop-shadow-[0_0_6px_rgba(249,115,22,0.7)]" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
                My Wishlist
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {wishlist.length} saved item{wishlist.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-16">

        {wishlist.length === 0 ? (
          /* ── Polished empty state ── */
          <div className="text-center py-28 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            {/* Animated pulsing heart */}
            <div className="relative w-28 h-28 mx-auto mb-7 flex items-center justify-center">
              {/* Outer pulse ring */}
              <span
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ background: 'radial-gradient(circle, #f97316, #ef4444)' }}
                aria-hidden="true"
              />
              {/* Inner glow ring */}
              <span
                className="absolute inset-2 rounded-full opacity-30"
                style={{ background: 'radial-gradient(circle, #f97316, #ef4444)' }}
                aria-hidden="true"
              />
              <div
                className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
              >
                <Heart className="w-10 h-10 text-white fill-white" />
              </div>
            </div>

            {/* Gradient headline */}
            <h3
              className="text-2xl font-extrabold mb-2 bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #f97316, #ef4444)' }}
            >
              Your Wishlist is Empty
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto leading-relaxed">
              Save items you love to your wishlist and come back to shop whenever you&apos;re ready.
            </p>

            {/* Gradient CTA button */}
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
            >
              <ShoppingCart className="w-4 h-4" />
              Browse Products
            </Link>
          </div>

        ) : (
          /* ── Product grid ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {wishlist.map((item) => {
              const discount =
                item.basePrice > item.price
                  ? Math.round(((item.basePrice - item.price) / item.basePrice) * 100)
                  : 0;

              return (
                <div
                  key={item.productId}
                  className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group"
                >

                  {/* ── Image area ── */}
                  <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-center">
                    {isUrl(item.image) ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-contain p-4"
                        sizes="240px"
                      />
                    ) : (
                      <Package className="w-16 h-16 text-gray-200 dark:text-gray-700" />
                    )}

                    {/* Discount badge — red gradient pill, top-left */}
                    {discount > 0 && (
                      <span
                        className="absolute top-3 left-3 px-2.5 py-0.5 text-white text-[11px] font-bold rounded-full shadow-sm"
                        style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                      >
                        {discount}% OFF
                      </span>
                    )}

                    {/* Out-of-stock badge (only when no discount badge) */}
                    {!item.inStock && discount === 0 && (
                      <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-gray-700 dark:bg-gray-600 text-white text-[11px] font-bold rounded-full">
                        Out of Stock
                      </span>
                    )}

                    {/* Remove (heart) button — top-right */}
                    <button
                      onClick={() => {
                        removeItem(item.productId);
                        toast({ title: 'Removed from wishlist' });
                      }}
                      className="absolute top-3 right-3 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md border border-gray-100 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-200 dark:hover:border-red-800 transition-all duration-200 group/heart"
                      aria-label="Remove from wishlist"
                    >
                      <Heart className="w-4 h-4 fill-red-400 text-red-400 group-hover/heart:fill-red-600 group-hover/heart:text-red-600 transition-colors duration-200" />
                    </button>
                  </div>

                  {/* ── Card content ── */}
                  <div className="p-4">
                    <Link href={`/products/${item.productId}`}>
                      <p className="font-medium text-sm text-gray-800 dark:text-gray-100 line-clamp-2 hover:text-orange-500 dark:hover:text-orange-400 transition-colors leading-snug">
                        {item.name}
                      </p>
                    </Link>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">by {item.seller}</p>

                    {/* Rating stars — amber */}
                    {item.rating > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {item.rating.toFixed(1)}
                        </span>
                      </div>
                    )}

                    {/* Price — orange current, strikethrough original */}
                    <div className="flex items-baseline gap-2 mt-2.5">
                      <span className="font-bold text-orange-500 dark:text-orange-400">
                        {formatCurrency(item.price)}
                      </span>
                      {item.basePrice > item.price && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 line-through">
                          {formatCurrency(item.basePrice)}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      {/* Add to Cart — orange gradient when in stock */}
                      <button
                        disabled={!item.inStock}
                        onClick={() => addToCart(item)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                          item.inStock
                            ? 'text-white shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                        style={
                          item.inStock
                            ? { background: 'linear-gradient(135deg, #f97316, #ef4444)' }
                            : undefined
                        }
                        aria-label={item.inStock ? 'Add to cart' : 'Out of stock'}
                      >
                        <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                        {item.inStock ? 'Add to Cart' : 'Out of Stock'}
                      </button>

                      {/* Trash — bordered, red on hover */}
                      <button
                        onClick={() => {
                          removeItem(item.productId);
                          toast({ title: 'Removed from wishlist' });
                        }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-200 dark:hover:border-red-800 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200"
                        aria-label="Delete from wishlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
