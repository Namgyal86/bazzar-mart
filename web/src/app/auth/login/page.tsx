'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, ShoppingBag, Star, Shield, Zap, ArrowRight, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/hooks/use-toast';
import { authApi, oauthUrls } from '@/lib/api/auth.api';
import { getErrorMessage } from '@/lib/api/client';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

const PERKS = [
  { icon: ShoppingBag, text: 'Shop from 10,000+ sellers', color: 'text-blue-400' },
  { icon: Shield, text: 'Secure payments & buyer protection', color: 'text-green-400' },
  { icon: Zap, text: 'Fast delivery across Nepal', color: 'text-yellow-400' },
  { icon: Star, text: 'Exclusive deals every day', color: 'text-pink-400' },
];

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoginError(null);
    try {
      const res = await authApi.login(data);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role as any,
          profilePhotoUrl: user.profilePhotoUrl,
          referralCode: user.referralCode,
          sellerId: user.sellerId,
        },
        accessToken,
        refreshToken,
      );
      toast({ title: 'Welcome back!', description: 'You have been logged in successfully.' });
      router.push('/');
    } catch (err) {
      const msg = getErrorMessage(err);
      setLoginError(msg);
      setShake(true);
      setTimeout(() => setShake(false), 600);
      toast({ title: 'Login failed', description: msg, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#060810' }}>

      {/* ── Left panel — brand ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #0d0f1e 0%, #111827 50%, #0d1f2d 100%)' }}>

        {/* Aurora orbs */}
        <div className="absolute -top-32 -left-16 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--ap), var(--as) 50%, transparent)' }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #6366f1, #8b5cf6 50%, transparent)' }} />
        <div className="absolute top-1/2 -translate-y-1/2 right-12 w-48 h-48 rounded-full opacity-10 blur-2xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-xl transition-transform group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))', boxShadow: '0 0 20px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.4)' }}
            >
              <span className="text-white font-black text-xl">B</span>
            </div>
            <span className="text-white text-2xl font-black tracking-tight">Bazzar</span>
          </Link>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-10">
          <div>
            <h2 className="text-5xl font-black text-white leading-[1.1] mb-4">
              Nepal&apos;s largest<br />
              <span style={{ background: 'linear-gradient(90deg, var(--ap), var(--as))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                online marketplace
              </span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              Millions of products. Thousands of sellers.<br />One platform.
            </p>
          </div>

          <div className="space-y-3">
            {PERKS.map(({ icon: Icon, text, color }, i) => (
              <div
                key={text}
                className="flex items-center gap-3 p-3 rounded-xl transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  animationDelay: `${i * 100}ms`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <span className="text-gray-300 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 flex items-center gap-8">
          {[['50K+', 'Products'], ['10K+', 'Sellers'], ['200K+', 'Buyers']].map(([num, label]) => (
            <div key={label} className="text-center">
              <p className="text-white text-2xl font-black">{num}</p>
              <p className="text-gray-500 text-xs mt-0.5 uppercase tracking-widest">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="w-full lg:w-1/2 flex flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #080c18 0%, #0d1117 100%)' }}>

        {/* Subtle glow */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--ap), transparent)' }} />

        {/* Mobile brand bar */}
        <div className="lg:hidden flex items-center gap-3 px-6 pt-6 relative z-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}>
            <span className="text-white font-bold">B</span>
          </div>
          <span className="text-white text-xl font-bold">Bazzar</span>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 sm:px-14 py-10 max-w-lg w-full mx-auto relative z-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-300 transition-colors mb-8 group w-fit">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to home
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-white">Welcome back</h1>
            <p className="text-gray-500 mt-2">Sign in to continue shopping</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className={`space-y-5 ${shake ? 'animate-shake' : ''}`} suppressHydrationWarning>
            <div>
              <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full h-12 pl-10 pr-4 rounded-xl text-sm text-white placeholder:text-gray-600 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: errors.email ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: 'none',
                  }}
                  onFocus={e => { e.currentTarget.style.border = '1px solid hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.1)'; }}
                  onBlur={e => { e.currentTarget.style.border = errors.email ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Password</label>
                <Link href="/auth/forgot-password" className="text-xs font-semibold transition-colors" style={{ color: 'var(--ap)' }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full h-12 pl-10 pr-12 rounded-xl text-sm text-white placeholder:text-gray-600 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: errors.password ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  }}
                  onFocus={e => { e.currentTarget.style.border = '1px solid hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.1)'; }}
                  onBlur={e => { e.currentTarget.style.border = errors.password ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            {/* Inline error message */}
            {loginError && (
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-red-500/60 bg-red-500/15 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-400">Login failed</p>
                  <p className="text-xs text-red-400/80 mt-0.5">{loginError}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] hover:shadow-xl disabled:opacity-60 disabled:scale-100"
              style={{
                background: isSubmitting ? 'hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.6)' : 'linear-gradient(135deg, var(--ap), var(--as))',
                boxShadow: '0 4px 20px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.3)',
              }}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-gray-600 uppercase tracking-wider font-medium" style={{ background: '#0d1117' }}>
                or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Google', href: oauthUrls.google, svg: <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> },
              { label: 'Facebook', href: oauthUrls.facebook, svg: <svg className="w-4 h-4" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
            ].map(({ label, href, svg }) => (
              <button
                key={label}
                type="button"
                onClick={() => { window.location.href = href; }}
                className="flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold text-gray-300 transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {svg}
                {label}
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-gray-600 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="font-bold transition-colors hover:opacity-80" style={{ color: 'var(--ap)' }}>
              Create one free
            </Link>
          </p>

          <p className="text-center text-xs text-gray-700 mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            Want to sell on Bazzar?{' '}
            <Link href="/sellers/register" className="font-medium transition-colors hover:opacity-80" style={{ color: 'var(--ap)' }}>
              Register as Seller →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
