'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Store, Package, ShoppingBag, Truck,
  BarChart2, Bell, Settings, Shield, Tag, MessageSquare, Menu, X,
  LogOut, ChevronRight, Check, AlertCircle, Info, ShoppingCart, Image, Gift,
  Zap, CreditCard,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { apiClient } from '@/lib/api/client';
import { AdminThemeProvider } from '@/components/providers/admin-theme-provider';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
      { icon: BarChart2, label: 'Analytics', href: '/admin/analytics' },
    ],
  },
  {
    label: 'Management',
    items: [
      { icon: Users, label: 'Users', href: '/admin/users' },
      { icon: Store, label: 'Sellers', href: '/admin/sellers' },
      { icon: Package, label: 'Products', href: '/admin/products' },
      { icon: Tag, label: 'Categories', href: '/admin/categories' },
      { icon: ShoppingBag, label: 'Orders', href: '/admin/orders' },
      { icon: CreditCard, label: 'Payments', href: '/admin/payments' },
      { icon: Truck, label: 'Delivery', href: '/admin/delivery' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { icon: Zap, label: 'Flash Deals', href: '/admin/flash-deals' },
      { icon: Tag, label: 'Coupons', href: '/admin/coupons' },
      { icon: MessageSquare, label: 'Reviews', href: '/admin/reviews' },
      { icon: Gift, label: 'Referrals', href: '/admin/referrals' },
      { icon: Image, label: 'Banners', href: '/admin/banners' },
    ],
  },
  {
    label: 'Support',
    items: [
      { icon: MessageSquare, label: 'Support Inbox', href: '/admin/support' },
    ],
  },
  {
    label: 'System',
    items: [
      { icon: Bell, label: 'Notifications', href: '/admin/notifications' },
      { icon: Settings, label: 'Settings', href: '/admin/settings' },
    ],
  },
];

