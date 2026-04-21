'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { productApi } from '@/lib/api/product.api';
import { reviewApi } from '@/lib/api/review.api';
import { ThumbsUp } from 'lucide-react';
import { Star, ShoppingCart, Heart, Share2, Shield, Truck, RotateCcw, ChevronRight, Minus, Plus, CheckCircle, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useCartStore } from '@/store/cart.store';
import { useGuestCartStore } from '@/store/guest-cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { useAuthStore } from '@/store/auth.store';
import { useRecentlyViewedStore } from '@/store/recently-viewed.store';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

interface ProductVariant {
  id: string;
  name: string;
  inStock: boolean;
  priceModifier: number;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  seller: { id: string; name: string; slug: string; rating: number; totalSales: number };
  images: string[];
  basePrice: number;
  salePrice: number;
  stock: number;
  rating: number;
  totalReviews: number;
  description: string;
  specifications: Record<string, string>;
  variants: ProductVariant[];
  category: string;
  isActive: boolean;
  tags: string[];
}

interface Review {
  id: string;
  user: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  verified: boolean;
}

const EMPTY_PRODUCT: Product = {
  id: '',
  name: 'Loading...',
  brand: '',
  seller: { id: '', name: '', slug: '', rating: 0, totalSales: 0 },
  images: [],
  basePrice: 0,
  salePrice: 0,
  stock: 0,
  rating: 0,
  totalReviews: 0,
  description: '',
  specifications: {},
  variants: [],
  category: '',
  isActive: true,
  tags: [],
};

function isUrl(s: string) {
  return s?.startsWith('http') || s?.startsWith('/');
}

