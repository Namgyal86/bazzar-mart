'use client';

import { Truck, Shield, RefreshCw, Headphones, Tag, CheckCircle, Package, Users, TrendingUp, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const FEATURES = [
  { icon: Truck,       title: 'Same Day Delivery', desc: 'In Kathmandu Valley',            grad: 'from-blue-500 to-cyan-500' },
  { icon: Shield,      title: 'Secure Payments',   desc: 'Khalti, eSewa & cards',          grad: 'from-green-500 to-emerald-500' },
  { icon: RefreshCw,   title: 'Easy Returns',      desc: 'Hassle-free return policy',      grad: 'from-orange-500 to-amber-500' },
  { icon: Headphones,  title: '24/7 Support',      desc: 'Always here for you',            grad: 'from-purple-500 to-violet-500' },
  { icon: Tag,         title: 'Best Prices',       desc: 'Freshest produce, best value',   grad: 'from-pink-500 to-rose-500' },
  { icon: CheckCircle, title: 'Farm Fresh',        desc: 'Directly from local farms',      grad: 'from-teal-500 to-cyan-500' },
];

const STATS = [
  { icon: Package,     value: 5000,  display: '5,000+',  label: 'Products' },
  { icon: Users,       value: 100,   display: '100+',    label: 'Verified Sellers' },
  { icon: TrendingUp,  value: 10000, display: '10,000+', label: 'Happy Customers' },
  { icon: MapPin,      value: 77,    display: '77',      label: 'Districts Covered' },
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

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const featureVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export function WhyBazzar() {
  return (
    <section className="py-20 bg-white dark:bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-orange-600 dark:text-orange-400 font-semibold text-sm uppercase tracking-widest mb-3">Why Choose Us</p>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white">
            Why Shop on <span className="gradient-text">Bazzar?</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Nepal's most trusted online grocery & mart store — farm-fresh produce, daily essentials, and fast delivery.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-16"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={featureVariants}
              whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}
              className="group flex items-start gap-4 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 transition-colors hover:border-orange-100 dark:hover:border-orange-900 cursor-default"
            >
              <motion.div
                whileHover={{ scale: 1.12, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.grad} flex items-center justify-center shrink-0 shadow-md`}
              >
                <f.icon className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{f.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="rounded-3xl p-10"
          style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="text-center"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3"
                >
                  <s.icon className="w-6 h-6 text-white" />
                </motion.div>
                <p className="text-4xl font-black text-white">
                  <AnimatedNumber value={s.value} display={s.display} />
                </p>
                <p className="text-white/75 text-sm mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
