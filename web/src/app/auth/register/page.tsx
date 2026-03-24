'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User, Phone, Gift, ArrowLeft, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/hooks/use-toast';
import { authApi } from '@/lib/api/auth.api';
import { getErrorMessage } from '@/lib/api/client';

const schema = z.object({
  firstName: z.string().min(2, 'At least 2 characters'),
  lastName: z.string().min(2, 'At least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^9[6-9]\d{8}$/, 'Enter a valid Nepal phone number'),
  password: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
  referralCode: z.string().optional(),
  terms: z.boolean().refine((v) => v, 'You must accept the terms'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

const BENEFITS = [
  'Free buyer protection on all orders',
  'Exclusive deals and referral bonuses',
  'Fast delivery across all of Nepal',
  'Easy returns & 24/7 support',
];

const inputStyle = (hasError: boolean) => ({
  background: 'rgba(255,255,255,0.05)',
  border: hasError ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
});

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        referralCode: data.referralCode,
      });
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role as any,
          referralCode: user.referralCode,
        },
        accessToken,
        refreshToken,
      );
      toast({ title: 'Account created!', description: 'Welcome to Bazzar!' });
      router.push('/');
    } catch (err) {
      toast({ title: 'Registration failed', description: getErrorMessage(err), variant: 'destructive' });
    }
  };

  const fieldCls = "w-full h-11 px-3 rounded-xl text-sm text-white placeholder:text-gray-600 outline-none transition-all";
  const fieldFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid rgba(249,115,22,0.5)';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)';
  };
  const fieldBlur = (e: React.FocusEvent<HTMLInputElement>, hasError: boolean) => {
    e.currentTarget.style.border = hasError ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#060810' }}>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(145deg, #0d0f1e, #111827, #0d1f2d)' }}>

        {/* Aurora orbs */}
        <div className="absolute -top-24 -left-16 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #f97316, #ef4444, transparent)' }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-xl transition-transform group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', boxShadow: '0 0 20px rgba(249,115,22,0.4)' }}>
              <span className="text-white font-black text-xl">B</span>
            </div>
            <span className="text-white text-2xl font-black tracking-tight">Bazzar</span>
          </Link>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5"
              style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}>
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-orange-300 text-xs font-semibold">Get Rs. 200 on your first order</span>
            </div>
            <h2 className="text-4xl font-black text-white leading-[1.1] mb-3">
              Join 200,000+<br />
              <span style={{ background: 'linear-gradient(90deg, #f97316, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                happy shoppers
              </span>
            </h2>
            <p className="text-gray-400 text-base leading-relaxed">
              Create your free account and start exploring Nepal&apos;s biggest marketplace.
            </p>
          </div>

          <div className="space-y-3">
            {BENEFITS.map((b) => (
              <div key={b} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)' }}>
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                </div>
                <span className="text-gray-300 text-sm">{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Social proof */}
        <div className="relative z-10">
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex -space-x-2">
                {['S', 'R', 'A', 'P'].map((l) => (
                  <div key={l} className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', borderColor: '#0d1117' }}>
                    {l}
                  </div>
                ))}
              </div>
              <span className="text-gray-400 text-xs">+12,400 joined this month</span>
            </div>
            <p className="text-gray-500 text-xs">&ldquo;Best shopping experience in Nepal. Fast delivery and great prices!&rdquo; — Sita R.</p>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="w-full lg:w-7/12 flex flex-col relative overflow-hidden overflow-y-auto"
        style={{ background: 'linear-gradient(145deg, #080c18 0%, #0d1117 100%)' }}>

        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #f97316, transparent)' }} />

        {/* Mobile brand bar */}
        <div className="lg:hidden flex items-center gap-3 px-6 pt-6 relative z-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}>
            <span className="text-white font-bold">B</span>
          </div>
          <span className="text-white text-xl font-bold">Bazzar</span>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 sm:px-14 py-10 max-w-2xl w-full mx-auto relative z-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-300 transition-colors mb-8 group w-fit">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to home
          </Link>

          <div className="mb-6">
            <h1 className="text-3xl font-black text-white">Create your account</h1>
            <p className="text-gray-500 mt-2">It&apos;s free and takes less than 2 minutes</p>
          </div>

          {/* Bonus banner */}
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-6"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(34,197,94,0.15)' }}>
              <Gift className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-green-400">Referral Bonus</p>
              <p className="text-xs text-green-600">Get Rs. 200 credit when you complete your first order!</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                  <input placeholder="John" className={`${fieldCls} pl-9`} style={inputStyle(!!errors.firstName)}
                    onFocus={fieldFocus} onBlur={e => fieldBlur(e, !!errors.firstName)} {...register('firstName')} />
                </div>
                {errors.firstName && <p className="text-xs text-red-400 mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Last Name</label>
                <input placeholder="Doe" className={`${fieldCls} px-3`} style={inputStyle(!!errors.lastName)}
                  onFocus={fieldFocus} onBlur={e => fieldBlur(e, !!errors.lastName)} {...register('lastName')} />
                {errors.lastName && <p className="text-xs text-red-400 mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Email + Phone row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                  <input type="email" placeholder="you@example.com" className={`${fieldCls} pl-9`} style={inputStyle(!!errors.email)}
                    onFocus={fieldFocus} onBlur={e => fieldBlur(e, !!errors.email)} {...register('email')} />
                </div>
                {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                  <input type="tel" placeholder="98XXXXXXXX" className={`${fieldCls} pl-9`} style={inputStyle(!!errors.phone)}
                    onFocus={fieldFocus} onBlur={e => fieldBlur(e, !!errors.phone)} {...register('phone')} />
                </div>
                {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone.message}</p>}
              </div>
            </div>

            {/* Password row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                  <input type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters"
                    className={`${fieldCls} pl-9 pr-10`} style={inputStyle(!!errors.password)}
                    onFocus={fieldFocus} onBlur={e => fieldBlur(e, !!errors.password)} {...register('password')} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                  <input type="password" placeholder="Re-enter password" className={`${fieldCls} pl-9`} style={inputStyle(!!errors.confirmPassword)}
                    onFocus={fieldFocus} onBlur={e => fieldBlur(e, !!errors.confirmPassword)} {...register('confirmPassword')} />
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            {/* Referral code */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">
                Referral Code <span className="text-gray-700 font-normal normal-case">(optional)</span>
              </label>
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                <input placeholder="e.g. FRIEND2024XK" className={`${fieldCls} pl-9`}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onFocus={fieldFocus} onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                  {...register('referralCode')} />
              </div>
            </div>

            {/* Terms */}
            <div className="pt-1">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 shrink-0">
                  <input type="checkbox" id="terms" className="peer sr-only" {...register('terms')} />
                  <div className="w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center peer-checked:border-orange-500"
                    style={{ borderColor: errors.terms ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)' }}>
                    <CheckCircle2 className="w-3 h-3 text-orange-400 opacity-0 peer-checked:opacity-100" />
                  </div>
                </div>
                <span className="text-sm text-gray-500 leading-relaxed">
                  I agree to Bazzar&apos;s{' '}
                  <Link href="/terms" className="font-medium hover:opacity-80 transition-opacity" style={{ color: '#f97316' }}>Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="font-medium hover:opacity-80 transition-opacity" style={{ color: '#f97316' }}>Privacy Policy</Link>
                </span>
              </label>
              {errors.terms && <p className="text-xs text-red-400 mt-1.5 ml-8">{errors.terms.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] hover:shadow-xl disabled:opacity-60 disabled:scale-100 mt-2"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ef4444)',
                boxShadow: '0 4px 20px rgba(249,115,22,0.3)',
              }}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-bold transition-colors hover:opacity-80" style={{ color: '#f97316' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
