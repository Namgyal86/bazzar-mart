'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, Users, Truck, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { bannerApi, type Banner } from '@/lib/api/product.api';

const DEFAULT_SLIDES = [
  {
    _id: 'd1',
    eyebrow: "Nepal's Fresh Grocery Store",
    title: 'Fresh Produce',
    subtitle: 'Delivered Daily',
    description: 'Farm-fresh fruits and vegetables sourced directly from local farmers. Free delivery above Rs. 1000.',
    cta: 'Shop Fresh',
    ctaLink: '/categories/fruits-vegetables',
    accentColor: '#22c55e',
    badge: '🥦 Fresh Every Morning',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&q=85',
    isActive: true, order: 0,
  },
  {
    _id: 'd2',
    eyebrow: 'Daily Essentials',
    title: 'Dairy, Grains',
    subtitle: '& Pantry Staples',
    description: 'Stock up on milk, eggs, rice, lentils and everyday kitchen essentials at the best prices.',
    cta: 'Shop Essentials',
    ctaLink: '/categories/dairy-eggs',
    accentColor: '#eab308',
    badge: '🛒 Best Value Packs',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=900&q=85',
    isActive: true, order: 1,
  },
  {
    _id: 'd3',
    eyebrow: 'Snacks & More',
    title: 'Beverages &',
    subtitle: 'Snack Time',
    description: 'Chips, biscuits, juices, tea, coffee and your favourite beverages — all in one place.',
    cta: 'Shop Snacks',
    ctaLink: '/categories/snacks-beverages',
    accentColor: '#f97316',
    badge: '🍿 Top Sellers',
    image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=900&q=85',
    isActive: true, order: 2,
  },
];

const STATS = [
  { icon: ShoppingBag, value: '5,000+',  label: 'Products' },
  { icon: Users,       value: '100+',    label: 'Sellers' },
  { icon: MapPin,      value: '77',      label: 'Districts' },
  { icon: Truck,       value: '10K+',    label: 'Orders Delivered' },
];

const BG_GRADIENTS = [
  'from-slate-950 via-slate-900 to-orange-950',
  'from-violet-950 via-purple-950 to-pink-950',
  'from-teal-950 via-cyan-950 to-slate-950',
  'from-blue-950 via-indigo-950 to-slate-950',
  'from-rose-950 via-red-950 to-orange-950',
];

