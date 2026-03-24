'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { TrendingUp, Flame } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { productApi } from '@/lib/api/product.api';
import { motion } from 'framer-motion';


export function TrendingProducts() {
  const [trending, setTrending] = useState<any[]>([]);

  useEffect(() => {
    productApi.list({ limit: 6, sort: 'rating' })
      .then((res: any) => {
        const body = res.data;
        const prods = Array.isArray(body.data) ? body.data : (body.data?.products ?? []);
        setTrending(prods.slice(0, 6).map((p: any, i: number) => ({
            id: p._id || p.id,
            rank: i + 1,
            name: p.name,
            price: p.salePrice ?? p.price,
            reviewCount: p.reviewCount ?? 0,
            images: p.images ?? [],
            change: ['+24%', '+18%', '+31%', '+12%', '+45%', '+9%'][i] ?? '+10%',
          })));
      })
      .catch(() => {});
  }, []);

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <p className="text-orange-600 dark:text-orange-400 font-semibold text-sm uppercase tracking-widest">What's Hot Right Now</p>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white">
              Trending <span className="gradient-text">This Week</span>
            </h2>
          </div>
          <Link href="/products" className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:underline">
            See all →
          </Link>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {trending.map((item) => {
            const pid = item.id || item._id;
            const image = item.images?.[0] || '';
            return (
              <motion.div
                key={pid}
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
                }}
                whileHover={{ x: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Link
                  href={`/products/${pid}`}
                  className="group flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-800 transition-colors duration-200 block"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shrink-0 ${item.rank <= 3 ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                    {item.rank <= 3 ? <Flame className="w-5 h-5" /> : item.rank}
                  </div>
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 shrink-0">
                    {image && <Image src={image} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" sizes="64px" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-orange-600 dark:text-orange-400 font-black text-sm mt-0.5">{formatCurrency(item.price)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{(item.reviewCount ?? 0).toLocaleString()} reviews</p>
                  </div>
                  <div className="shrink-0 text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2.5 py-1.5 rounded-lg">
                    {item.change}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
