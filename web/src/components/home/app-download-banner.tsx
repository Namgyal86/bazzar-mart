'use client';

import Link from 'next/link';
import { Smartphone, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const FEATURES = [
  'Exclusive app-only deals',
  'Real-time order tracking',
  'Fastest checkout experience',
  'Instant notifications',
];

export function AppDownloadBanner() {
  return (
    <section className="container mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        className="relative rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
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
            <span className="font-semibold text-sm">Download the Bazzar App</span>
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
            Get the best of Bazzar in your pocket.
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
            <Link href="#">
              <motion.div
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="bg-black text-white rounded-xl px-5 py-3 flex items-center gap-3 hover:bg-gray-900 transition-colors"
              >
                <span className="text-2xl">🍎</span>
                <div>
                  <div className="text-[10px] text-gray-400">Download on the</div>
                  <div className="font-semibold text-sm">App Store</div>
                </div>
              </motion.div>
            </Link>
            <Link href="#">
              <motion.div
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="bg-black text-white rounded-xl px-5 py-3 flex items-center gap-3 hover:bg-gray-900 transition-colors"
              >
                <span className="text-2xl">▶️</span>
                <div>
                  <div className="text-[10px] text-gray-400">Get it on</div>
                  <div className="font-semibold text-sm">Google Play</div>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </div>

        {/* Phone mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="relative text-center shrink-0"
        >
          <motion.div
            animate={{ y: [-8, 8, -8] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="text-[130px] leading-none select-none drop-shadow-2xl">📱</div>
          </motion.div>
          <div className="flex items-center justify-center gap-1 text-white/80 text-sm mt-2">
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