const textVariants = {
  enter: { opacity: 0, y: 30 },
  center: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

const imageVariants = {
  enter: { opacity: 0, scale: 0.92, x: 60 },
  center: { opacity: 1, scale: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit: { opacity: 0, scale: 0.96, x: -40, transition: { duration: 0.3 } },
};

const statVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.6 + i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
};

type SlideData = typeof DEFAULT_SLIDES[0];

export function HeroSection() {
  const [slides, setSlides] = useState<SlideData[]>(DEFAULT_SLIDES as any);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    bannerApi.list()
      .then((res) => {
        if (res.data.data.length > 0) {
          setSlides(res.data.data.map((b, i) => ({
            ...b, subtitle: b.subtitle || '', order: b.order ?? i,
          })) as any);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => {
      setDirection(1);
      setCurrent((c) => (c + 1) % slides.length);
    }, 5800);
    return () => clearInterval(t);
  }, [slides.length]);

  const goTo = (idx: number) => {
    if (idx === current) return;
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  };

  const prev = () => {
    setDirection(-1);
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  };

  const next = () => {
    setDirection(1);
    setCurrent((c) => (c + 1) % slides.length);
  };

  const slide = slides[current] || DEFAULT_SLIDES[0];
  const bg = BG_GRADIENTS[current % BG_GRADIENTS.length];

  return (
    <section className={`relative min-h-[90vh] bg-gradient-to-br ${bg} overflow-hidden transition-colors duration-700`}>
      {/* Background image */}
      {slide.image && (
        <div className="absolute inset-0 opacity-15">
          <Image src={slide.image} alt="" fill className="object-cover" priority sizes="100vw" />
        </div>
      )}

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '72px 72px' }} />

      {/* Animated glowing orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl"
        animate={{ opacity: [0.06, 0.12, 0.06], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: slide.accentColor }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/3 w-64 h-64 rounded-full blur-3xl"
        animate={{ opacity: [0.04, 0.10, 0.04], scale: [1, 1.15, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{ background: slide.accentColor }}
      />

      <div className="relative z-10 container mx-auto px-4 flex flex-col lg:flex-row items-center gap-10 min-h-[90vh] py-16">
        {/* LEFT: Text */}
        <div className="flex-1 text-white">
          <AnimatePresence mode="wait">
            <motion.div
              key={`text-${current}`}
              variants={textVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
                style={{ background: `${slide.accentColor}20`, border: `1px solid ${slide.accentColor}40` }}
              >
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: slide.accentColor }} />
                <span className="text-sm font-semibold" style={{ color: slide.accentColor }}>{slide.eyebrow}</span>
              </motion.div>

              {slide.badge && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="flex mb-5"
                >
                  <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full text-sm font-bold text-white">
                    {slide.badge}
                  </span>
                </motion.div>
              )}

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                className="font-black leading-none mb-5"
                style={{ fontSize: 'clamp(2.4rem,5.5vw,4.8rem)' }}
              >
                <span className="block text-white/90">{slide.title}</span>
                {slide.subtitle && <span className="block mt-1" style={{ color: slide.accentColor }}>{slide.subtitle}</span>}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="text-lg text-white/60 max-w-md mb-9 leading-relaxed"
              >
                {slide.description}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
                className="flex flex-wrap items-center gap-4 mb-14"
              >
                <Link
                  href={slide.ctaLink || '/products'}
                  className="btn-shine inline-flex items-center gap-2 font-bold px-8 py-4 text-base rounded-2xl shadow-2xl text-white transition-all hover:brightness-110 hover:scale-[1.02]"
                  style={{ background: `linear-gradient(135deg, ${slide.accentColor}, ${slide.accentColor}bb)` }}
                >
                  {slide.cta} <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 font-bold px-8 py-4 text-base rounded-2xl text-white backdrop-blur-sm transition-all hover:bg-white/10"
                  style={{ border: '1px solid rgba(255,255,255,0.25)', background: 'transparent' }}
                >
                  Browse All
                </Link>
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Stats — persistent */}
          <div className="grid grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                custom={i}
                variants={statVariants}
                initial="hidden"
                animate="visible"
                className="text-center"
              >
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* RIGHT: Showcase */}
        <div className="flex-1 flex justify-center items-center">
          <div className="relative w-full max-w-[420px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={`image-${current}`}
                variants={imageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="relative h-[460px] rounded-3xl overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.55)]"
              >
                {slide.image ? (
                  <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0"
                  >
                    <Image src={slide.image} alt={slide.title} fill className="object-cover" priority sizes="420px" />
                  </motion.div>
                ) : (
                  <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
                    <ShoppingBag className="w-24 h-24 text-white/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              </motion.div>
            </AnimatePresence>

            {/* Discount badge */}
            <motion.div
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-4 -right-4 w-20 h-20 rounded-full flex flex-col items-center justify-center text-white font-black shadow-2xl"
              style={{ background: `linear-gradient(135deg, ${slide.accentColor}, ${slide.accentColor}99)` }}
            >
              <span className="text-[9px] uppercase tracking-wide">Up to</span>
              <span className="text-[22px] leading-none">40%</span>
              <span className="text-[9px] uppercase tracking-wide">OFF</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="rounded-full transition-all duration-400"
            style={{
              width: i === current ? '28px' : '8px',
              height: '8px',
              background: i === current ? slide.accentColor : 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </div>

      {/* Wave */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 56" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 56L1440 56L1440 18C1200 56 960 0 720 20C480 40 240 0 0 18L0 56Z" className="fill-white dark:fill-background" />
        </svg>
      </div>
    </section>
  );
}
