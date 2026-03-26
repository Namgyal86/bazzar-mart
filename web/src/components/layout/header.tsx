'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  ShoppingCart, Search, User, Menu, Heart, Bell, ChevronDown,
  Package, LogOut, Settings, Store, X, Cpu, Shirt, Home,
  Dumbbell, Sparkles, BookOpen, ShoppingBag, TrendingUp,
  Zap, LayoutDashboard, MapPin, Tag,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { useThemeStore } from '@/store/theme.store';
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { categoryApi } from '@/lib/api/product.api';

/* ─── ICON MAP per slug (icons stay code-side; subcategories come from DB) ── */
const CAT_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  'fruits-vegetables': { icon: ShoppingBag, color: 'text-green-500'  },
  'dairy-eggs':        { icon: Package,     color: 'text-yellow-500' },
  'grains-pulses':     { icon: Cpu,         color: 'text-amber-500'  },
  'meat-seafood':      { icon: Dumbbell,    color: 'text-red-500'    },
  'snacks-beverages':  { icon: Sparkles,    color: 'text-orange-400' },
  'spices-condiments': { icon: Home,        color: 'text-pink-500'   },
  'personal-care':     { icon: Shirt,       color: 'text-purple-500' },
  'household-items':   { icon: BookOpen,    color: 'text-teal-500'   },
  'frozen-foods':      { icon: Package,     color: 'text-cyan-500'   },
  'bakery-bread':      { icon: ShoppingBag, color: 'text-amber-400'  },
};

/* ─── QUICK SEARCHES ─────────────────────────────────────────────────────────── */
const QUICK_SEARCHES = ['Basmati Rice','Fresh Milk','Chicken','Mustard Oil','Tata Tea','Aashirvaad Flour'];

/* ─── FRAMER VARIANTS ────────────────────────────────────────────────────────── */
const menuVariants = {
  hidden:  { opacity: 0, y: -8, scaleY: 0.96 },
  visible: { opacity: 1, y: 0, scaleY: 1, transition: { duration: 0.25, ease: [0.16,1,0.3,1] as [number, number, number, number] } },
  exit:    { opacity: 0, y: -6, scaleY: 0.97, transition: { duration: 0.18, ease: 'easeIn' as const } },
};
const mobileMenuVariants = {
  hidden:  { opacity: 0, x: '-100%' },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, damping: 28, stiffness: 280 } },
  exit:    { opacity: 0, x: '-100%', transition: { duration: 0.22 } },
};
const overlayVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.18 } },
};
const dropdownVariants = {
  hidden:  { opacity: 0, y: -4, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: [0.16,1,0.3,1] as [number, number, number, number] } },
  exit:    { opacity: 0, y: -4, scale: 0.97, transition: { duration: 0.15 } },
};

