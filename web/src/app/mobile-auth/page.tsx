'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Feather, Check, ArrowRight, Smartphone } from 'lucide-react';
import { signInWithGooglePopup } from '@/lib/api';

function MobileAuthContent() {
  const searchParams = useSearchParams();
  const redirectUri = searchParams.get('redirect_uri') || 'notesbywinner://auth';

  const [status, setStatus] = useState<'idle' | 'loading' | 'redirecting' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [deepLinkUrl, setDeepLinkUrl] = useState('');

  const handleGoogleSignIn = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const authData = await signInWithGooglePopup();
      const target = new URL(redirectUri);
      target.searchParams.set('token', authData.access_token);
      target.searchParams.set('user', JSON.stringify(authData.user));
      const finalUrl = target.toString();
      setDeepLinkUrl(finalUrl);
      setStatus('redirecting');
      window.location.href = finalUrl;
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Google sign-in was cancelled or failed. Please try again.');
    }
  };

  useEffect(() => {
    // Automatically prompt if Google script is already loaded
    const timer = setTimeout(() => {
      if ((window as any).google?.accounts?.oauth2 && status === 'idle') {
        handleGoogleSignIn();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="lp-light min-h-dvh bg-white text-neutral-900 font-inter flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-7 text-center shadow-[0_20px_50px_-20px_rgba(0,0,0,0.08)]">
        <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900">
          <Feather size={18} strokeWidth={2.2} />
        </div>

        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
          <Smartphone size={11} />
          <span>Notes by Winner · Android App</span>
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
          {status === 'redirecting' ? 'Signed in!' : 'Sign in to Android App'}
        </h1>

        <p className="mt-2 text-xs leading-relaxed text-neutral-500">
          {status === 'redirecting'
            ? 'Returning you to the Notes by Winner Android app…'
            : 'Authenticate with your Google account to sync your notes with the Android app.'}
        </p>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2.5 text-xs font-medium text-neutral-900">
            {errorMsg}
          </div>
        )}

        <div className="mt-6">
          {status === 'redirecting' && deepLinkUrl ? (
            <a
              href={deepLinkUrl}
              className="lp-btn lp-btn-ink w-full !h-11 justify-center"
            >
              <span>Return to Notes App</span>
              <ArrowRight size={15} />
            </a>
          ) : (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={status === 'loading'}
              className="lp-btn lp-btn-ink w-full !h-11 justify-center"
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#ffffff"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#d4d4d4"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#a3a3a3"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#e5e5e5"
                />
              </svg>
              <span>
                {status === 'loading' ? 'Connecting to Google…' : 'Continue with Google'}
              </span>
            </button>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-center gap-4 text-[11px] text-neutral-400">
          <span className="inline-flex items-center gap-1">
            <Check size={12} className="text-neutral-700" />
            Secure OAuth
          </span>
          <span className="inline-flex items-center gap-1">
            <Check size={12} className="text-neutral-700" />
            Instant Sync
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MobileAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-white flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      }
    >
      <MobileAuthContent />
    </Suspense>
  );
}
