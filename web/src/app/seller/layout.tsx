'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingBag, BarChart2, Store, Bell, Settings,
  Menu, X, TrendingUp, DollarSign, Plus, LogOut, Zap, Star, Users,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/seller/dashboard' },
      { icon: TrendingUp, label: 'Analytics', href: '/seller/analytics' },
    ],
  },
  {
    label: 'Store',
    items: [
      { icon: Package, label: 'Products', href: '/seller/products' },
      { icon: ShoppingBag, label: 'Orders', href: '/seller/orders' },
      { icon: Users, label: 'Customers', href: '/seller/customers' },
      { icon: Star, label: 'Reviews', href: '/seller/reviews' },
      { icon: Plus, label: 'Add Product', href: '/seller/products/new' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { icon: DollarSign, label: 'Payouts', href: '/seller/payouts' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { icon: Store, label: 'Storefront', href: '/seller/storefront' },
      { icon: Bell, label: 'Notifications', href: '/seller/notifications' },
      { icon: Settings, label: 'Settings', href: '/seller/settings' },
    ],
  },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storeHydrated, setStoreHydrated] = useState(false);
  const { user, logout, isAuthenticated } = useAuthStore();
  const { siteName } = useThemeStore();

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setStoreHydrated(true);
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => setStoreHydrated(true));
      return () => unsub();
    }
  }, []);

  useEffect(() => {
    if (!storeHydrated) return;
    if (!isAuthenticated || (user?.role !== 'SELLER' && user?.role !== 'ADMIN')) {
      router.replace('/auth/login');
    }
  }, [storeHydrated, isAuthenticated, user?.role]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  if (!storeHydrated || !isAuthenticated || (user?.role !== 'SELLER' && user?.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <div className="relative">
          <div className="absolute -inset-8 rounded-full bg-blue-500/10 blur-2xl animate-pulse" />
          <div className="w-12 h-12 rounded-full border-2 border-white/10 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            <Store className="w-5 h-5 text-blue-400" />
          </div>
        </div>
      </div>
    );
  }

  const pathParts = pathname.split('/').filter(Boolean).slice(1);
  const breadcrumb = pathParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' › ');

  return (
    <div className="min-h-screen bg-[#080c14]">

      {/* ── Glassmorphic header ── */}
      <header
        className="h-16 flex items-center px-4 gap-4 fixed w-full top-0 z-40"
        style={{
          background: 'rgba(8,12,20,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 1px 40px rgba(0,0,0,0.4)',
        }}
      >
        <button
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-white/8 transition-all"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Logo */}
        <Link href="/seller/dashboard" className="flex items-center gap-2.5 group">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              boxShadow: '0 0 16px rgba(99,102,241,0.3)',
            }}
          >
            <Store className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-black text-white text-sm tracking-tight">{siteName || 'Bazzar'}</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-blue-400">Seller Hub</span>
          </div>
        </Link>

        {/* Breadcrumb */}
        <div className="hidden md:flex items-center gap-1 ml-3 text-xs text-gray-500">
          <div className="h-4 w-px bg-white/10 mr-1" />
          <span className="text-gray-400">{breadcrumb || 'Dashboard'}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Quick add product */}
          <Link
            href="/seller/products/new"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              boxShadow: '0 0 12px rgba(99,102,241,0.25)',
            }}
          >
            <Plus className="w-3.5 h-3.5" /> New Product
          </Link>

          {/* Notifications */}
          <Link
            href="/seller/notifications"
            className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </Link>

          {/* User */}
          <div className="flex items-center gap-2 pl-3 border-l border-white/8">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                boxShadow: '0 0 10px rgba(99,102,241,0.3)',
              }}
            >
              {user?.firstName?.[0] ?? 'S'}
            </div>
            <span className="text-sm font-semibold text-gray-300 hidden sm:block">{user?.firstName ?? 'Seller'}</span>
          </div>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'fixed left-0 top-16 h-[calc(100vh-4rem)] w-60 z-30 transition-transform duration-300 ease-in-out flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{
          background: 'rgba(8,12,20,0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Subtle blue glow top */}
        <div
          className="absolute top-0 left-0 w-full h-40 pointer-events-none opacity-25"
          style={{ background: 'radial-gradient(ellipse at 30% 0%, rgba(99,102,241,0.3), transparent 70%)' }}
        />

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 relative">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.18em] px-3 mb-2">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden',
                        active
                          ? 'text-white'
                          : 'text-gray-500 hover:text-gray-200 hover:bg-white/5',
                      )}
                      style={active ? {
                        background: 'linear-gradient(90deg, rgba(59,130,246,0.15), rgba(99,102,241,0.05))',
                        border: '1px solid rgba(99,102,241,0.25)',
                      } : {}}
                    >
                      {/* Active glow bar */}
                      {active && (
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                          style={{ background: '#6366f1', boxShadow: '0 0 8px #6366f1' }}
                        />
                      )}
                      <item.icon
                        className="w-4 h-4 shrink-0 transition-colors"
                        style={active ? { color: '#818cf8' } : {}}
                      />
                      <span className="truncate">{item.label}</span>
                      {active && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0 bg-blue-400"
                          style={{ boxShadow: '0 0 6px #60a5fa' }} />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 p-3 border-t border-white/5">
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
            >
              {user?.firstName?.[0] ?? 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-gray-600 truncate">{user?.email}</p>
            </div>
            <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-md px-1.5 py-0.5 shrink-0">SELLER</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/8 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          style={{ backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <main className="lg:ml-60 pt-16 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