export default function ProductDetailPage() {
  const params = useParams();
  const router    = useRouter();
  const openCart  = useCartStore(state => state.openCart);
  const items     = useCartStore(state => state.items);
  const setItems  = useCartStore(state => state.setItems);
  const { toggleItem: toggleWishlist, isInWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();

  const trackViewed    = useRecentlyViewedStore(state => state.track);
  const recentProducts = useRecentlyViewedStore(state => state.products);

  const [product, setProduct]               = useState<Product>(EMPTY_PRODUCT);
  const [reviews, setReviews]               = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [quantity, setQuantity]             = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [activeImage, setActiveImage]       = useState(0);
  const [activeTab, setActiveTab]           = useState<'description' | 'specs' | 'reviews'>('description');
  const [helpfulIds, setHelpfulIds]         = useState<Set<string>>(new Set());

  useEffect(() => {
    const id = params.id as string;
    if (!id) { setLoading(false); return; }

    productApi.getById(id)
      .then((res: any) => {
        const raw = res?.data?.data ?? res?.data ?? res;
        if (!raw) return;

        const variants: ProductVariant[] = Array.isArray(raw.variants) && raw.variants.length > 0
          ? raw.variants.map((v: any, i: number) => ({
              id: v._id ?? v.id ?? String(i),
              name: v.name ?? v.label ?? `Option ${i + 1}`,
              inStock: v.inStock ?? (v.stock > 0),
              priceModifier: v.priceModifier ?? v.additionalPrice ?? 0,
            }))
          : [];

        const specs: Record<string, string> = raw.specifications ?? raw.specs ?? {};

        setProduct({
          id: raw._id ?? raw.id ?? id,
          name: raw.name ?? 'Product',
          brand: raw.brand ?? raw.tags?.[0] ?? '',
          seller: {
            id: raw.sellerId ?? raw.seller?._id ?? '',
            name: raw.sellerName ?? raw.seller?.name ?? raw.seller?.storeName ?? 'Unknown Seller',
            slug: raw.seller?.slug ?? '',
            rating: raw.seller?.rating ?? raw.sellerRating ?? 0,
            totalSales: raw.seller?.totalSales ?? 0,
          },
          images: Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : [],
          basePrice: raw.price ?? raw.basePrice ?? 0,
          salePrice: raw.salePrice ?? raw.price ?? 0,
          stock: raw.stock ?? raw.quantity ?? 0,
          rating: raw.rating ?? raw.averageRating ?? 0,
          totalReviews: raw.reviewCount ?? raw.totalReviews ?? 0,
          description: raw.description ?? '',
          specifications: specs,
          variants,
          category: raw.category?.name ?? raw.categoryName ?? raw.category ?? '',
          isActive: raw.isActive ?? true,
          tags: raw.tags ?? [],
        });

        if (variants.length > 0) setSelectedVariant(variants[0]);

        // Track recently viewed
        trackViewed({
          id:       raw._id ?? raw.id ?? id,
          name:     raw.name ?? 'Product',
          image:    (Array.isArray(raw.images) ? raw.images[0] : null) ?? '',
          price:    raw.price ?? raw.basePrice ?? 0,
          salePrice: raw.salePrice,
          rating:   raw.rating ?? raw.averageRating ?? 0,
          category: raw.category?.name ?? raw.categoryName ?? raw.category ?? '',
        });

        // Fetch related products by category
        const cat = raw.category?.name ?? raw.category ?? '';
        if (cat) {
          productApi.list({ category: cat, limit: 6 })
            .then((r: any) => {
              const list: any[] = (r.data?.data ?? [])
                .filter((p: any) => (p._id ?? p.id) !== (raw._id ?? raw.id))
                .slice(0, 5);
              setRelatedProducts(list);
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;
    reviewApi.list(id)
      .then((res: any) => {
        const payload = res?.data?.data ?? res?.data ?? res;
        // Backend returns { reviews: [], avgRating, total } or a raw array
        const data: any[] = Array.isArray(payload) ? payload : (Array.isArray(payload?.reviews) ? payload.reviews : []);
        if (data.length === 0) return;
        setReviews(data.map((r: any) => ({
          id: r._id ?? r.id ?? String(Math.random()),
          user: r.user?.name ?? r.userName ?? r.user ?? 'Anonymous',
          rating: r.rating ?? 5,
          date: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '',
          title: r.title ?? '',
          body: r.body ?? r.comment ?? r.content ?? '',
          verified: r.verified ?? r.verifiedPurchase ?? false,
        })));
      })
      .catch(() => {});
  }, [params.id]);

  const priceModifier = selectedVariant?.priceModifier ?? 0;
  const finalPrice    = product.salePrice + priceModifier;
  const discount      = product.basePrice > 0
    ? Math.round(((product.basePrice - product.salePrice) / product.basePrice) * 100)
    : 0;

  const shareProduct = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: product.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: 'Link copied!', description: 'Product link copied to clipboard.' });
    }
  };

  const addToCart = async () => {
    // Read directly from store state to avoid Zustand persist hydration timing issues
    const cartItem = {
      productId:    product.id,
      variantId:    selectedVariant?.id,
      productName:  product.name,
      productImage: product.images[0] ?? '',
      sellerId:     product.seller.id || undefined,
      sellerName:   product.seller.name,
      quantity,
      unitPrice:    finalPrice,
      stock:        product.stock,
    };

    const { isAuthenticated } = useAuthStore.getState();

    if (!isAuthenticated) {
      // Guest mode — add to local cart, no login redirect
      useGuestCartStore.getState().addItem(cartItem);
      openCart();
      toast({ title: 'Added to cart!', description: `${product.name} × ${quantity}` });
      return;
    }

    try {
      await useCartStore.getState().addItem(cartItem);
      openCart();
      toast({ title: 'Added to cart!', description: `${product.name} × ${quantity}` });
    } catch (err: any) {
      // 401s are handled by the axios interceptor (token refresh / redirect to login)
      if (err?.response?.status !== 401) {
        setItems([...items.filter(i => i.productId !== product.id), {
          id: `${product.id}-${selectedVariant?.id ?? 'default'}`,
          ...cartItem,
          totalPrice: finalPrice * quantity,
        }]);
        openCart();
        toast({ title: 'Added to cart!', description: `${product.name} × ${quantity}` });
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p>Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-orange-500 dark:hover:text-orange-400">Home</Link>
        <ChevronRight className="w-3 h-3" />
        {product.category && (
          <>
            <Link href={`/products?category=${product.category.toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-orange-500 dark:hover:text-orange-400">
              {product.category}
            </Link>
            <ChevronRight className="w-3 h-3" />
          </>
        )}
        <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* ── Images ── */}
        <div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl h-80 md:h-[450px] flex items-center justify-center border overflow-hidden relative">
            {product.images.length > 0 && isUrl(product.images[activeImage]) ? (
              <Image
                src={product.images[activeImage]}
                alt={product.name}
                fill
                className="object-contain p-4"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Package className="w-20 h-20 opacity-30" />
                <span className="text-sm">No image available</span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2 mt-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 bg-gray-50 dark:bg-gray-900 border rounded-lg overflow-hidden relative flex-shrink-0 transition-all ${
                    activeImage === i
                      ? 'border-orange-500 dark:border-orange-400 ring-2 ring-orange-200 dark:ring-orange-800'
                      : 'border-gray-200 hover:border-orange-300 dark:hover:border-orange-700'
                  }`}
                >
                  {isUrl(img) ? (
                    <Image src={img} alt={`${product.name} ${i + 1}`} fill className="object-cover" sizes="64px" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-2xl">{img}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Details ── */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {product.brand && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
                  {product.brand}
                </span>
              )}
              {product.stock > 0 ? (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400">
                  In Stock
                </span>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400">
                  Out of Stock
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold leading-snug">{product.name}</h1>

            {product.seller.name && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-muted-foreground">Sold by:</span>
                <Link
                  href={`/store/${product.seller.slug}`}
                  className="text-sm text-orange-500 dark:text-orange-400 hover:underline font-medium"
                >
                  {product.seller.name}
                </Link>
                {product.seller.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs">{product.seller.rating}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rating */}
          {product.rating > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-5 h-5 ${s <= Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                ))}
              </div>
              <span className="font-medium">{product.rating}</span>
              {product.totalReviews > 0 && (
                <button onClick={() => setActiveTab('reviews')} className="text-sm text-orange-500 dark:text-orange-400 hover:underline">
                  {product.totalReviews} reviews
                </button>
              )}
            </div>
          )}

          {/* Price */}
          <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-4">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl font-bold text-orange-500 dark:text-orange-400">{formatCurrency(finalPrice)}</span>
              {product.basePrice > product.salePrice && (
                <>
                  <span className="text-lg text-muted-foreground line-through">{formatCurrency(product.basePrice)}</span>
                  {discount > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-red-500 text-white">
                      {discount}% OFF
                    </span>
                  )}
                </>
              )}
            </div>
            {product.basePrice > product.salePrice && (
              <p className="text-sm text-green-600 mt-1 font-medium">
                You save {formatCurrency(product.basePrice - finalPrice)}!
              </p>
            )}
          </div>

          {/* Variants */}
          {product.variants.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Options</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => v.inStock && setSelectedVariant(v)}
                    disabled={!v.inStock}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      selectedVariant?.id === v.id
                        ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400'
                        : v.inStock
                        ? 'border-gray-200 hover:border-gray-400'
                        : 'border-gray-100 text-gray-300 cursor-not-allowed line-through'
                    }`}
                  >
                    {v.name}
                    {v.priceModifier > 0 && ` (+${formatCurrency(v.priceModifier)})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4">
            <span className="font-medium">Quantity:</span>
            <div className="flex items-center gap-2 border rounded-lg">
              <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-medium">{quantity}</span>
              <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {product.stock > 0 && (
              <span className="text-sm text-muted-foreground">{product.stock} available</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-white font-semibold text-sm transition-all hover:scale-[1.01] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
              onClick={addToCart}
              disabled={product.stock === 0}
            >
              <ShoppingCart className="w-5 h-5" /> Add to Cart
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-white font-semibold text-sm transition-all hover:brightness-110 disabled:opacity-50"
              style={{ background: 'hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.15)', border: '1px solid hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.3)' }}
              disabled={product.stock === 0}
              onClick={async () => { await addToCart(); router.push('/checkout'); }}
            >
              Buy Now
            </button>
            <button
              className="w-11 h-11 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              onClick={() => {
                if (!isAuthenticated) {
                  toast({ title: 'Login required', description: 'Please login to save items to your wishlist.' });
                  router.push('/auth/login');
                  return;
                }
                toggleWishlist({
                  id: product.id,
                  productId: product.id,
                  name: product.name,
                  image: product.images[0] ?? '',
                  price: product.salePrice,
                  basePrice: product.basePrice,
                  rating: product.rating,
                  seller: product.seller.name,
                  inStock: product.stock > 0,
                });
                toast({
                  title: isInWishlist(product.id) ? 'Removed from wishlist' : 'Added to wishlist!',
                  description: product.name,
                });
              }}
            >
              <Heart className={`w-5 h-5 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
            <button
              className="w-11 h-11 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={shareProduct}
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Guarantees */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: Shield, text: 'Secure Payment' },
              { icon: Truck, text: 'Fast Delivery' },
              { icon: RotateCcw, text: '7-Day Returns' },
            ].map((item) => (
              <div key={item.text} className="flex flex-col items-center gap-1 text-center text-xs text-muted-foreground">
                <item.icon className="w-5 h-5 text-orange-500" />
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mt-12" id="reviews">
        <div className="flex border-b gap-8">
          {(['description', 'specs', 'reviews'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-orange-500 dark:border-orange-400 text-orange-600 dark:text-orange-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'reviews'
                ? `Reviews (${reviews.length > 0 ? reviews.length : product.totalReviews})`
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === 'description' && (
            <div className="prose max-w-none dark:prose-invert">
              {product.description ? (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </pre>
              ) : (
                <p className="text-muted-foreground italic">No description available.</p>
              )}
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="max-w-xl">
              {Object.keys(product.specifications).length > 0 ? (
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(product.specifications).map(([key, val]) => (
                      <tr key={key} className="border-b">
                        <td className="py-3 pr-4 text-muted-foreground font-medium w-40">{key}</td>
                        <td className="py-3">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted-foreground italic">No specifications available.</p>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="max-w-2xl space-y-4">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="border rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-950/30 rounded-full flex items-center justify-center text-sm font-semibold text-orange-700 dark:text-orange-400">
                            {review.user[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium text-sm">{review.user}</span>
                          {review.verified && (
                            <div className="flex items-center gap-1 text-green-600 text-xs">
                              <CheckCircle className="w-3 h-3" />
                              Verified Purchase
                            </div>
                          )}
                        </div>
                        <div className="flex mt-2">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{review.date}</span>
                    </div>
                    {review.title && <h4 className="font-medium mt-2">{review.title}</h4>}
                    <p className="text-sm text-muted-foreground mt-1">{review.body}</p>
                    <button
                      onClick={() => {
                        if (helpfulIds.has(review.id)) return;
                        reviewApi.markHelpful(review.id).catch(() => {});
                        setHelpfulIds(prev => new Set([...prev, review.id]));
                      }}
                      className={`mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                        helpfulIds.has(review.id)
                          ? 'bg-green-500/10 text-green-600 cursor-default'
                          : 'bg-gray-100 dark:bg-white/5 text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {helpfulIds.has(review.id) ? 'Marked as helpful' : 'Helpful'}
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Star className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>No reviews yet. Be the first to review this product!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Related Products ── */}
      {relatedProducts.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xl font-bold mb-5">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {relatedProducts.map((p: any) => {
              const pid   = p._id ?? p.id;
              const price = p.salePrice ?? p.price ?? 0;
              const base  = p.price ?? p.basePrice ?? 0;
              const img   = Array.isArray(p.images) ? p.images[0] : '';
              return (
                <Link key={pid} href={`/products/${pid}`} className="group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  <div className="relative h-36 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    {img && (img.startsWith('http') || img.startsWith('/')) ? (
                      <Image src={img} alt={p.name} fill className="object-contain p-3 group-hover:scale-105 transition-transform duration-300" sizes="200px" />
                    ) : (
                      <Package className="w-10 h-10 text-gray-300" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground truncate">{p.sellerName}</p>
                    <h4 className="text-sm font-medium line-clamp-2 mt-0.5">{p.name}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm font-bold text-orange-500">{formatCurrency(price)}</span>
                      {base > price && <span className="text-xs text-muted-foreground line-through">{formatCurrency(base)}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recently Viewed ── */}
      {recentProducts.filter(p => p.id !== product.id).length > 0 && (
        <div className="mt-12 pb-8">
          <h2 className="text-xl font-bold mb-5">Recently Viewed</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {recentProducts
              .filter(p => p.id !== product.id)
              .slice(0, 8)
              .map(p => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="group shrink-0 w-40 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative h-28 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                    {p.image && (p.image.startsWith('http') || p.image.startsWith('/')) ? (
                      <Image src={p.image} alt={p.name} fill className="object-contain p-2 group-hover:scale-105 transition-transform duration-300" sizes="160px" />
                    ) : (
                      <Package className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <div className="p-2.5">
                    <h4 className="text-xs font-medium line-clamp-2">{p.name}</h4>
                    <span className="text-xs font-bold text-orange-500 mt-1 block">
                      {formatCurrency(p.salePrice ?? p.price)}
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
