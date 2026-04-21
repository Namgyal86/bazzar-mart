'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

function OAuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const oauthError = searchParams.get('oauth_error');

    // Middleware intercepts /auth/oauth/callback and sets HttpOnly cookies before
    // this page renders. If we reach here, something went wrong.
    if (oauthError) {
      toast({ title: 'Login failed', description: oauthError, variant: 'destructive' });
    } else {
      toast({ title: 'Login failed', description: 'OAuth sign-in could not be completed', variant: 'destructive' });
    }
    router.replace('/auth/login');
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#060810' }}>
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#060810' }}>
          <div className="text-center space-y-4">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
            <p className="text-gray-400 text-sm">Completing sign-in…</p>
          </div>
        </div>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}
