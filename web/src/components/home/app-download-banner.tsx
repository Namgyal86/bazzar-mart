'use client';

import { Smartphone, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSiteSettingsStore } from '@/store/site-settings.store';

const FEATURES = [
  'Exclusive app-only deals',
  'Real-time order tracking',
  'Fastest checkout experience',
  'Instant notifications',
];

export function AppDownloadBanner() {
  const { settings } = useSiteSettingsStore();
  const appStoreUrl  = settings.appStoreUrl  || '#';
  const playStoreUrl = settings.playStoreUrl || '#';

  return (
    <section className="container mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        className="relative rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-white/5 blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative text-white flex-1">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center gap-2 mb-3 bg-white/15 w-fit px-3 py-1.5 rounded-full"
          >
            <Smartphone className="w-4 h-4" />
            <span className="font-semibold text-sm">Download the {settings.siteName || 'Bazzar'} App</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-3xl md:text-4xl font-black leading-tight mb-3"
          >
            Shop smarter,<br />anywhere, anytime
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="text-white/80 mb-5"
          >
            Get the best of {settings.siteName || 'Bazzar'} in your pocket.
          </motion.p>

          <motion.ul className="space-y-1.5 mb-6">
            {FEATURES.map((f, i) => (
              <motion.li
                key={f}
                initial={{ opacity: 0, x: -15 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
                className="flex items-center gap-2 text-sm text-white/90"
              >
                <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-[10px]">✓</span>
                {f}
              </motion.li>
            ))}
          </motion.ul>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="flex flex-wrap gap-3"
          >
            <a href={appStoreUrl} target={appStoreUrl !== '#' ? '_blank' : undefined} rel="noopener noreferrer">
              <motion.div
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="bg-black text-white rounded-xl px-5 py-3 flex items-center gap-3 hover:bg-gray-900 transition-colors"
              >
                {/* Apple logo */}
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.18 1.27-2.16 3.79.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.37 2.79M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div>
                  <div className="text-[10px] text-gray-400">Download on the</div>
                  <div className="font-semibold text-sm">App Store</div>
                </div>
              </motion.div>
            </a>
            <a href={playStoreUrl} target={playStoreUrl !== '#' ? '_blank' : undefined} rel="noopener noreferrer">
              <motion.div
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="bg-black text-white rounded-xl px-5 py-3 flex items-center gap-3 hover:bg-gray-900 transition-colors"
              >
                {/* Google Play logo */}
                <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.18 23.76c.37.2.8.22 1.2.06l11.37-6.57-2.8-2.8-9.77 9.31z" fill="#EA4335"/>
                  <path d="M22.29 10.58l-3.17-1.83-3.15 3.15 3.15 3.16 3.19-1.84c.91-.52.91-1.11-.02-1.64z" fill="#FBBC04"/>
                  <path d="M2.06 1.02C1.74 1.3 1.55 1.76 1.55 2.37v19.26c0 .61.19 1.07.52 1.35l.07.06 10.79-10.79v-.25L2.13.96l-.07.06z" fill="#4285F4"/>
                  <path d="M14.38 8.12L3.18.24c-.4-.16-.83-.14-1.2.06L13.07 11.3l1.31-1.31.78-.78-.78-.78-.01-.01-.99-.31z" fill="#34A853"/>
                </svg>
                <div>
                  <div className="text-[10px] text-gray-400">Get it on</div>
                  <div className="font-semibold text-sm">Google Play</div>
                </div>
              </motion.div>
            </a>
          </motion.div>
        </div>

        {/* 3D Phone mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 30, rotateY: -20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0, rotateY: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="relative text-center shrink-0"
          style={{ perspective: '800px' }}
        >
          <motion.div
            animate={{ y: [-10, 10, -10], rotateZ: [-1, 1, -1] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ filter: 'drop-shadow(0 40px 60px rgba(0,0,0,0.5)) drop-shadow(0 0 40px rgba(249,115,22,0.3))' }}
          >
            <svg viewBox="0 0 140 280" className="w-36 h-auto" xmlns="http://www.w3.org/2000/svg">
              {/* Phone body */}
              <rect x="2" y="2" width="136" height="276" rx="22" fill="url(#phoneGrad)" />
              <rect x="5" y="5" width="130" height="270" rx="19" fill="url(#screenBg)" />
              {/* Notch / pill */}
              <rect x="48" y="9" width="44" height="8" rx="4" fill="#000" fillOpacity="0.6"/>
              <circle cx="96" cy="13" r="3" fill="#1a1a2a"/>
              {/* Home bar */}
              <rect x="52" y="266" width="36" height="4" rx="2" fill="white" fillOpacity="0.25"/>
              {/* Side buttons */}
              <rect x="-1" y="80" width="3" height="30" rx="1.5" fill="white" fillOpacity="0.3"/>
              <rect x="-1" y="118" width="3" height="20" rx="1.5" fill="white" fillOpacity="0.3"/>
              <rect x="138" y="90" width="3" height="40" rx="1.5" fill="white" fillOpacity="0.3"/>

              {/* App bar */}
              <rect x="12" y="22" width="116" height="32" rx="8" fill="url(#appBar)"/>
              <text x="24" y="43" fontSize="10" fontWeight="800" fill="white" fontFamily="system-ui">🛒 {settings.siteName || 'Bazzar'}</text>
              <circle cx="120" cy="38" r="8" fill="rgba(255,255,255,0.15)"/>
              <text x="116" y="42" fontSize="9" fill="white">👤</text>

              {/* Hero banner */}
              <rect x="12" y="60" width="116" height="50" rx="8" fill="url(#heroBanner)"/>
              <text x="20" y="80" fontSize="7" fontWeight="700" fill="white">🥦 Fresh Arrivals</text>
              <text x="20" y="92" fontSize="9" fontWeight="900" fill="white">Up to 40% OFF</text>
              <rect x="20" y="97" width="32" height="9" rx="4" fill="rgba(255,255,255,0.9)"/>
              <text x="22" y="104" fontSize="5.5" fontWeight="700" fill="#f97316">Shop Now</text>

              {/* Product grid */}
              <rect x="12" y="118" width="54" height="54" rx="8" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
              <text x="28" y="149" fontSize="22">🍎</text>
              <text x="16" y="164" fontSize="5.5" fill="rgba(255,255,255,0.8)">Apples 1kg</text>
              <text x="16" y="171" fontSize="6" fontWeight="800" fill="#fb923c">Rs. 250</text>

              <rect x="74" y="118" width="54" height="54" rx="8" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
              <text x="90" y="149" fontSize="22">🥛</text>
              <text x="77" y="164" fontSize="5.5" fill="rgba(255,255,255,0.8)">Milk 1L</text>
              <text x="77" y="171" fontSize="6" fontWeight="800" fill="#fb923c">Rs. 95</text>

              <rect x="12" y="178" width="54" height="54" rx="8" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
              <text x="28" y="209" fontSize="22">🌾</text>
              <text x="16" y="224" fontSize="5.5" fill="rgba(255,255,255,0.8)">Rice 5kg</text>
              <text x="16" y="231" fontSize="6" fontWeight="800" fill="#fb923c">Rs. 650</text>

              <rect x="74" y="178" width="54" height="54" rx="8" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
              <text x="90" y="209" fontSize="22">🌶️</text>
              <text x="77" y="224" fontSize="5.5" fill="rgba(255,255,255,0.8)">Spices</text>
              <text x="77" y="231" fontSize="6" fontWeight="800" fill="#fb923c">Rs. 120</text>

              {/* Bottom nav */}
              <rect x="12" y="238" width="116" height="22" rx="6" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
              <text x="22" y="253" fontSize="12">🏠</text>
              <text x="48" y="253" fontSize="12">🔍</text>
              <text x="72" y="253" fontSize="12">🛒</text>
              <text x="97" y="253" fontSize="12">❤️</text>
              <text x="120" y="253" fontSize="12">👤</text>

              <defs>
                <linearGradient id="phoneGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1e2040"/>
                  <stop offset="100%" stopColor="#0d0f1e"/>
                </linearGradient>
                <linearGradient id="screenBg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f1a35"/>
                  <stop offset="100%" stopColor="#0a0f20"/>
                </linearGradient>
                <linearGradient id="appBar" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f97316"/>
                  <stop offset="100%" stopColor="#ef4444"/>
                </linearGradient>
                <linearGradient id="heroBanner" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1d4ed8"/>
                  <stop offset="100%" stopColor="#7c3aed"/>
                </linearGradient>
              </defs>
            </svg>
          </motion.div>

          {/* Floating badge */}
          <motion.div
            className="absolute -top-3 -right-4 bg-yellow-400 text-yellow-900 text-xs font-black px-3 py-1.5 rounded-full shadow-xl"
            animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            NEW ✨
          </motion.div>

          <div className="flex items-center justify-center gap-1 text-white/80 text-sm mt-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            ))}
            <span className="ml-1">4.8 · 500K+ Downloads</span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
