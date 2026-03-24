'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';
import { toast } from '@/hooks/use-toast';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await axios.post('/api/v1/auth/password/forgot', { email: data.email });
    } catch {
      // Intentionally swallow errors — never leak whether an email exists
    } finally {
      // Always show success to prevent email enumeration
      setSubmitted(true);
      toast({
        title: 'Reset link sent',
        description: 'If that email exists, a reset link is on its way.',
      });
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#060810' }}
    >
      {/* Aurora orbs */}
      <div
        className="fixed -top-40 -left-24 w-[560px] h-[560px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #f97316, #ef4444 50%, transparent)' }}
      />
      <div
        className="fixed bottom-0 right-0 w-[420px] h-[420px] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366f1, #8b5cf6 50%, transparent)' }}
      />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10 blur-2xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }}
      />

      {/* Grid overlay */}
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md p-8 rounded-3xl"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-xl transition-transform group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ef4444)',
                boxShadow: '0 0 20px rgba(249,115,22,0.4)',
              }}
            >
              <span className="text-white font-black text-xl">B</span>
            </div>
            <span className="text-white text-2xl font-black tracking-tight">Bazzar</span>
          </Link>
        </div>

        {!submitted ? (
          <>
            {/* Heading */}
            <div className="text-center mb-8">
              <h1
                className="text-3xl font-black mb-2"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #ef4444)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Reset your password
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                Enter your email and we&apos;ll send you a reset link
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" suppressHydrationWarning>
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full h-12 pl-10 pr-4 rounded-xl text-sm text-white placeholder:text-gray-600 outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: errors.email
                        ? '1px solid rgba(239,68,68,0.5)'
                        : '1px solid rgba(255,255,255,0.1)',
                      boxShadow: 'none',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.border = '1px solid rgba(249,115,22,0.5)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.border = errors.email
                        ? '1px solid rgba(239,68,68,0.5)'
                        : '1px solid rgba(255,255,255,0.1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] hover:shadow-xl disabled:opacity-60 disabled:scale-100"
                style={{
                  background: isSubmitting
                    ? 'rgba(249,115,22,0.6)'
                    : 'linear-gradient(135deg, #f97316, #ef4444)',
                  boxShadow: '0 4px 20px rgba(249,115,22,0.3)',
                }}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            {/* Back to login */}
            <div className="mt-6 text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1.5 text-sm transition-colors text-gray-500 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Success state */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-5">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
                >
                  <CheckCircle className="w-9 h-9 text-green-400" />
                </div>
              </div>
              <h1
                className="text-3xl font-black mb-2"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #ef4444)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Check your email!
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
                If an account exists for that address, we&apos;ve sent a password reset link. It may
                take a minute or two to arrive.
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/auth/login"
                className="w-full h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.01] hover:shadow-xl"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #ef4444)',
                  boxShadow: '0 4px 20px rgba(249,115,22,0.3)',
                }}
              >
                Back to Sign In
              </Link>

              <p className="text-center text-sm text-gray-600">
                Didn&apos;t receive it?{' '}
                <button
                  type="button"
                  className="font-semibold transition-colors hover:opacity-80"
                  style={{ color: '#f97316' }}
                  onClick={() => setSubmitted(false)}
                >
                  Try again
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
