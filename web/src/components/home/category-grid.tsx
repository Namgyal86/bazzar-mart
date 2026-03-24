'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Grid3X3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { productApi, type Category } from '@/lib/api/product.api';

const FALLBACK_CATEGORIES = [
  { _id: 'c1', name: 'Fruits & Vegetables', slug: 'fruits-vegetables', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=700&q=80', productCount: 0, color: '#22c55e' },
  { _id: 'c2', name: 'Dairy & Eggs',        slug: 'dairy-eggs',        image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80', productCount: 0, color: '#eab308' },
  { _id: 'c3', name: 'Grains & Pulses',     slug: 'grains-pulses',     image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80', productCount: 0, color: '#f59e0b' },
  { _id: 'c4', name: 'Snacks & Beverages',  slug: 'snacks-beverages',  image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500&q=80', productCount: 0, color: '#f97316' },
  { _id: 'c5', name: 'Spices & Condiments', slug: 'spices-condiments', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&q=80', productCount: 0, color: '#ec4899' },
];

const CATEGORY_COLORS = ['#3b82f6', '#ec4899', '#22c55e', '#f97316', '#a855f7', '#06b6d4', '#f59e0b', '#ef4444'];

const COL_SPANS = ['md:col-span-2 md:row-span-2', '', '', '', ''];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export function CategoryGrid() {
  const [categories, setCategories] = useState<any[]>(FALLBACK_CATEGORIES);

  useEffect(() => {
    productApi.listCategories()
      .then((res) => {
        const cats = res.data.data;
        if (cats.length > 0) {
          setCategories(cats.map((c, i) => ({
            ...c,
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
            image: c.image || FALLBACK_CATEGORIES[i % FALLBACK_CATEGORIES.length]?.image || '',
          })));
        }
      })
      .catch(() => {});
  }, []);

  const displayCats = categories.slice(0, 5);

  return (
    <section className="py-20 bg-white dark:bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Grid3X3 className="w-4 h-4 text-orange-500" />
              <p className="text-orange-600 dark:text-orange-400 font-semibold text-sm uppercase tracking-widest">Browse by Category</p>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white">
              Shop Everything <span className="gradient-text">You Love</span>
            </h2>
          </div>
          <Link href="/products" className="hidden md:flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold text-sm hover:underline">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          style={{ gridTemplateRows: 'repeat(2, 220px)' }}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {displayCats.map((cat, i) => (
            <motion.div key={cat._id || cat.slug} variants={cardVariants} className={COL_SPANS[i] || ''}>
              <Link
                href={`/products?category=${cat.slug}`}
                className="category-card relative rounded-2xl overflow-hidden cursor-pointer group block h-full"
              >
                {/* Image */}
                <div className="absolute inset-0">
                  {cat.image ? (
                    <Image src={cat.image} alt={cat.name} fill className="object-cover cat-img" sizes="(max-width: 768px) 50vw, 33vw" />
                  ) : (
                    <div className="w-full h-full" style={{ background: `${cat.color}22` }} />
                  )}
                </div>

                {/* Dark gradient overlay */}
                <div className="cat-overlay absolute inset-0" />

                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1 opacity-90" style={{ background: cat.color }} />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white font-bold text-lg leading-tight drop-shadow">{cat.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-white/65 text-xs">
                      {cat.productCount ? `${cat.productCount.toLocaleString()}+ products` : 'Browse products'}
                    </p>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300"
                      style={{ background: cat.color }}
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
