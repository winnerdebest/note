'use client';

import React from 'react';
import { 
  Sparkles, 
  Smartphone, 
  WifiOff, 
  Cloud, 
  CheckCircle2, 
  Tag, 
  ShieldCheck, 
  ArrowRight,
  Download
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <header className="w-full px-6 md:px-12 py-5 flex justify-between items-center fixed top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Mindful Canvas
          </span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="#download"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition-all flex items-center gap-2"
          >
            <Download size={15} />
            <span>Get App</span>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 pt-32 pb-20 px-6 max-w-6xl mx-auto flex flex-col items-center text-center">
        {/* Release Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
          <Sparkles size={13} />
          FastAPI &amp; Neon Powered Mobile Experience
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-6">
          Your thoughts, beautifully organized.{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Offline &amp; Everywhere.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed font-normal">
          A distraction-free mobile note-taking app that saves locally first and syncs seamlessly to the cloud when connected. Zero latency, instant search, and complete peace of mind.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <a
            href="#download"
            className="px-7 py-3.5 rounded-xl font-semibold text-base bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all flex items-center gap-3"
          >
            <Smartphone size={18} />
            <span>Download for Mobile</span>
            <ArrowRight size={16} />
          </a>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 rounded-xl font-semibold text-base bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-all flex items-center gap-2"
          >
            <span>Explore API Docs</span>
          </a>
        </div>

        {/* App Mockup / Visual Highlight */}
        <div className="w-full max-w-4xl p-2 rounded-2xl bg-gradient-to-b from-slate-700/50 via-slate-800/30 to-slate-900/50 border border-slate-800 shadow-2xl mb-24">
          <div className="bg-slate-950 rounded-xl p-6 sm:p-10 border border-slate-800/80 text-left">
            <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-500 font-mono ml-2">Mindful Canvas Mobile Hub</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Offline Ready · SQLite Synced
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-200">🚀 Product Architecture</h3>
                  <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">Pinned</span>
                </div>
                <p className="text-sm text-slate-400 line-clamp-2">
                  Migrated from Supabase BaaS to high-speed FastAPI + Neon PostgreSQL with local SQLite cache.
                </p>
                <div className="flex gap-2 mt-3">
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">#tech</span>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">#mobile</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-200">💡 Next Features Idea</h3>
                  <span className="text-xs text-slate-500">Today, 14:20</span>
                </div>
                <p className="text-sm text-slate-400 line-clamp-2">
                  Rich formatting, quick voice-to-text, and instant markdown preview right on device.
                </p>
                <div className="flex gap-2 mt-3">
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">#ideas</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left w-full max-w-5xl mb-24">
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-5">
              <WifiOff size={22} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">100% Offline-First</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every note is saved directly to your device's native SQLite storage first. Zero waiting for internet spinners, even inside a subway or airplane.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-5">
              <Cloud size={22} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Atomic Neon Cloud Sync</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              When online, the app triggers a single-trip batch sync to the FastAPI backend, resolving conflicts automatically and keeping your notes safe.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-5">
              <ShieldCheck size={22} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Self-Hosted &amp; Private</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your notes belong to you. Powered by robust JWT authentication with secure password hashing and no third-party vendor lock-in.
            </p>
          </div>
        </div>

        {/* Download Section */}
        <section id="download" className="w-full max-w-4xl p-10 rounded-3xl bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-950 border border-indigo-500/30 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Get Mindful Canvas on your device
          </h2>
          <p className="text-slate-300 max-w-xl mx-auto mb-8 text-base">
            Available on Android and iOS. Built with Expo SDK 54 for native responsiveness and fluid animations.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm flex items-center gap-2.5 shadow-lg transition-transform active:scale-95">
              <Smartphone size={18} />
              <span>Download Android APK</span>
            </button>
            <button className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm flex items-center gap-2.5 transition-transform active:scale-95">
              <span>Expo Go Client</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-4">iOS App Store &amp; Google Play Store release coming soon.</p>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-slate-900 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Mindful Canvas. All rights reserved.</p>
      </footer>
    </div>
  );
}
