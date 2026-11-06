'use client';

import { useEffect, useState } from 'react';
import { X, Feather, Check } from 'lucide-react';
import { signInWithGooglePopup } from '@/lib/api';

type Mode = 'login' | 'register';

export default function AuthModal({
  initialMode,
  onClose,
  onSuccess,
}: {
  initialMode: Mode;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleGoogleContinue = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGooglePopup();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Could not sign in with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="lp-overlay absolute inset-0 bg-neutral-950/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="lp-dialog relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white p-7 sm:p-8 text-neutral-900 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.16)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="lp-btn lp-btn-ghost absolute right-3.5 top-3.5 !h-8 !w-8 !p-0 text-neutral-500 hover:text-neutral-900"
        >
          <X size={16} />
        </button>

        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600">
            <Feather size={11} className="text-neutral-900" />
            <span>Notes by Winner</span>
          </div>
          <h2 id="auth-title" className="text-2xl font-semibold tracking-tight text-neutral-900">
            {initialMode === 'login' ? 'Welcome back' : 'Start writing'}
          </h2>
          <p className="mt-1.5 text-sm text-neutral-500 leading-relaxed">
            Continue with your Google account to access and sync your notes across Web and Android.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2.5 text-xs font-medium text-neutral-900"
          >
            {error}
          </p>
        )}

        {/* Continue with Google Button */}
        <button
          type="button"
          onClick={handleGoogleContinue}
          disabled={googleLoading}
          className="lp-btn lp-btn-ink w-full !h-11 font-medium justify-center"
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
          <span>{googleLoading ? 'Connecting to Google…' : 'Continue with Google'}</span>
        </button>

        <div className="mt-6 pt-5 border-t border-neutral-100 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-neutral-400">
          <span className="inline-flex items-center gap-1">
            <Check size={12} className="text-neutral-700" />
            One-click sign in
          </span>
          <span className="inline-flex items-center gap-1">
            <Check size={12} className="text-neutral-700" />
            No password to remember
          </span>
          <span className="inline-flex items-center gap-1">
            <Check size={12} className="text-neutral-700" />
            Instant cloud sync
          </span>
        </div>
      </div>
    </div>
  );
}
