'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, Camera, Gift, Copy, CheckCircle, CalendarDays, ShieldCheck, Star } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/hooks/use-toast';
import { userApi } from '@/lib/api/user.api';
import { getErrorMessage } from '@/lib/api/client';

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await userApi.updateMe({ firstName: data.firstName, lastName: data.lastName, phone: data.phone });
      updateUser({ firstName: data.firstName, lastName: data.lastName });
      setApiError(null);
      toast({ title: 'Profile updated!', description: 'Your changes have been saved.' });
    } catch (err) {
      const msg = getErrorMessage(err);
      setApiError(msg);
      toast({ title: msg, variant: 'destructive' });
    }
  };

  const copyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const initial = user?.firstName?.[0]?.toUpperCase() ?? 'U';

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).getFullYear()
    : new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your personal information and account details
        </p>
      </div>

      {/* Personal Information card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">

        {/* Banner / header strip */}
        <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-orange-50 via-orange-50/60 to-transparent dark:from-orange-950/10 dark:via-orange-950/5 dark:to-transparent">
          {/* Decorative blobs */}
          <div
            className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20"
            style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
          />
          <div
            className="absolute top-4 left-1/4 w-24 h-24 rounded-full opacity-10"
            style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
          />
          <div
            className="absolute -bottom-6 right-1/3 w-20 h-20 rounded-full opacity-15"
            style={{ background: 'linear-gradient(135deg, #fb923c, #f43f5e)' }}
          />
          {/* Subtle dark overlay */}
          <div className="absolute inset-0 hidden dark:block bg-gradient-to-r from-gray-900/40 to-gray-900/20" />
        </div>

        <div className="px-6 pb-8">
          {/* Avatar row — overlaps the banner */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 mb-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="w-24 h-24 rounded-full p-[3px] shadow-xl"
                style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
              >
                <div
                  className="w-full h-full rounded-full flex items-center justify-center text-white text-3xl font-bold select-none"
                  style={{
                    background: 'linear-gradient(135deg, var(--ap), var(--as))',
                    boxShadow: '0 0 24px hsl(var(--ap-h) var(--ap-s) var(--ap-l) / 0.45)',
                  }}
                >
                  {initial}
                </div>
              </div>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full text-white shadow-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
                aria-label="Change avatar"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Name + meta */}
            <div className="pb-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-white text-xl leading-tight truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 truncate">{user?.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span
                  className="inline-block px-3 py-0.5 rounded-full text-xs font-semibold text-white capitalize"
                  style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
                >
                  {user?.role?.toLowerCase()} Account
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  <CalendarDays className="w-3 h-3" />
                  Member since {memberSince}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-gray-800 mb-6" />

          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <User className="w-4 h-4 text-orange-500" />
            Personal Information
          </h2>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  First Name
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    {...register('firstName')}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 rounded-xl text-sm text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-colors"
                    placeholder="First name"
                  />
                </div>
              </div>

              {/* Last Name */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Last Name
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    {...register('lastName')}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 rounded-xl text-sm text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-colors"
                    placeholder="Last name"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 rounded-xl text-sm text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Phone Number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="tel"
                  placeholder="98XXXXXXXX"
                  {...register('phone')}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 rounded-xl text-sm text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-colors"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-1">
              {apiError && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-1.5 mb-3">
                  <span>⚠</span> {apiError}
                </p>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Referral card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Referral card inner accent strip */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--ap), var(--as))' }} />

        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className="p-3 rounded-xl shrink-0 shadow-md"
              style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
            >
              <Gift className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Your Referral Code
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Earn{' '}
                <span className="font-semibold text-orange-600 dark:text-orange-400">Rs. 200</span>{' '}
                for every friend who joins and makes their first order!
              </p>

              <div className="flex items-center gap-3 mt-4 flex-wrap">
                {/* Referral code display */}
                <div
                  className="rounded-xl px-6 py-3 font-mono font-extrabold text-xl tracking-widest shadow-inner select-all border-2 border-dashed border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400"
                  style={{ letterSpacing: '0.15em' }}
                >
                  {user?.referralCode ?? '—'}
                </div>

                {/* Copy button */}
                <button
                  type="button"
                  onClick={copyReferralCode}
                  className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.04] active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                  style={{ background: 'linear-gradient(135deg, var(--ap), var(--as))' }}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Member Since */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="p-2.5 rounded-xl shrink-0 bg-orange-50 dark:bg-orange-950/20">
            <CalendarDays className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Member Since
            </p>
            <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
              {memberSince}
            </p>
          </div>
        </div>

        {/* Account Type */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="p-2.5 rounded-xl shrink-0 bg-orange-50 dark:bg-orange-950/20">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Account Type
            </p>
            <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5 capitalize">
              {user?.role?.toLowerCase() ?? 'Buyer'}
            </p>
          </div>
        </div>

        {/* Referral Status */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="p-2.5 rounded-xl shrink-0 bg-orange-50 dark:bg-orange-950/20">
            <Star className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Referral Status
            </p>
            <p className="text-base font-bold mt-0.5">
              {user?.referralCode ? (
                <span className="text-orange-500">Active</span>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">Inactive</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
