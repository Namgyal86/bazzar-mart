'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ShoppingBag, User, MapPin, Bell, Heart, Gift, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const NAV_LINKS = [
  { href: '/account/orders', label: 'My Orders', icon: ShoppingBag, color: 'text-blue-500' },
  { href: '/account/profile', label: 'Profile', icon: User, color: 'text-purple-500' },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin, color: 'text-green-500' },
  { href: '/account/notifications', label: 'Notifications', icon: Bell, color: 'text-yellow-500' },
  { href: '/account/referral', label: 'Referral Wallet', icon: Gift, color: 'text-pink-500' },
  { href: '/wishlist', label: 'Wishlist', icon: Heart, color: 'text-red-500' },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [storeHydrated, setStoreHydrated] = useState(false);
  const { user, isAuthenticated } = useAuthStore();

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
    if (!isAuthenticated) router.replace('/auth/login');
  }, [storeHydrated, isAuthenticated]);

  if (!storeHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initial = user?.firstName?.[0]?.toUpperCase() ?? 'U';
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Guest User';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6">

          {/* ── Sidebar ── */}
          <aside className="w-full md:w-64 shrink-0">
            <div
              className="rounded-2xl p-4 sticky top-24 overflow-hidden"
              style={{
                background: 'white',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              {/* User card */}
              <div className="relative flex flex-col items-center text-center py-5 mb-3">
                {/* Gradient background strip */}
                <div className="absolute top-0 left-0 right-0 h-16 rounded-xl opacity-10"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }} />

                <div
                  className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black mb-3 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: '0 8px 24px rgba(249,115,22,0.3)' }}
                >
                  {initial}
                </div>
                <p className="font-bold text-gray-900 text-sm leading-tight">{fullName}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-full px-2">{user?.email ?? ''}</p>
                {user?.role && (
                  <span className="mt-2.5 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold capitalize"
                    style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}>
                    {user.role.toLowerCase()} Account
                  </span>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 mb-3" />

              {/* Navigation */}
              <nav className="space-y-0.5">
                {NAV_LINKS.map(({ href, label, icon: Icon, color }) => {
                  const isActive = pathname === href || (href !== '/wishlist' && pathname.startsWith(href));
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'text-white shadow-md'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                      style={isActive ? { background: 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' } : {}}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : color}`} />
                      <span className="flex-1">{label}</span>
                      <ChevronRight className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all ${isActive ? 'opacity-60' : ''} -translate-x-1 group-hover:translate-x-0`} />
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
