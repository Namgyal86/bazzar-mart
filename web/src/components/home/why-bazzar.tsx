'use client';

import { Truck, Shield, RefreshCw, Headphones, Tag, CheckCircle, Package, Users, TrendingUp, MapPin } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useSiteSettingsStore } from '@/store/site-settings.store';

const FEATURES = [
  { icon: Truck,       title: 'Same Day Delivery', desc: 'In Kathmandu Valley',          color: '#3b82f6', glow: 'rgba(59,130,246,0.5)'  },
  { icon: Shield,      title: 'Secure Payments',   desc: 'Khalti, eSewa & cards',        color: '#22c55e', glow: 'rgba(34,197,94,0.5)'   },
  { icon: RefreshCw,   title: 'Easy Returns',      desc: 'Hassle-free return policy',    color: '#f97316', glow: 'rgba(249,115,22,0.5)'  },
  { icon: Headphones,  title: '24/7 Support',      desc: 'Always here for you',          color: '#a855f7', glow: 'rgba(168,85,247,0.5)'  },
  { icon: Tag,         title: 'Best Prices',       desc: 'Freshest produce, best value', color: '#ec4899', glow: 'rgba(236,72,153,0.5)'  },
  { icon: CheckCircle, title: 'Farm Fresh',        desc: 'Directly from local farms',    color: '#06b6d4', glow: 'rgba(6,182,212,0.5)'   },
];

const DEFAULT_STATS = [
  { icon: Package,    value: 5000,  display: '5,000+',           label: 'Products',          color: '#f97316' },
  { icon: Users,      value: 100,   display: '100+',             label: 'Verified Sellers',  color: '#22c55e' },
  { icon: TrendingUp, value: 10000, display: '10,000+',          label: 'Happy Customers',   color: '#3b82f6' },
  { icon: MapPin,     value: 0,     display: 'Kathmandu Valley', label: 'Delivery Coverage', color: '#a855f7' },
];

function AnimatedNumber({ value, display }: { value: number; display: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 1800;
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [started, value]);

  if (!started) return <span ref={ref}>0</span>;
  const suffix = display.replace(/[\d,]/g, '');
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function FeatureCard({ f, index }: { f: typeof FEATURES[0]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [shine, setShine] = useState({ x: 50, y: 50 });

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 400, damping: 35 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 400, damping: 35 });

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
      style={{ perspective: '800px' }}
      variants={{
        hidden: { opacity: 0, y: 24, scale: 0.96 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as any } },
      }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onMouseEnter={() => setHovered(true)}
    >
      <motion.div
        className="relative group flex items-start gap-4 p-5 rounded-2xl overflow-hidden"
        style={{
          rotateX, rotateY,
          transformStyle: 'preserve-3d',
          background: hovered
            ? 'rgba(255,255,255,0.09)'
            : 'rgba(255,255,255,0.04)',
          border: `1px solid ${hovered ? f.color + '44' : 'rgba(255,255,255,0.1)'}`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: hovered
            ? `0 20px 60px ${f.color}22, 0 0 0 1px ${f.color}33, inset 0 1px 0 rgba(255,255,255,0.08)`
            : `0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)`,
          transition: 'background 0.3s, border-color 0.3s, box-shadow 0.4s',
        }}
      >
        {/* Mouse shine */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.3s',
            background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.1) 0%, transparent 60%)`,
          }}
        />

        {/* Icon with float + glow */}
        <motion.div
          className="relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
          style={{ background: `${f.color}22`, border: `1px solid ${f.color}44` }}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.5 + index * 0.3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.25 }}
          whileHover={{ scale: 1.15 }}
        >
          {/* Icon glow behind */}
          <div
            className="absolute inset-0 rounded-2xl blur-md"
            style={{
              background: f.color,
              opacity: hovered ? 0.4 : 0.15,
              transition: 'opacity 0.3s',
            }}
          />
          <f.icon className="w-5 h-5 relative z-10" style={{ color: f.color }} />
        </motion.div>

        <div className="relative z-10">
          <p className="font-bold text-white">{f.title}</p>
          <p className="text-sm text-white/55 mt-0.5">{f.desc}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function WhyBazzar() {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const { settings } = useSiteSettingsStore();
  const siteName = settings.siteName || 'Bazzar';

  useEffect(() => {
    fetch('/api/v1/stats')
      .then(r => r.json())
      .then(({ data }) => {
        if (!data) return;
        setStats([
          { icon: Package,    value: data.products, display: data.products >= 1000 ? `${Math.floor(data.products / 1000)}K+` : `${data.products}+`, label: 'Products',          color: '#f97316' },
          { icon: Users,      value: data.sellers,  display: `${data.sellers}+`,                                                                    label: 'Verified Sellers',  color: '#22c55e' },
          { icon: TrendingUp, value: data.users,    display: data.users >= 1000 ? `${Math.floor(data.users / 1000)}K+` : `${data.users}+`,          label: 'Happy Customers',   color: '#3b82f6' },
          { icon: MapPin,     value: 0,             display: 'Kathmandu Valley',                                                                    label: 'Delivery Coverage', color: '#a855f7' },
        ]);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="relative py-20 overflow-hidden" style={{ background: 'linear-gradient(160deg, #0a0f1e 0%, #0d1535 40%, #0e1628 100%)' }}>
      {/* Animated background orbs */}
      <motion.div
        className="absolute top-1/4 left-1/6 w-96 h-96 rounded-full pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.06, 0.12, 0.06] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: 'radial-gradient(circle, #f97316, transparent 70%)', filter: 'blur(60px)' }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/6 w-80 h-80 rounded-full pointer-events-none"
        animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.1, 0.05] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)', filter: 'blur(50px)' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        style={{ background: 'conic-gradient(from 0deg, transparent 70%, rgba(249,115,22,0.03) 85%, transparent 100%)', filter: 'blur(2px)' }}
      />

      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-sm font-semibold"
            style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', color: '#fb923c' }}
            animate={{ boxShadow: ['0 0 0px rgba(249,115,22,0)', '0 0 20px rgba(249,115,22,0.2)', '0 0 0px rgba(249,115,22,0)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity }}>⭐</motion.span>
            Why Choose Us
          </motion.div>
          <h2 className="text-3xl lg:text-4xl font-black text-white">
            Why Shop on <span className="gradient-text">{siteName}?</span>
          </h2>
          <p className="text-white/50 mt-3 max-w-lg mx-auto">
            Nepal's most trusted online grocery & mart store — farm-fresh produce, daily essentials, and fast delivery.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-16"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {FEATURES.map((f, i) => <FeatureCard key={f.title} f={f} index={i} />)}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl p-8 md:p-10 overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {/* Gradient top border */}
          <div className="absolute top-0 left-8 right-8 h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.6), transparent)' }} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="text-center group"
              >
                <motion.div
                  className="relative w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${s.color}18`, border: `1px solid ${s.color}33` }}
                  whileHover={{ scale: 1.12 }}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
                >
                  <div className="absolute inset-0 rounded-2xl blur-sm" style={{ background: s.color, opacity: 0.2 }} />
                  <s.icon className="w-6 h-6 relative z-10" style={{ color: s.color }} />
                </motion.div>
                <p className="text-4xl font-black text-white">
                  {s.value === 0 ? s.display : <AnimatedNumber value={s.value} display={s.display} />}
                </p>
                <p className="text-white/50 text-sm mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
