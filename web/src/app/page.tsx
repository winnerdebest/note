'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Feather,
  WifiOff,
  RefreshCw,
  Hash,
  Laptop,
  Smartphone,
  Cloud,
  Check,
  Search,
  Download,
  Plus,
  Pin,
} from 'lucide-react';
import { getToken, getMe, signInWithGooglePopup } from '@/lib/api';
import AppPreview from '@/components/landing/AppPreview';
import AuthModal from '@/components/landing/AuthModal';
import DownloadApkModal from '@/components/landing/DownloadApkModal';
import Reveal from '@/components/landing/Reveal';

const SHORTCUTS = [
  {
    id: 'new',
    keys: ['Ctrl', 'N'],
    label: 'New note',
    detail: 'Opens a blank canvas immediately with zero loading delay.',
  },
  {
    id: 'search',
    keys: ['Ctrl', 'K'],
    label: 'Instant search',
    detail: 'Jump to any note by title, body text, or #tag in milliseconds.',
  },
  {
    id: 'preview',
    keys: ['Ctrl', 'P'],
    label: 'Reader mode',
    detail: 'Toggle between raw Markdown syntax and clean editorial typography.',
  },
  {
    id: 'trash',
    keys: ['Ctrl', 'D'],
    label: 'Move to trash',
    detail: 'Archive or remove notes safely with one-click restore whenever you need.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [activeShortcut, setActiveShortcut] = useState<string>('new');
  const [quickGoogleLoading, setQuickGoogleLoading] = useState(false);
  const [mobileAuthRedirectUrl, setMobileAuthRedirectUrl] = useState<string | null>(null);
  const [apkModalOpen, setApkModalOpen] = useState(false);

  useEffect(() => {
    const winRedirect = (window as any).__MOBILE_AUTH_REDIRECT__;
    if (winRedirect) {
      setMobileAuthRedirectUrl(winRedirect);
      window.location.replace(winRedirect);
      return;
    }
    if (window.location.hash && window.location.hash.includes('access_token=')) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const gToken = params.get('access_token');
      const state = params.get('state');
      if (gToken && state && (state.startsWith('exp://') || state.startsWith('notesbywinner://'))) {
        const sep = state.includes('?') ? '&' : '?';
        const target = `${state}${sep}google_access_token=${encodeURIComponent(gToken)}`;
        setMobileAuthRedirectUrl(target);
        window.location.replace(target);
        return;
      }
    }

    if (getToken()) {
      getMe()
        .then(() => setIsAuthed(true))
        .catch(() => setIsAuthed(false));
    }
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openAuth = (mode: 'login' | 'register') => {
    if (isAuthed) router.push('/notes');
    else setAuthMode(mode);
  };

  const handleQuickGoogle = async () => {
    if (isAuthed) {
      router.push('/notes');
      return;
    }
    setQuickGoogleLoading(true);
    try {
      await signInWithGooglePopup();
      setIsAuthed(true);
      router.push('/notes');
    } catch {
      setAuthMode('login');
    } finally {
      setQuickGoogleLoading(false);
    }
  };

  const closeAuth = useCallback(() => setAuthMode(null), []);

  const selectedShortcut =
    SHORTCUTS.find((s) => s.id === activeShortcut) || SHORTCUTS[0];

  if (mobileAuthRedirectUrl) {
    return (
      <div className="lp-light min-h-dvh bg-white text-neutral-900 font-inter flex items-center justify-center p-6">
        <div className="w-full max-w-xs rounded-2xl border border-neutral-200 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-xl bg-neutral-900 text-white">
            <Feather size={18} strokeWidth={2.2} />
          </div>
          <h1 className="text-base font-semibold tracking-tight text-neutral-900">
            Returning to Notes by Winner…
          </h1>
          <p className="mt-1.5 text-xs text-neutral-500">
            Your Google account is connected.
          </p>
          <a
            href={mobileAuthRedirectUrl}
            className="lp-btn lp-btn-ink mt-5 w-full !h-10 justify-center text-xs"
          >
            <span>Open Notes App</span>
            <ArrowRight size={14} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="lp-light min-h-screen bg-white text-neutral-900 font-inter antialiased selection:bg-neutral-900 selection:text-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-neutral-900 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      {/* Sticky Header */}
      <header
        className={`sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b transition-[border-color] duration-200 ${
          scrolled ? 'border-neutral-200/80' : 'border-transparent'
        }`}
      >
        <nav className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a
            href="/"
            translate="no"
            className="flex items-center gap-2 sm:gap-2.5 text-sm sm:text-[15px] font-semibold tracking-tight text-neutral-900"
          >
            <span className="flex size-7 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 shadow-2xs">
              <Feather size={14} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span>
              Notes <span className="font-normal text-neutral-400">by Winner</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-7 text-xs font-medium text-neutral-500">
            <a href="#preview" className="hover:text-neutral-900 transition-colors">
              Workspace
            </a>
            <a href="#features" className="hover:text-neutral-900 transition-colors">
              Features
            </a>
            <a href="#mobile-app" className="hover:text-neutral-900 transition-colors">
              Mobile App
            </a>
            <a href="#shortcuts" className="hover:text-neutral-900 transition-colors">
              Shortcuts
            </a>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {isAuthed ? (
              <button
                type="button"
                onClick={() => router.push('/notes')}
                className="lp-btn lp-btn-ink lp-btn-sm"
              >
                <span>Open Notes</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuth('login')}
                  className="lp-btn lp-btn-ghost lp-btn-sm !px-2.5 sm:!px-3 text-neutral-600 hover:text-neutral-900"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => openAuth('register')}
                  className="lp-btn lp-btn-ink lp-btn-sm"
                >
                  <span>Start Writing</span>
                  <ArrowRight size={13} className="hidden sm:inline" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </nav>
      </header>

      <main id="main">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-neutral-200/70">
          {/* Subtle paper grid background */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_20%,#000_60%,transparent_100%)]"
          />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-14 sm:pt-24 sm:pb-20 text-center">
            {/* Editorial Headline */}
            <h1
              className="lp-rise mx-auto max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-neutral-900 text-balance sm:text-6xl md:text-7xl"
              style={{ ['--i' as string]: 0 }}
            >
              Write it down.
              <br />
              <span className="font-playfair italic font-normal text-neutral-500">
                It&rsquo;s already synced.
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="lp-rise mx-auto mt-5 sm:mt-6 max-w-xl text-sm sm:text-lg leading-relaxed text-neutral-500 text-pretty"
              style={{ ['--i' as string]: 2 }}
            >
              A quiet, distraction-free space for your thoughts. Capture ideas on your phone offline, expand them on your computer, and keep everything effortlessly organized.
            </p>

            {/* Primary & Mobile App CTA Row */}
            <div
              className="lp-rise mt-8 sm:mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 max-w-xs sm:max-w-none mx-auto"
              style={{ ['--i' as string]: 3 }}
            >
              <button
                type="button"
                onClick={handleQuickGoogle}
                disabled={quickGoogleLoading}
                className="lp-btn lp-btn-ink !h-11 !px-6 w-full sm:w-auto justify-center"
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
                  {isAuthed
                    ? 'Open Your Workspace'
                    : quickGoogleLoading
                    ? 'Signing in…'
                    : 'Continue with Google'}
                </span>
              </button>

              <a
                href="#mobile-app"
                className="lp-btn lp-btn-outline !h-11 !px-5 bg-white w-full sm:w-auto justify-center"
              >
                <Smartphone size={15} aria-hidden="true" />
                <span>Android APK · iOS Soon</span>
              </a>
            </div>

            {/* Subtle Trust Strip */}
            <div
              className="lp-rise mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-neutral-400"
              style={{ ['--i' as string]: 4 }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} className="text-neutral-700" />
                Free for personal use
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} className="text-neutral-700" />
                Works 100% offline
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} className="text-neutral-700" />
                Web &amp; Android (iOS coming soon)
              </span>
            </div>

            {/* Interactive Product Preview */}
            <div
              id="preview"
              className="lp-rise mt-14 sm:mt-16 scroll-mt-24"
              style={{ ['--i' as string]: 5 }}
            >
              <AppPreview />
            </div>
          </div>
        </section>

        {/* Bento Grid Features Section */}
        <section id="features" className="scroll-mt-20 border-b border-neutral-200/70 bg-neutral-50/40">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <Reveal>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 mb-3">
                    01 / Thoughtfully Designed
                  </p>
                  <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl text-balance">
                    Calm like a physical notebook. Always within reach.
                  </h2>
                </div>
                <p className="max-w-sm text-sm leading-relaxed text-neutral-500">
                  Every visual element is stripped back to pure paper and ink so your attention stays where it belongs: on the next sentence.
                </p>
              </div>
            </Reveal>

            {/* Bento Cards */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {/* Card 1: 2 Columns - Offline & Instant */}
              <Reveal className="md:col-span-2 rounded-2xl border border-neutral-200/90 bg-white p-7 sm:p-8 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono text-[11px] font-medium text-neutral-700">
                      <WifiOff size={12} />
                      01 · Always Available Offline
                    </span>
                    <span className="font-mono text-xs text-neutral-400">Instant save</span>
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight text-neutral-900">
                    Never wait for a loading spinner again.
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-500">
                    Whether you&rsquo;re on a flight, commuting underground, or working from a café with spotty Wi-Fi, your notes open and save immediately.
                  </p>
                </div>

                {/* Visual Speed Comparison */}
                <div className="mt-8 rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-4 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-900">Notes by Winner (Instant Response)</span>
                      <span className="font-mono text-[11px] text-neutral-900 font-semibold">Immediate</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-neutral-200/80 overflow-hidden">
                      <div className="h-full w-[5%] min-w-[12px] rounded-full bg-neutral-900" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Traditional Cloud Docs (Waiting for network)</span>
                      <span className="font-mono text-[11px] text-neutral-400">Slow spinners</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-neutral-200/80 overflow-hidden">
                      <div className="h-full w-[78%] rounded-full bg-neutral-400/60" />
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* Card 2: Markdown & Typography */}
              <Reveal delay={60} className="rounded-2xl border border-neutral-200/90 bg-white p-7 sm:p-8 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono text-[11px] font-medium text-neutral-700">
                      <Feather size={12} />
                      02 · Clean Formatting
                    </span>
                    <span className="font-mono text-xs text-neutral-400">Markdown</span>
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight text-neutral-900">
                    Effortless formatting.
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                    Write naturally with headings, checklists, quotes, and bold text, then switch to an editorial reader view in one click.
                  </p>
                </div>

                <div className="mt-8 rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-4 font-mono text-xs space-y-2 text-neutral-700">
                  <div className="flex items-center justify-between border-b border-neutral-200/70 pb-2">
                    <span className="text-neutral-400"># Title</span>
                    <span className="font-inter font-bold text-neutral-900">Title</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-200/70 pb-2">
                    <span className="text-neutral-400">**Highlight**</span>
                    <span className="font-inter font-semibold text-neutral-900">Highlight</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">- [x] Done</span>
                    <span className="font-inter line-through text-neutral-400">✓ Done</span>
                  </div>
                </div>
              </Reveal>

              {/* Card 3: Instant Tag & Search */}
              <Reveal delay={90} className="rounded-2xl border border-neutral-200/90 bg-white p-7 sm:p-8 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono text-[11px] font-medium text-neutral-700">
                      <Hash size={12} />
                      03 · Organization
                    </span>
                    <span className="font-mono text-xs text-neutral-400">⌘K</span>
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight text-neutral-900">
                    Tags without messy folders.
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                    Keep your thoughts tidy with flexible #tags, pinned favorites, and instant search across every word you&rsquo;ve written.
                  </p>
                </div>

                <div className="mt-8 rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-800">
                    <Search size={12} className="text-neutral-400" />
                    <span className="font-mono text-[11px]">#journal</span>
                    <span className="ml-auto font-mono text-[10px] text-neutral-400">12 notes</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {['#journal', '#essays', '#ideas', '#books', '#daily'].map((tag, idx) => (
                      <span
                        key={tag}
                        className={`rounded-md px-2 py-0.5 font-mono text-[10px] ${
                          idx === 0
                            ? 'bg-neutral-900 text-white'
                            : 'border border-neutral-200 bg-white text-neutral-500'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>

              {/* Card 4: 2 Columns - Cross-Device Continuity */}
              <Reveal
                delay={120}
                className="md:col-span-2 rounded-2xl border border-neutral-200/90 bg-white p-7 sm:p-8 flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono text-[11px] font-medium text-neutral-700">
                      <RefreshCw size={12} />
                      04 · Seamless Continuity
                    </span>
                    <span className="font-mono text-xs text-neutral-400">Every device</span>
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight text-neutral-900">
                    Start on your phone. Finish at your desk.
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-500">
                    Your workspace stays in harmony across devices. Capture a quick idea while walking and find it waiting on your computer the moment you sit down.
                  </p>
                </div>

                {/* Continuity Visual */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-4">
                  <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-900">
                      <Laptop size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-neutral-900">Web Studio</div>
                      <div className="text-[11px] text-neutral-400 truncate">Full-screen writing</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border border-neutral-900 bg-neutral-900 text-white p-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
                      <Cloud size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold">Instant Cloud Sync</div>
                      <div className="text-[11px] text-neutral-300 truncate">Automatic &amp; private</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-900">
                      <Smartphone size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-neutral-900">Android App</div>
                      <div className="text-[11px] text-neutral-400 truncate">Direct APK · iOS soon</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Dedicated Mobile App Showcase Section */}
        <section id="mobile-app" className="scroll-mt-20 border-b border-neutral-200/70 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              {/* Left Copy & Download CTAs */}
              <Reveal className="lg:col-span-6">
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 mb-3">
                  02 / Notes by Winner for Mobile
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-5xl leading-[1.08] text-balance">
                  Carry a quiet notebook in your{' '}
                  <span className="font-playfair italic font-normal text-neutral-500">pocket.</span>
                </h2>
                <p className="mt-5 text-base leading-relaxed text-neutral-500">
                  Great ideas rarely wait until you&rsquo;re sitting at a desk. The <span className="font-medium text-neutral-800">Notes by Winner</span> Android app is built for one-handed speed — open the app and start typing in under a second, even without cell service.
                </p>

                <ul className="mt-7 space-y-3.5 text-sm text-neutral-700">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-neutral-50 text-neutral-900">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                    <div>
                      <span className="font-semibold text-neutral-900">Direct Android APK (Sideload)</span> — Available right now as a direct `.apk` download so you can install it directly on your Android phone without waiting on store review.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-neutral-50 text-neutral-900">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                    <div>
                      <span className="font-semibold text-neutral-900">True Offline Mode</span> — Read, search, and edit your entire library on airplanes or commutes. Everything syncs automatically with the web app.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-neutral-50 text-neutral-900">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                    <div>
                      <span className="font-semibold text-neutral-900">iOS Coming Soon</span> — Native iPhone support is currently in development. In the meantime, the mobile web app works seamlessly on iOS browsers.
                    </div>
                  </li>
                </ul>

                {/* Download Buttons */}
                <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setApkModalOpen(true)}
                    className="lp-btn lp-btn-ink !h-11 !px-5 justify-center cursor-pointer"
                  >
                    <Download size={15} aria-hidden="true" />
                    <span>Download Android APK (Sideload)</span>
                  </button>
                  <span
                    aria-disabled="true"
                    className="lp-btn lp-btn-outline !h-11 !px-5 bg-neutral-50 text-neutral-400 border-neutral-200 cursor-not-allowed justify-center"
                  >
                    <Smartphone size={15} aria-hidden="true" />
                    <span>iOS — Coming Soon</span>
                  </span>
                </div>

                {/* Sideloading Guide Box */}
                <div className="mt-5 rounded-xl border border-neutral-200/90 bg-neutral-50/70 p-4 text-xs text-neutral-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-neutral-900">
                      How to install via Android Sideloading
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                      Direct APK
                    </span>
                  </div>
                  <ol className="space-y-1 text-neutral-500 list-decimal list-inside leading-relaxed">
                    <li>Tap <strong className="font-medium text-neutral-800">Download Android APK</strong> above to save the installer to your phone.</li>
                    <li>Open the downloaded <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-neutral-200 text-neutral-800">.apk</code> file and allow <strong className="font-medium text-neutral-800">Install from this source</strong> if prompted by Android.</li>
                    <li>Sign in with your account to sync your notes with the web studio.</li>
                  </ol>
                </div>
              </Reveal>

              {/* Right Visual: Monochrome Mobile Phone Mockup */}
              <Reveal delay={80} className="lg:col-span-6 flex justify-center">
                <div className="relative w-full max-w-[330px]">
                  {/* Soft architectural backdrop frame */}
                  <div
                    aria-hidden="true"
                    className="absolute -inset-4 rounded-[40px] border border-neutral-200/70 bg-neutral-50/70 -z-10"
                  />

                  {/* Phone Shell */}
                  <div className="rounded-[34px] border-2 border-neutral-900 bg-white p-3 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.12)]">
                    {/* Dynamic Island / Speaker */}
                    <div className="mx-auto mb-3 h-4 w-24 rounded-full bg-neutral-900 flex items-center justify-end px-2">
                      <span className="size-1.5 rounded-full bg-neutral-700" />
                    </div>

                    {/* Phone Screen Content */}
                    <div className="rounded-[24px] border border-neutral-200/80 bg-neutral-50/50 p-4 text-left">
                      {/* Phone Header */}
                      <div className="flex items-center justify-between mb-3.5">
                        <div>
                          <div className="text-sm font-bold tracking-tight text-neutral-900">
                            Notes
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                            <span className="size-1.5 rounded-full bg-neutral-900" />
                            Offline ready · Synced
                          </div>
                        </div>
                        <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 font-mono text-[10px] font-medium text-neutral-600">
                          12 notes
                        </span>
                      </div>

                      {/* Phone Search */}
                      <div className="mb-3 flex h-8 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-2.5 text-[11px] text-neutral-400">
                        <Search size={11} />
                        <span>Search your notes…</span>
                      </div>

                      {/* Phone Tag Pills */}
                      <div className="mb-3 flex items-center gap-1 overflow-hidden">
                        <span className="rounded-lg bg-neutral-900 px-2 py-0.5 text-[10px] font-medium text-white">
                          All
                        </span>
                        <span className="rounded-lg border border-neutral-200 bg-white px-2 py-0.5 text-[10px] text-neutral-600">
                          #ideas
                        </span>
                        <span className="rounded-lg border border-neutral-200 bg-white px-2 py-0.5 text-[10px] text-neutral-600">
                          #journal
                        </span>
                        <span className="rounded-lg border border-neutral-200 bg-white px-2 py-0.5 text-[10px] text-neutral-600">
                          #books
                        </span>
                      </div>

                      {/* Phone Note Cards */}
                      <div className="space-y-2">
                        <div className="rounded-xl border border-neutral-300 bg-white p-3 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-xs font-semibold text-neutral-900">
                              <Pin size={10} className="fill-neutral-900" />
                              Principles of Quiet Work
                            </span>
                            <span className="font-mono text-[9px] text-neutral-400">2m</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] text-neutral-500 leading-snug">
                            Clarity comes when the page in front of you asks for nothing but your next thought…
                          </p>
                          <div className="mt-2 flex gap-1">
                            <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[9px] text-neutral-600">
                              #essays
                            </span>
                            <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[9px] text-neutral-600">
                              #focus
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-neutral-200/90 bg-white p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-neutral-900">
                              Late Night Book Ideas
                            </span>
                            <span className="font-mono text-[9px] text-neutral-400">1h</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] text-neutral-500 leading-snug">
                            Chapter 1: Why paper has endured for two thousand years of human thought…
                          </p>
                          <div className="mt-2 flex gap-1">
                            <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[9px] text-neutral-600">
                              #books
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-neutral-200/90 bg-white p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-neutral-900">
                              Weekend Packing List
                            </span>
                            <span className="font-mono text-[9px] text-neutral-400">Yesterday</span>
                          </div>
                          <p className="mt-1 text-[11px] text-neutral-500">
                            ✓ Passport · ✓ Fountain pen · ✓ Pocket notebook
                          </p>
                        </div>
                      </div>

                      {/* Floating Action Button inside phone */}
                      <div className="mt-3 flex items-center justify-between pt-2">
                        <span className="font-mono text-[10px] text-neutral-400">
                          Synced with Web Studio
                        </span>
                        <span className="flex size-9 items-center justify-center rounded-full bg-neutral-900 text-white shadow-md">
                          <Plus size={16} strokeWidth={2.5} />
                        </span>
                      </div>
                    </div>

                    {/* Home Indicator Bar */}
                    <div className="mx-auto mt-2.5 h-1 w-24 rounded-full bg-neutral-300" />
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Interactive Keyboard Shortcuts Section */}
        <section id="shortcuts" className="scroll-mt-20 border-b border-neutral-200/70 bg-neutral-50/40">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <Reveal className="lg:col-span-5">
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 mb-3">
                  03 / Speed &amp; Flow
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl text-balance">
                  Built for people who think at keyboard speed.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-neutral-500">
                  Every common action has a direct keyboard shortcut. No nested menus, no hunting for buttons — your hands never have to leave the keys.
                </p>

                <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-neutral-900">
                      {selectedShortcut.label}
                    </span>
                    <div className="flex gap-1">
                      {selectedShortcut.keys.map((k) => (
                        <kbd
                          key={k}
                          className="rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-neutral-800"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    {selectedShortcut.detail}
                  </p>
                </div>
              </Reveal>

              <Reveal delay={80} className="lg:col-span-7">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {SHORTCUTS.map((s) => {
                    const isSelected = s.id === activeShortcut;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveShortcut(s.id)}
                        className={`text-left rounded-2xl border p-5 transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-neutral-900 bg-white shadow-xs'
                            : 'border-neutral-200/90 bg-white/70 hover:border-neutral-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <div className="flex items-center gap-1.5">
                            {s.keys.map((k) => (
                              <kbd key={k} className="lp-kbd">
                                {k}
                              </kbd>
                            ))}
                          </div>
                          <span
                            className={`size-2 rounded-full ${
                              isSelected ? 'bg-neutral-900' : 'bg-neutral-200'
                            }`}
                          />
                        </div>
                        <div className="text-sm font-semibold text-neutral-900">{s.label}</div>
                        <p className="mt-1 text-xs text-neutral-500 leading-relaxed">{s.detail}</p>
                      </button>
                    );
                  })}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* White-Dominant Architectural Final CTA */}
        <section className="px-6 py-24 bg-white">
          <Reveal className="mx-auto max-w-5xl">
            <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50/50 px-6 py-16 sm:px-14 sm:py-20 text-center shadow-[0_20px_50px_-24px_rgba(0,0,0,0.06)]">
              <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-600">
                <Feather size={12} />
                <span>Notes by Winner · Web &amp; Android</span>
              </div>

              <h2 className="mx-auto max-w-xl text-3xl font-semibold tracking-tight text-neutral-900 sm:text-5xl text-balance">
                Your next thought deserves a{' '}
                <span className="font-playfair italic font-normal text-neutral-500">quiet home.</span>
              </h2>

              <p className="mx-auto mt-4 max-w-md text-sm sm:text-base text-neutral-500">
                Start writing in your browser right now or sideload the Android APK directly onto your phone (iOS coming soon).
              </p>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleQuickGoogle}
                  disabled={quickGoogleLoading}
                  className="lp-btn lp-btn-ink !h-11 !px-6"
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
                    {isAuthed
                      ? 'Open Your Notes'
                      : quickGoogleLoading
                      ? 'Signing in…'
                      : 'Continue with Google'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setApkModalOpen(true)}
                  className="lp-btn lp-btn-outline !h-11 !px-5 bg-white cursor-pointer"
                >
                  <Smartphone size={15} aria-hidden="true" />
                  <span>Get Android APK</span>
                </button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Clean Editorial Footer */}
      <footer className="border-t border-neutral-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-neutral-400 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded border border-neutral-200 bg-neutral-50 text-neutral-800">
              <Feather size={11} aria-hidden="true" />
            </span>
            <span translate="no" className="font-medium text-neutral-700">
              Notes <span className="font-normal text-neutral-400">by Winner</span>
            </span>
            <span>·</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#preview" className="hover:text-neutral-900 transition-colors">
              Workspace
            </a>
            <a href="#features" className="hover:text-neutral-900 transition-colors">
              Features
            </a>
            <a href="#mobile-app" className="hover:text-neutral-900 transition-colors">
              Mobile App
            </a>
            <a href="#shortcuts" className="hover:text-neutral-900 transition-colors">
              Shortcuts
            </a>
          </div>
        </div>
      </footer>

      <DownloadApkModal
        isOpen={apkModalOpen}
        onClose={() => setApkModalOpen(false)}
      />

      {authMode && (
        <AuthModal
          initialMode={authMode}
          onClose={closeAuth}
          onSuccess={() => {
            setAuthMode(null);
            router.push('/notes');
          }}
        />
      )}
    </div>
  );
}
