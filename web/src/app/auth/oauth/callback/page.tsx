'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/hooks/use-toast';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const accessToken  = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const oauthError   = searchParams.get('oauth_error');

    if (oauthError) {
      toast({ title: 'Login failed', description: oauthError, variant: 'destructive' });
      router.replace('/auth/login');
      return;
    }

    if (!accessToken || !refreshToken) {
      toast({ title: 'Login failed', description: 'Missing tokens from OAuth provider', variant: 'destructive' });
      router.replace('/auth/login');
      return;
    }

    // Decode the JWT payload (no verification needed — backend already verified)
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      setAuth(
        {
          id:           payload.userId,
          email:        payload.email,
          firstName:    payload.firstName ?? '',
          lastName:     payload.lastName  ?? '',
          role:         payload.role,
          referralCode: payload.referralCode,
          profilePhotoUrl: undefined,
          sellerId:     undefined,
        },
        accessToken,
        refreshToken,
      );
      toast({ title: 'Welcome!', description: 'You have been signed in successfully.' });
      router.replace('/');
    } catch {
      toast({ title: 'Login failed', description: 'Could not parse auth response', variant: 'destructive' });
      router.replace('/auth/login');
    }
  }, [searchParams, setAuth, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#060810' }}>
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}