function NotificationIcon({ type }: { type: string }) {
  if (type === 'order') return <ShoppingCart className="w-4 h-4 text-blue-400" />;
  if (type === 'alert') return <AlertCircle className="w-4 h-4 text-red-400" />;
  if (type === 'seller') return <Store className="w-4 h-4" style={{ color: 'var(--ap)' }} />;
  return <Info className="w-4 h-4 text-gray-400" />;
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storeHydrated, setStoreHydrated] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: number; type: string; title: string; message: string; time: string; read: boolean }[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, user, logout } = useAuthStore();
  const { logo, siteName } = useThemeStore();

  const unreadCount = notifications.filter((n) => !n.read).length;

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
    if (!isAuthenticated || user?.role !== 'ADMIN') router.replace('/auth/login');
  }, [storeHydrated, isAuthenticated, user?.role]);

  useEffect(() => {
    if (!storeHydrated || !isAuthenticated) return;
    apiClient.get('/api/v1/notifications/admin')
      .then((res: any) => {
        const data = res.data?.data;
        if (Array.isArray(data)) {
          setNotifications(data.map((n: any, i: number) => ({
            id: i,
            type: n.type?.toLowerCase() || 'info',
            title: n.title,
            message: n.message,
            time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            read: n.isRead ?? false,
          })));
        }
      })
      .catch(() => {});
  }, [storeHydrated, isAuthenticated]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = () => setNotifications((n) => n.map((x) => ({ ...x, read: true })));

  if (!storeHydrated || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        {/* Aurora loader */}
        <div className="relative">
          <div className="absolute -inset-8 rounded-full opacity-20 blur-2xl animate-pulse" style={{ background: 'radial-gradient(circle, var(--ap), transparent)' }} />
          <div className="w-12 h-12 rounded-full border-2 border-white/10 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-t-2 animate-spin" style={{ borderColor: 'var(--ap) transparent transparent transparent' }} />
            <Shield className="w-5 h-5" style={{ color: 'var(--ap)' }} />
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  // Breadcrumb path
  const pathParts = pathname.split('/').filter(Boolean).slice(1);
  const breadcrumb = pathParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' › ');

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0, #080c14)' }}>

      {/* ── Glassmorphic top bar ── */}
      <header
        className="h-16 flex items-center px-5 gap-4 fixed w-full top-0 z-40"
        style={{
          background: 'rgba(10,14,24,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 1px 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Mobile menu toggle */}
        <button
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-white/8 transition-all"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Logo */}
        <Link href="/admin/dashboard" className="flex items-center gap-2.5 group">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, var(--ap), var(--as))',
              boxShadow: '0 0 16px var(--ap, #7c3aed)33',
            }}
          >
            {logo ? (
              <img src={logo} alt="logo" className="w-5 h-5 object-contain rounded" />
            ) : (
              <Shield className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-black text-white text-sm tracking-tight">{siteName || 'Bazzar'}</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--ap)' }}>Admin Console</span>
          </div>
        </Link>

        {/* Breadcrumb */}
        <div className="hidden md:flex items-center gap-1 ml-3">
          <div className="h-4 w-px bg-white/10" />
          <ChevronRight className="w-3.5 h-3.5 text-white/20 mx-1" />
          <span className="text-xs font-medium text-gray-400">{breadcrumb || 'Dashboard'}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white transition-all"
              style={{
                background: notifOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center animate-pulse"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 8px #ef444466' }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                className="absolute right-0 top-12 w-80 rounded-2xl shadow-2xl overflow-hidden z-50"
                style={{
                  background: 'rgba(15,20,35,0.95)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
                }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <div>
                    <p className="text-sm font-bold text-white">Notifications</p>
                    {unreadCount > 0 && <p className="text-xs text-gray-500">{unreadCount} unread</p>}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all hover:opacity-80"
                      style={{ color: 'var(--ap)', background: 'var(--ap-10, rgba(124,58,237,0.1))' }}
                    >
                      <Check className="w-3 h-3" /> All read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-600">
                      <Bell className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-xs">No notifications</p>
                    </div>
                  ) : notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/[0.04] last:border-0"
                      style={!n.read ? { background: 'rgba(255,255,255,0.02)' } : {}}
                      onClick={() => setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))}
                    >
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0 mt-0.5">
                        <NotificationIcon type={n.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs font-semibold truncate', n.read ? 'text-gray-500' : 'text-white')}>{n.title}</p>
                        <p className="text-xs text-gray-600 truncate mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-gray-700 mt-1">{n.time}</p>
                      </div>
                      {!n.read && (
                        <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-2 animate-pulse" style={{ backgroundColor: 'var(--ap)' }} />
                      )}
                    </div>
                  ))}
                </div>
                <Link
                  href="/admin/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold border-t border-white/5 hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--ap)' }}
                >
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          {/* User badge */}
          <div className="flex items-center gap-2 pl-3 border-l border-white/8">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm"
              style={{
                background: 'linear-gradient(135deg, var(--ap), var(--as))',
                boxShadow: '0 0 12px var(--ap, #7c3aed)44',
              }}
            >
              {user.firstName?.[0] ?? 'A'}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-white leading-none">{user.firstName} {user.lastName}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Administrator</p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-1 w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
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
          background: 'rgba(10,14,24,0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Subtle aurora glow in sidebar */}
        <div
          className="absolute top-0 left-0 w-full h-40 pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(ellipse at 20% 0%, var(--ap, #7c3aed)22, transparent 70%)' }}
        />

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 relative">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.18em] px-3 mb-2 flex items-center gap-2">
                <span className="flex-1">{section.label}</span>
                <span className="h-px flex-1 bg-white/5 hidden sm:block" />
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
                        background: 'linear-gradient(90deg, var(--ap-15, rgba(124,58,237,0.15)), var(--ap-5, rgba(124,58,237,0.05)))',
                        border: '1px solid var(--ap-20, rgba(124,58,237,0.2))',
                      } : {}}
                    >
                      {/* Active left bar */}
                      {active && (
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                          style={{ background: 'var(--ap)', boxShadow: '0 0 8px var(--ap)' }}
                        />
                      )}
                      <item.icon
                        className="w-4 h-4 shrink-0 transition-colors"
                        style={active ? { color: 'var(--ap)' } : {}}
                      />
                      <span className="truncate">{item.label}</span>
                      {active && (
                        <div
                          className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: 'var(--ap)', boxShadow: '0 0 6px var(--ap)' }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="shrink-0 p-3 border-t border-white/5 relative">
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
            >
              {user.firstName?.[0] ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.firstName} {user.lastName}</p>
              <p className="text-[10px] text-gray-600 truncate">{user.email}</p>
            </div>
            <Zap className="w-3 h-3 shrink-0" style={{ color: 'var(--ap)' }} />
          </div>
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

      {/* Main content */}
      <main className="lg:ml-60 pt-16 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminThemeProvider>
  );
}
