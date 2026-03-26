import Link from 'next/link';
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}>
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className="text-white text-xl font-bold">Bazzar</span>
            </div>
            <p className="text-sm leading-relaxed mb-4">
              Nepal's trusted online grocery store. Order fresh produce, daily essentials, and more with secure
              payments via Khalti, eSewa, Fonepay, and more.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-400" />
                <span>Kathmandu, Nepal 44600</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-orange-400" />
                <span>+977-1-4000000</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-400" />
                <span>support@bazzar.com</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-orange-600 transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-orange-600 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-orange-600 transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-orange-600 transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
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
            <h4 className="text-white font-semibold mb-4">Sell on Bazzar</h4>
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
          <p>© {new Date().getFullYear()} Bazzar Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {/* Payment badges */}
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
