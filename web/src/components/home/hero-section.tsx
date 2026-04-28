'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, Users, Truck, MapPin, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { bannerApi, type Banner } from '@/lib/api/product.api';

const FLOAT_CHIPS = [
  { label: '🥦 Fresh Veggies', color: '#22c55e', delay: 0,   x: '8%',  y: '22%', rotate: -8  },
  { label: '🥛 Dairy Fresh',   color: '#eab308', delay: 0.6, x: '78%', y: '18%', rotate: 6   },
  { label: '🌾 Organic Grains',color: '#f59e0b', delay: 1.2, x: '6%',  y: '68%', rotate: -5  },
  { label: '🍿 Snacks & More', color: '#f97316', delay: 1.8, x: '72%', y: '72%', rotate: 8   },
  { label: '🚚 Free Delivery', color: '#3b82f6', delay: 0.9, x: '42%', y: '8%',  rotate: -3  },
];

const sr = (seed: number) => { const x = Math.sin(seed + 1) * 10000; return x - Math.floor(x); };
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: sr(i * 5)     * 100,
  size: 2 + sr(i * 5 + 1) * 3,
  duration: 4 + sr(i * 5 + 2) * 6,
  delay: sr(i * 5 + 3)    * 5,
  opacity: 0.2 + sr(i * 5 + 4) * 0.4,
}));

const DEFAULT_STATS = [
  { icon: ShoppingBag, value: '5,000+', label: 'Products' },
  { icon: Users,       value: '100+',   label: 'Sellers' },
  { icon: MapPin,      value: 'KTM',    label: 'Kathmandu Valley' },
  { icon: Truck,       value: '10K+',   label: 'Orders Delivered' },
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

type SlideData = {
  _id: string; eyebrow?: string; title: string; subtitle?: string;
  description?: string; cta?: string; ctaLink?: string;
  accentColor?: string; badge?: string; image?: string;
  isActive?: boolean; order?: number;
};

export function HeroSection() {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [stats, setStats] = useState(DEFAULT_STATS);

  useEffect(() => {
    fetch('/api/v1/stats')
      .then(r => r.json())
      .then(({ data }) => {
        if (!data) return;
        setStats([
          { icon: ShoppingBag, value: data.products >= 1000 ? `${(data.products / 1000).toFixed(1).replace(/\.0$/, '')}K+` : `${data.products}+`, label: 'Products' },
          { icon: Users,       value: data.sellers >= 100   ? `${data.sellers}+`  : `${data.sellers}`,  label: 'Sellers' },
          { icon: MapPin,      value: 'KTM',                                                             label: 'Kathmandu Valley' },
          { icon: Truck,       value: data.orders  >= 1000  ? `${Math.floor(data.orders / 1000)}K+`  : `${data.orders}+`, label: 'Orders Delivered' },
        ]);
      })
      .catch(() => {});
  }, []);

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

  const slide = slides[current];
  const bg = BG_GRADIENTS[current % BG_GRADIENTS.length];

  if (!slide) {
    return (
      <section className="relative min-h-[90vh] overflow-hidden flex items-center"
        style={{ background: 'linear-gradient(160deg, #050810 0%, #0d1535 45%, #12102a 100%)' }}
      >
        {/* Animated gradient orbs */}
        <motion.div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
          animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: 'radial-gradient(circle, #f97316, transparent 70%)', filter: 'blur(80px)' }}
        />
        <motion.div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
          animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)', filter: 'blur(70px)' }}
        />
        <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full pointer-events-none"
          animate={{ scale: [1, 1.3, 1], opacity: [0.04, 0.1, 0.04] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          style={{ background: 'radial-gradient(circle, #22c55e, transparent 70%)', filter: 'blur(60px)' }}
        />

        {/* Particle field */}
        {PARTICLES.map(p => (
          <motion.div key={p.id} className="absolute rounded-full pointer-events-none"
            style={{ left: `${p.x}%`, bottom: 0, width: p.size, height: p.size, background: 'rgba(249,115,22,0.6)', opacity: p.opacity }}
            animate={{ y: [0, -300], opacity: [p.opacity, 0] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeOut' }}
            suppressHydrationWarning
          />
        ))}

        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />

        {/* Floating chips */}
        {FLOAT_CHIPS.map((chip, i) => (
          <motion.div key={i} className="absolute hidden lg:flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold text-white shadow-xl pointer-events-none"
            style={{
              left: chip.x, top: chip.y,
              background: `${chip.color}22`,
              border: `1px solid ${chip.color}55`,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: `0 8px 32px ${chip.color}33`,
              rotate: chip.rotate,
            }}
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.8 + chip.delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.span animate={{ y: [0, -3, 0] }} transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}>
              {chip.label}
            </motion.span>
          </motion.div>
        ))}

        {/* Center content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-6 text-sm font-semibold text-orange-300"
            style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)' }}
          >
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
              <Sparkles className="w-4 h-4" />
            </motion.div>
            Nepal's #1 Online Grocery Store
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="font-black text-white mb-6 leading-none"
            style={{ fontSize: 'clamp(3rem, 7vw, 6rem)' }}
          >
            Fresh Groceries
            <br />
            <span className="gradient-text">Delivered Fast</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="text-white/55 text-lg max-w-xl mx-auto mb-10"
          >
            Farm-fresh produce, daily essentials & local favourites — delivered to your door across Kathmandu Valley.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-4 mb-16"
          >
            <Link href="/products"
              className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-white shadow-2xl text-base transition-all hover:scale-105 hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
            >
              Shop Now <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/categories"
              className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-white text-base transition-all hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
            >
              Browse Categories
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-8"
          >
            {stats.map((s, i) => (
              <motion.div key={s.label} className="text-center"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
              >
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none">
          <svg viewBox="0 0 1440 56" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0 56L1440 56L1440 18C1200 56 960 0 720 20C480 40 240 0 0 18L0 56Z" className="fill-white dark:fill-background" />
          </svg>
        </div>
      </section>
    );
  }

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

      {/* Animated glowing orbs — wrapped to contain blur overflow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
      </div>

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
            {stats.map((s, i) => (
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
      <div className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none">
        <svg viewBox="0 0 1440 56" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0 56L1440 56L1440 18C1200 56 960 0 720 20C480 40 240 0 0 18L0 56Z" className="fill-white dark:fill-background" />
        </svg>
      </div>
    </section>
  );
}
