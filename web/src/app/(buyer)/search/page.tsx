'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { Star, ShoppingCart, Heart, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { productApi } from '@/lib/api/product.api';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { toast } from '@/hooks/use-toast';


function SearchContent() {
  const params = useSearchParams();
  const query = params.get('q') || '';

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { items, setItems, openCart } = useCartStore();
  const { toggleItem: toggleWishlist, isInWishlist } = useWishlistStore();

  useEffect(() => {
    if (!query) { setResults([]); return; }
    setLoading(true);
    productApi.search(query)
      .then(res => {
        const prods: any[] = Array.isArray(res.data.data) ? res.data.data : (res.data.data as any)?.products ?? [];
        setResults(prods.map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          price: p.price,
          salePrice: p.salePrice || p.price,
          rating: p.rating,
          reviews: p.reviewCount,
          image: p.images?.[0] || '',
          seller: typeof p.seller === 'string' ? p.seller : p.seller?.storeName,
          category: p.category?.name || '',
        })));
      })
      .catch(() => { setResults([]); })
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">

        {/* ── Search Header ── */}
        {query && (
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              Search results for:{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, var(--ap), var(--as))' }}
              >
                &ldquo;{query}&rdquo;
              </span>
            </h1>
            {!loading && (
              <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-semibold px-3 py-1 border border-orange-200 dark:border-orange-800">
                {results.length} {results.length === 1 ? 'product' : 'products'} found
              </span>
            )}
          </div>
        )}

        {/* ── Trending section (no query) ── */}
        {!query && (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 mb-8 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
              >
                <Search className="w-4 h-4 text-white" />
              </span>
              <p className="text-base font-semibold text-gray-800 dark:text-white">Trending Searches</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Samsung Galaxy', 'iPhone', 'Laptop', 'Nike Shoes', 'Headphones', 'Smart Watch', 'Camera', 'Speaker'].map((s) => (
                <Link key={s} href={`/search?q=${encodeURIComponent(s)}`}>
                  <span className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 select-none">
                    <Search className="w-3 h-3 opacity-50" />
                    {s}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden"
              >
                {/* Image placeholder */}
                <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 animate-pulse" />
                <div className="p-3 space-y-2.5">
                  {/* Seller line */}
                  <div className="h-2.5 w-1/3 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  {/* Name lines */}
                  <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  {/* Rating */}
                  <div className="h-2.5 w-1/2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  {/* Price */}
                  <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  {/* Button */}
                  <div className="h-8 w-full bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── No results empty state ── */}
        {!loading && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div
              className="flex items-center justify-center w-20 h-20 rounded-2xl mb-2"
              style={{ background: 'linear-gradient(135deg, #fed7aa, #fecaca)' }}
            >
              <Search className="w-9 h-9 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--ap), var(--as))' }}>
              No results found
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
              We couldn&apos;t find anything for &ldquo;{query}&rdquo;. Try checking your spelling or using more general terms.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {['Electronics', 'Clothing', 'Home & Garden', 'Sports'].map((s) => (
                <Link key={s} href={`/search?q=${encodeURIComponent(s)}`}>
                  <span className="bg-gray-100 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-200">
                    {s}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Product grid ── */}
        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((p) => {
              const discount = p.price > 0 ? Math.round(((p.price - p.salePrice) / p.price) * 100) : 0;
              const isUrl = (s: string) => s?.startsWith('http') || s?.startsWith('/');
              return (
                <div
                  key={p.id}
                  className="group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  {/* Image area */}
                  <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 h-44 flex items-center justify-center">
                    {isUrl(p.image) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt={p.name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <span className="text-6xl">{p.image || '📦'}</span>
                    )}

                    {/* Discount badge — top-left */}
                    {discount > 0 && (
                      <span
                        className="absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow"
                        style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                      >
                        -{discount}%
                      </span>
                    )}

                    {/* Wishlist button — top-right, visible on hover */}
                    <button
                      className="absolute top-2 right-2 p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110"
                      onClick={() => {
                        toggleWishlist({ id: p.id, productId: p.id, name: p.name, image: p.image, price: p.salePrice, basePrice: p.price, rating: p.rating ?? 0, seller: p.seller ?? '', inStock: true });
                        toast({ title: isInWishlist(p.id) ? 'Removed from wishlist' : 'Saved to wishlist!' });
                      }}
                    >
                      <Heart className={`w-3.5 h-3.5 transition-colors ${isInWishlist(p.id) ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'}`} />
                    </button>
                  </div>

                  {/* Card body */}
                  <div className="p-3 space-y-1.5">
                    <p className="text-[11px] text-gray-400 dark:text-gray-400 truncate">{p.seller}</p>

                    <Link href={`/products/${p.id}`}>
                      <h3 className="text-sm font-medium line-clamp-2 text-gray-800 dark:text-white hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
                        {p.name}
                      </h3>
                    </Link>

                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">{p.rating} ({p.reviews})</span>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="font-bold text-sm bg-clip-text text-transparent"
                        style={{ backgroundImage: 'linear-gradient(135deg, var(--ap), var(--as))' }}
                      >
                        {formatCurrency(p.salePrice)}
                      </span>
                      {discount > 0 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 line-through">
                          {formatCurrency(p.price)}
                        </span>
                      )}
                    </div>

                    {/* Add to Cart */}
                    <button
                      className="w-full flex items-center justify-center gap-1.5 text-white text-xs font-semibold py-2 rounded-xl transition-all duration-200 hover:opacity-90 hover:shadow-md active:scale-95"
                      style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
                      onClick={() => {
                        const cartItem = {
                          id: p.id,
                          productId: p.id,
                          productName: p.name,
                          productImage: p.image,
                          sellerName: p.seller ?? '',
                          quantity: 1,
                          unitPrice: p.salePrice,
                          totalPrice: p.salePrice,
                          stock: 99,
                        };
                        setItems([...items.filter((i) => i.id !== p.id), cartItem]);
                        openCart();
                        toast({ title: 'Added to cart!', description: p.name });
                      }}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Add to Cart
                    </button>
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

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden"
                >
                  <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 animate-pulse" />
                  <div className="p-3 space-y-2.5">
                    <div className="h-2.5 w-1/3 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    <div className="h-2.5 w-1/2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    <div className="h-8 w-full bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