/* ─── COMPONENT ──────────────────────────────────────────────────────────────── */
export function Header() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { logo, siteName } = useThemeStore();
  const openCart     = useCartStore(state => state.openCart);
  const cartCount    = useCartStore(state => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const wishlistCount = useWishlistStore(state => state.items.length);

  const [searchQuery,    setSearchQuery]    = useState('');
  const [searchFocused,  setSearchFocused]  = useState(false);
  const [showUserMenu,   setShowUserMenu]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const [scrolled,       setScrolled]       = useState(false);
  const [cartBounce,     setCartBounce]     = useState(false);
  const [prevCart,       setPrevCart]       = useState(0);
  const [categories, setCategories] = useState<Array<{
    name: string; slug: string; icon: React.ElementType; color: string;
    sub: Array<{ name: string; slug: string }>;
  }>>([]);

  /* fetch categories + subcategories from DB — only showInNav parents */
  useEffect(() => {
    categoryApi.withSubs().then((res: any) => {
      const raw: any[] = Array.isArray(res.data?.data) ? res.data.data : [];
      const enriched = raw
        .filter((c: any) => c.showInNav !== false)
        .map((c: any) => {
          const meta = CAT_ICON[c.slug] ?? { icon: ShoppingBag, color: 'text-orange-400' };
          const subs: Array<{ name: string; slug: string }> = (c.subcategories ?? []).map((s: any) => ({
            name: s.name,
            slug: s.slug,
          }));
          return { name: c.name, slug: c.slug, sub: subs, ...meta };
        });
      if (enriched.length > 0) setCategories(enriched);
    }).catch(() => {});
  }, []);

  const searchRef  = useRef<HTMLDivElement>(null);
  const userRef    = useRef<HTMLDivElement>(null);
  const megaTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* scroll listener */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* cart badge bounce */
  useEffect(() => {
    if (cartCount > prevCart) { setCartBounce(true); setTimeout(() => setCartBounce(false), 600); }
    setPrevCart(cartCount);
  }, [cartCount]);

  /* click-outside to close menus */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false);
      if (userRef.current   && !userRef.current.contains(e.target as Node))   setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* close mobile menu on route change */
  useEffect(() => { setShowMobileMenu(false); setActiveMegaMenu(null); }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) { router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`); setSearchFocused(false); }
  };

  const handleMegaEnter = useCallback((slug: string) => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
    setActiveMegaMenu(slug);
  }, []);

  const handleMegaLeave = useCallback(() => {
    megaTimer.current = setTimeout(() => setActiveMegaMenu(null), 120);
  }, []);

  const handleLogout = () => { logout(); router.push('/'); setShowUserMenu(false); };

  return (
    <>
      {/* ── PROMO BAR ── */}
      <div className="text-white text-xs py-2 text-center overflow-hidden relative" style={{ background: 'linear-gradient(90deg, var(--ap), var(--as))' }}>
        <div className="animate-ticker whitespace-nowrap inline-block">
          🥦 Fresh produce delivered daily &nbsp;|&nbsp;
          💜 Pay with Khalti &amp; eSewa &nbsp;|&nbsp;
          🚚 Free delivery above Rs. 1000 &nbsp;|&nbsp;
          🎉 Use code <strong>FRESH10</strong> for 10% off &nbsp;|&nbsp;
          ⚡ Same-day delivery in Kathmandu Valley &nbsp;|&nbsp;
          🥦 Fresh produce delivered daily &nbsp;|&nbsp;
          💜 Pay with Khalti &amp; eSewa &nbsp;|&nbsp;
          🚚 Free delivery above Rs. 1000 &nbsp;|&nbsp;
          🎉 Use code <strong>FRESH10</strong> for 10% off &nbsp;|&nbsp;
          ⚡ Same-day delivery in Kathmandu Valley &nbsp;|&nbsp;
        </div>
      </div>

      {/* ── MAIN HEADER ── */}
      <header className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'glass-header shadow-lg shadow-black/5'
          : 'bg-white dark:bg-gray-950 border-b border-border',
      )}>
        <div className="container mx-auto px-4">
          <div className="flex h-[66px] items-center gap-3">

            {/* ── LOGO ── */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow duration-300 overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}>
                  {logo ? (
                    <img src={logo} alt={siteName || 'Bazzar'} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <span className="text-white font-black text-xl leading-none">{(siteName || 'Bazzar')[0]}</span>
                  )}
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white dark:border-gray-950" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{siteName || 'Bazzar'}</span>
                <div className="text-[9px] font-medium text-orange-500 -mt-1 tracking-widest uppercase">Nepal's Marketplace</div>
              </div>
            </Link>

            {/* ── SEARCH ── */}
            <div ref={searchRef} className="flex-1 max-w-2xl relative">
              <form onSubmit={handleSearch}>
                <div className={cn(
                  'relative flex items-center rounded-xl border-2 transition-all duration-300',
                  searchFocused
                    ? 'border-orange-500 shadow-lg shadow-orange-500/15 bg-white dark:bg-gray-900'
                    : 'border-border bg-gray-50 dark:bg-gray-900/60 hover:border-orange-300',
                )}>
                  <Search className={cn('absolute left-3.5 w-4 h-4 transition-colors duration-200', searchFocused ? 'text-orange-500' : 'text-muted-foreground')} />
                  <input
                    type="search"
                    placeholder="Search products, brands, categories..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    className="w-full pl-10 pr-24 py-2.5 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-all duration-200 hover:shadow-md btn-shine"
                    style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Search suggestions */}
              <AnimatePresence>
                {searchFocused && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden" animate="visible" exit="exit"
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-border rounded-xl shadow-2xl shadow-black/10 overflow-hidden z-50 search-dropdown"
                  >
                    <div className="p-3">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Quick Searches</p>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_SEARCHES.map(q => (
                          <button
                            key={q}
                            onClick={() => { setSearchQuery(q); router.push(`/search?q=${encodeURIComponent(q)}`); setSearchFocused(false); }}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-colors duration-150"
                          >
                            <TrendingUp className="w-3 h-3" /> {q}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-border p-2">
                      {['deals','products','search?q=new+arrivals'].map((path, i) => (
                        <Link
                          key={path}
                          href={`/${path}`}
                          onClick={() => setSearchFocused(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
                        >
                          {i === 0 ? <Zap className="w-4 h-4 text-orange-500" /> : i === 1 ? <ShoppingBag className="w-4 h-4 text-orange-500" /> : <TrendingUp className="w-4 h-4 text-orange-500" />}
                          {i === 0 ? "Today's Deals" : i === 1 ? 'All Products' : 'New Arrivals'}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── RIGHT ACTIONS ── */}
            <div className="flex items-center gap-0.5">

              {/* Wishlist */}
              <Link href="/wishlist" className="hidden md:flex relative w-10 h-10 items-center justify-center rounded-xl hover:bg-pink-50 dark:hover:bg-pink-900/20 text-muted-foreground hover:text-pink-500 transition-colors duration-200 group">
                <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Notifications */}
              {isAuthenticated && (
                <Link href="/account/notifications" className="hidden md:flex relative w-10 h-10 items-center justify-center rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 text-muted-foreground hover:text-amber-500 transition-colors duration-200 group">
                  <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-950 animate-pulse" />
                </Link>
              )}

              {/* Cart */}
              <button
                onClick={openCart}
                className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/20 text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-200 group"
              >
                <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0 }} animate={{ scale: cartBounce ? 1.3 : 1 }} exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                      style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* User Menu */}
              {isAuthenticated && user ? (
                <div ref={userRef} className="relative hidden md:block">
                  <button
                    onClick={() => setShowUserMenu(v => !v)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-muted transition-colors duration-200 group"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}>
                      <span className="text-white font-bold text-sm">{user.firstName[0]}</span>
                    </div>
                    <div className="hidden lg:block text-left">
                      <div className="text-sm font-semibold leading-tight">{user.firstName}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{user.role.toLowerCase()}</div>
                    </div>
                    <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform duration-200', showUserMenu && 'rotate-180')} />
                  </button>

                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        variants={dropdownVariants}
                        initial="hidden" animate="visible" exit="exit"
                        className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white dark:bg-gray-900 border border-border rounded-2xl shadow-2xl shadow-black/10 overflow-hidden z-50"
                      >
                        <div className="bg-orange-50 dark:bg-orange-950/50 dark:to-orange-950/30 px-4 py-3">
                          <p className="font-semibold text-sm">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                          <span className="mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded-full border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400">{user.role}</span>
                        </div>
                        <div className="p-1.5">
                          {[
                            { href: '/account/profile', icon: User, label: 'My Profile' },
                            { href: '/account/orders', icon: Package, label: 'My Orders' },
                            ...(user.role === 'SELLER' ? [{ href: '/seller/dashboard', icon: Store, label: 'Seller Dashboard' }] : []),
                            ...(user.role === 'ADMIN'  ? [{ href: '/admin/dashboard',  icon: LayoutDashboard, label: 'Admin Panel' }] : []),
                          ].map(item => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors duration-150 list-item-hover"
                            >
                              <item.icon className="w-4 h-4 text-orange-500" />
                              {item.label}
                            </Link>
                          ))}
                          <div className="border-t border-border mt-1 pt-1">
                            <button
                              onClick={handleLogout}
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-150 w-full"
                            >
                              <LogOut className="w-4 h-4" /> Sign Out
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2 ml-1">
                  <Link href="/auth/login" className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-xl hover:bg-muted transition-colors duration-200">Login</Link>
                  <Link href="/auth/register" className="btn-shine inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-lg transition-all hover:scale-[1.01]" style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))', boxShadow: '0 4px 12px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.3)' }}>Sign Up</Link>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
                onClick={() => setShowMobileMenu(v => !v)}
                aria-label="Toggle menu"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* ── CATEGORY NAV ── */}
          <nav className="hidden md:flex items-center gap-1 pb-2">
            {categories.map(cat => (
              <div
                key={cat.slug}
                className="relative"
                onMouseEnter={() => handleMegaEnter(cat.slug)}
                onMouseLeave={handleMegaLeave}
              >
                <Link
                  href={`/categories/${cat.slug}`}
                  className={cn(
                    'nav-link flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200',
                    activeMegaMenu === cat.slug
                      ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  <cat.icon className={cn('w-3.5 h-3.5', activeMegaMenu === cat.slug && cat.color)} />
                  {cat.name}
                  <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', activeMegaMenu === cat.slug && 'rotate-180')} />
                </Link>

                {/* Mega menu */}
                <AnimatePresence>
                  {activeMegaMenu === cat.slug && (
                    <motion.div
                      variants={menuVariants}
                      initial="hidden" animate="visible" exit="exit"
                      onMouseEnter={() => handleMegaEnter(cat.slug)}
                      onMouseLeave={handleMegaLeave}
                      className="absolute top-[calc(100%+4px)] left-0 bg-white dark:bg-gray-900 border border-border rounded-2xl shadow-2xl shadow-black/10 p-4 z-50 min-w-[220px]"
                      style={{ transformOrigin: 'top left' }}
                    >
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                        <cat.icon className={cn('w-4 h-4', cat.color)} />
                        <span className="font-semibold text-sm">{cat.name}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-0.5">
                        {cat.sub.map((sub, i) => (
                          <Link
                            key={sub.slug}
                            href={`/categories/${cat.slug}?sub=${encodeURIComponent(sub.name)}`}
                            onClick={() => setActiveMegaMenu(null)}
                            className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-lg transition-all duration-150"
                            style={{ transitionDelay: `${i * 20}ms` }}
                          >
                            <span className="w-1 h-1 rounded-full bg-orange-400 opacity-60" />
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                      <Link
                        href={`/categories/${cat.slug}`}
                        className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors"
                      >
                        View all {cat.name} <span>→</span>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            <Link
              href="/deals"
              className="ml-1 flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/20 text-red-500 hover:from-red-100 hover:to-orange-100 transition-all duration-200 border border-red-100 dark:border-red-900/30"
            >
              <Zap className="w-3.5 h-3.5 fill-red-500" />
              Today's Deals
            </Link>
            <Link
              href="/sellers/register"
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-200"
            >
              <Tag className="w-3.5 h-3.5" />
              Sell Groceries
            </Link>
          </nav>
        </div>
      </header>

      {/* ── MOBILE MENU ── */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.div
              variants={overlayVariants}
              initial="hidden" animate="visible" exit="exit"
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
              onClick={() => setShowMobileMenu(false)}
            />
            <motion.div
              variants={mobileMenuVariants}
              initial="hidden" animate="visible" exit="exit"
              className="fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[90vw] bg-white dark:bg-gray-950 shadow-2xl md:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}>
                    {logo ? (
                      <img src={logo} alt={siteName || 'Bazzar'} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <span className="text-white font-black">{(siteName || 'Bazzar')[0]}</span>
                    )}
                  </div>
                  <span className="font-black text-lg">{siteName || 'Bazzar'}</span>
                </div>
                <button onClick={() => setShowMobileMenu(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-1">
                {isAuthenticated && user ? (
                  <div className="bg-orange-50 dark:bg-orange-950/40 rounded-xl p-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}>
                        <span className="text-white font-bold">{user.firstName[0]}</span>
                      </div>
                      <div>
                        <p className="font-semibold">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <Link href="/account/profile" onClick={() => setShowMobileMenu(false)} className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-gray-800 rounded-lg hover:bg-orange-50 transition-colors">
                        <User className="w-3.5 h-3.5 text-orange-500" /> Profile
                      </Link>
                      <Link href="/account/orders" onClick={() => setShowMobileMenu(false)} className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-gray-800 rounded-lg hover:bg-orange-50 transition-colors">
                        <Package className="w-3.5 h-3.5 text-orange-500" /> Orders
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mb-4">
                    <Link href="/auth/login" className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors duration-200">Login</Link>
                    <Link href="/auth/register" className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-semibold text-white rounded-xl transition-all" style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}>Sign Up</Link>
                  </div>
                )}

                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1">Categories</p>
                {categories.map(cat => (
                  <Link
                    key={cat.slug}
                    href={`/categories/${cat.slug}`}
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors duration-150"
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', `bg-${cat.color.split('-')[1]}-100 dark:bg-${cat.color.split('-')[1]}-900/30`)}>
                      <cat.icon className={cn('w-4 h-4', cat.color)} />
                    </div>
                    <span className="text-sm font-medium">{cat.name}</span>
                  </Link>
                ))}

                <div className="border-t border-border mt-3 pt-3">
                  <Link href="/deals" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 font-semibold hover:bg-red-50 transition-colors">
                    <Zap className="w-4 h-4 fill-red-500" /> Today's Deals
                  </Link>
                </div>

                {isAuthenticated && (
                  <div className="border-t border-border mt-1 pt-3">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors w-full text-sm font-medium">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
