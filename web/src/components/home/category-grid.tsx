'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Grid3X3 } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { productApi } from '@/lib/api/product.api';

const FALLBACK_CATEGORIES = [
  { _id: 'c1', name: 'Fruits & Vegetables', slug: 'fruits-vegetables', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=700&q=80', productCount: 0, color: '#22c55e', emoji: '🥦' },
  { _id: 'c2', name: 'Dairy & Eggs',        slug: 'dairy-eggs',        image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80', productCount: 0, color: '#eab308', emoji: '🥛' },
  { _id: 'c3', name: 'Grains & Pulses',     slug: 'grains-pulses',     image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80', productCount: 0, color: '#f59e0b', emoji: '🌾' },
  { _id: 'c4', name: 'Snacks & Beverages',  slug: 'snacks-beverages',  image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500&q=80', productCount: 0, color: '#f97316', emoji: '🍿' },
  { _id: 'c5', name: 'Spices & Condiments', slug: 'spices-condiments', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&q=80', productCount: 0, color: '#ec4899', emoji: '🌶️' },
];

const CATEGORY_COLORS = ['#22c55e', '#eab308', '#f59e0b', '#f97316', '#ec4899', '#3b82f6', '#a855f7', '#06b6d4'];
const CATEGORY_EMOJIS = ['🥦', '🥛', '🌾', '🍿', '🌶️', '🧅', '🍎', '🫙'];
const COL_SPANS = ['md:col-span-2 md:row-span-2', '', '', '', ''];

function TiltCard({ cat, colSpan, index }: { cat: any; colSpan: string; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [shine, setShine] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [12, -12]), { stiffness: 400, damping: 35 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 400, damping: 35 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
    setShine({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  }

  function onLeave() { mx.set(0); my.set(0); setHovered(false); }

  return (
    <motion.div
      ref={cardRef}
      className={colSpan}
      style={{ perspective: '1000px' }}
      variants={{
        hidden: { opacity: 0, y: 40, scale: 0.93 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as any } },
      }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onMouseEnter={() => setHovered(true)}
    >
      <motion.div
        className="relative h-full rounded-2xl overflow-hidden"
        style={{
          rotateX, rotateY,
          transformStyle: 'preserve-3d',
          boxShadow: hovered
            ? `0 35px 80px -10px ${cat.color}55, 0 0 0 1.5px ${cat.color}44, 0 12px 40px rgba(0,0,0,0.22)`
            : `0 8px 32px rgba(0,0,0,0.14), 0 0 0 1px rgba(255,255,255,0.06)`,
          transition: 'box-shadow 0.4s ease',
        }}
      >
        <Link href={`/products?category=${cat.slug}`} className="block h-full min-h-[200px]">
          {/* Background image with zoom */}
          <div className="absolute inset-0 overflow-hidden">
            {cat.image ? (
              <motion.div
                className="absolute inset-0"
                animate={{ scale: hovered ? 1.12 : 1 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <Image src={cat.image} alt={cat.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
              </motion.div>
            ) : (
              <div className="w-full h-full" style={{ background: `${cat.color}22` }} />
            )}
          </div>

          {/* Dark gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" />

          {/* Color tint on hover */}
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.35 }}
            style={{ background: `linear-gradient(135deg, ${cat.color}25 0%, transparent 65%)` }}
          />

          {/* Bottom color glow */}
          <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
            style={{ background: `linear-gradient(to top, ${cat.color}55, transparent)` }} />

          {/* Mouse shine */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.3s',
              background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.22) 0%, transparent 58%)`,
            }}
          />

          {/* Shimmer sweep on hover */}
          {hovered && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
              }}
            />
          )}

          {/* Top accent bar */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{ background: `linear-gradient(90deg, ${cat.color}, ${cat.color}77)`, transformOrigin: 'left' }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.15 + index * 0.1, duration: 0.8 }}
          />

          {/* Floating emoji badge */}
          <motion.div
            className="absolute top-3 right-3 w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-xl"
            style={{
              background: `${cat.color}25`,
              border: `1px solid ${cat.color}50`,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
            animate={{ y: [0, -5, 0], rotate: [0, 3, -3, 0] }}
            transition={{ duration: 4 + index * 0.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 }}
          >
            {cat.emoji || '🛍️'}
          </motion.div>

          {/* Content with lift on hover */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 p-4"
            animate={{ y: hovered ? -6 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <p className="text-white font-bold text-lg leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{cat.name}</p>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-white/65 text-xs">
                {cat.productCount ? `${cat.productCount.toLocaleString()}+ products` : 'Browse products'}
              </p>
              <motion.div
                className="w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: cat.color }}
                animate={{ opacity: hovered ? 1 : 0, x: hovered ? 0 : 12 }}
                transition={{ duration: 0.25 }}
              >
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </motion.div>
            </div>
          </motion.div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

export function CategoryGrid() {
  const [categories, setCategories] = useState<any[]>(FALLBACK_CATEGORIES);

  useEffect(() => {
    productApi.listCategories()
      .then((res) => {
        const cats = res.data.data;
        if (cats.length > 0) {
          setCategories(cats.map((c: any, i: number) => ({
            ...c,
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
            emoji: CATEGORY_EMOJIS[i % CATEGORY_EMOJIS.length],
            image: c.image || FALLBACK_CATEGORIES[i % FALLBACK_CATEGORIES.length]?.image || '',
          })));
        }
      })
      .catch(() => {});
  }, []);

  const displayCats = categories.slice(0, 5);

  return (
    <section className="py-20 bg-white dark:bg-background relative overflow-hidden">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 20% 0%, rgba(249,115,22,0.06) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 0%, rgba(139,92,246,0.05) 0%, transparent 55%),
            radial-gradient(ellipse at 50% 100%, rgba(34,197,94,0.05) 0%, transparent 50%)
          `,
        }}
      />

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <motion.div animate={{ rotate: [0, 12, -12, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                <Grid3X3 className="w-4 h-4 text-orange-500" />
              </motion.div>
              <p className="text-orange-600 dark:text-orange-400 font-semibold text-sm uppercase tracking-widest">Browse by Category</p>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white">
              Shop Everything <span className="gradient-text">You Love</span>
            </h2>
          </div>
          <Link href="/categories" className="hidden md:flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold text-sm hover:underline">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          style={{ gridTemplateRows: 'repeat(2, 220px)' }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {displayCats.map((cat, i) => (
            <TiltCard key={cat._id || cat.slug} cat={cat} colSpan={COL_SPANS[i] || ''} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
