'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { useSiteSettingsStore } from '@/store/site-settings.store';
import { useEffect } from 'react';

export function Footer() {
  const { settings, fetchSettings } = useSiteSettingsStore();

  useEffect(() => { fetchSettings(); }, []);

  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}>
                {settings.logo ? (
                  <Image src={settings.logo} alt={settings.siteName} width={36} height={36} className="object-contain" />
                ) : (
                  <span className="text-white font-bold text-lg">{(settings.siteName || 'B')[0]}</span>
                )}
              </div>
              <span className="text-white text-xl font-bold">{settings.siteName || 'Bazzar'}</span>
            </div>
            <p className="text-sm leading-relaxed mb-4">
              {settings.description}
            </p>
            <div className="space-y-2 text-sm">
              {settings.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>{settings.address}</span>
                </div>
              )}
              {settings.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                  <a href={`tel:${settings.phone}`} className="hover:text-orange-400 transition-colors">{settings.phone}</a>
                </div>
              )}
              {settings.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-400 shrink-0" />
                  <a href={`mailto:${settings.email}`} className="hover:text-orange-400 transition-colors">{settings.email}</a>
                </div>
              )}
            </div>

            {/* Social links */}
            <div className="flex items-center gap-3 mt-6">
              {settings.facebook && (
                <a href={settings.facebook} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 rounded-lg hover:bg-orange-600 transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {settings.instagram && (
                <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 rounded-lg hover:bg-orange-600 transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {settings.twitter && (
                <a href={settings.twitter} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 rounded-lg hover:bg-orange-600 transition-colors">
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {settings.youtube && (
                <a href={settings.youtube} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-800 rounded-lg hover:bg-orange-600 transition-colors">
                  <Youtube className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* App download buttons */}
            {(settings.appStoreUrl || settings.playStoreUrl) && (
              <div className="flex flex-col sm:flex-row gap-2 mt-5">
                {settings.appStoreUrl && (
                  <a href={settings.appStoreUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors border border-gray-700"
                  >
                    <svg className="w-5 h-5 text-white shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <div>
                      <div className="text-[9px] text-gray-400 leading-none">Download on the</div>
                      <div className="text-xs font-semibold text-white leading-tight">App Store</div>
                    </div>
                  </a>
                )}
                {settings.playStoreUrl && (
                  <a href={settings.playStoreUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors border border-gray-700"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M3.18 23.66L14.48 12 3.18.34A2 2 0 002 2.18v19.64a2 2 0 001.18 1.84z"/>
                      <path fill="#FBBC05" d="M19.82 10.17l-3.1-1.8-3.66 3.63 3.66 3.63 3.13-1.81a2 2 0 000-3.65z"/>
                      <path fill="#4285F4" d="M3.18.34L14.48 12 3.18 23.66A2 2 0 012 22V2a2 2 0 011.18-1.66z" opacity=".5"/>
                      <path fill="#34A853" d="M3.18 23.66l11.3-11.29-3.66-3.64-10.46 6.07 2.82 8.86z" opacity=".5"/>
                      <path fill="#34A853" d="M14.48 12L3.18.34l10.46 6.07 3.66 3.63L14.48 12z" opacity=".9"/>
                    </svg>
                    <div>
                      <div className="text-[9px] text-gray-400 leading-none">Get it on</div>
                      <div className="text-xs font-semibold text-white leading-tight">Google Play</div>
                    </div>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white font-semibold mb-4">Shop</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Fruits & Vegetables', href: '/categories/fruits-vegetables' },
                { label: 'Dairy & Eggs', href: '/categories/dairy-eggs' },
                { label: 'Grains & Pulses', href: '/categories/grains-pulses' },
                { label: 'Snacks & Beverages', href: '/categories/snacks-beverages' },
                { label: 'Spices & Condiments', href: '/categories/spices-condiments' },
                { label: 'Personal Care', href: '/categories/personal-care' },
                { label: "Today's Deals", href: '/deals' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="hover:text-orange-400 transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-white font-semibold mb-4">Account</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Sign In', href: '/auth/login' },
                { label: 'Register', href: '/auth/register' },
                { label: 'My Orders', href: '/account/orders' },
                { label: 'My Profile', href: '/account/profile' },
                { label: 'Wishlist', href: '/wishlist' },
                { label: 'Addresses', href: '/account/addresses' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="hover:text-orange-400 transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sell & Help */}
          <div>
            <h4 className="text-white font-semibold mb-4">Sell on {settings.siteName || 'Bazzar'}</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Become a Seller', href: '/sellers/register' },
                { label: 'Seller Dashboard', href: '/seller/dashboard' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="hover:text-orange-400 transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>

            <h4 className="text-white font-semibold mt-6 mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Contact Us', href: '/contact' },
                { label: 'Connect with Admin', href: '/contact/admin' },
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="hover:text-orange-400 transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} {settings.siteName || 'Bazzar'} Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {['Khalti', 'eSewa', 'Fonepay', 'Visa', 'Mastercard'].map((p) => (
              <span key={p} className="bg-gray-800 px-2 py-1 rounded text-gray-400 text-[10px] font-medium">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
