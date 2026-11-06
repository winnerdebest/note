'use client';

import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { LogOut, ArrowLeft, Moon, Sun, Monitor, User, Feather } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getMe, clearAuthSession } from '@/lib/api';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const u = await getMe();
        setUser(u);
      } catch (err) {
        console.error('Failed to load user info:', err);
        router.push('/');
      }
    }
    loadUser();
  }, [router]);

  const handleSignOut = () => {
    clearAuthSession();
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-on-surface/20 border-t-on-surface rounded-full animate-spin" />
      </div>
    );
  }

  const themes = [
    { id: 'light', label: 'Light (Paper)', icon: Sun },
    { id: 'dark', label: 'Dark (Ink)', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="min-h-dvh bg-surface text-on-surface flex flex-col font-inter">
      {/* Studio Top Bar */}
      <header className="px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-outline-variant/80 bg-surface-low/60">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/notes')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-lowest px-2.5 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container active:scale-97 transition-all cursor-pointer"
            aria-label="Back to notes"
          >
            <ArrowLeft size={14} />
            <span>Notes</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded border border-outline-variant bg-surface-lowest text-on-surface">
              <Feather size={11} />
            </span>
            <h1 className="text-sm font-semibold tracking-tight">
              Workspace Settings
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-7 sm:gap-8">
        {/* Account Profile */}
        <section>
          <h2 className="font-mono text-[11px] font-medium uppercase tracking-widest text-on-surface-variant mb-3 px-0.5">
            01 / Account
          </h2>
          <div className="card space-y-4">
            <div className="flex items-center gap-3.5 pb-4 border-b border-outline-variant/70">
              <div className="w-10 h-10 rounded-xl border border-outline-variant bg-surface-low flex items-center justify-center flex-shrink-0">
                <User size={17} className="text-on-surface" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-on-surface truncate">
                  {user.email}
                </div>
                <div className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                  <span className="size-1.5 rounded-full bg-on-surface" />
                  Synced across Web &amp; Mobile
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] text-on-surface-variant">
              <span>Account ID</span>
              <span className="truncate max-w-[220px]">{user.id}</span>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h2 className="font-mono text-[11px] font-medium uppercase tracking-widest text-on-surface-variant mb-3 px-0.5">
            02 / Appearance
          </h2>
          <div className="card">
            <div className="grid grid-cols-3 gap-2.5">
              {themes.map(({ id, label, icon: Icon }) => {
                const active = theme === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTheme(id)}
                    className={`flex flex-col items-center justify-center py-4 px-3 rounded-xl border transition-all text-xs font-medium cursor-pointer ${
                      active
                        ? 'border-on-surface bg-on-surface text-surface shadow-xs'
                        : 'border-outline-variant bg-surface-low text-on-surface-variant hover:border-on-surface/40 hover:text-on-surface'
                    }`}
                  >
                    <Icon size={17} className="mb-2" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section>
          <h2 className="font-mono text-[11px] font-medium uppercase tracking-widest text-on-surface-variant mb-3 px-0.5">
            03 / Keyboard Shortcuts
          </h2>
          <div className="card space-y-2.5 text-xs">
            {[
              ['New note', 'Ctrl + N'],
              ['Search notes', 'Ctrl + K'],
              ['Toggle Reader / Markdown mode', 'Ctrl + P'],
              ['Force save immediately', 'Ctrl + S'],
              ['Move active note to trash', 'Ctrl + D'],
            ].map(([action, keys]) => (
              <div
                key={action}
                className="flex items-center justify-between py-1.5 border-b border-outline-variant/50 last:border-none"
              >
                <span className="text-on-surface-variant">{action}</span>
                <kbd className="px-2 py-0.5 border border-outline-variant bg-surface-low rounded font-mono text-[11px] text-on-surface">
                  {keys}
                </kbd>
              </div>
            ))}
          </div>
        </section>

        {/* Sign Out */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-outline-variant bg-surface-lowest text-on-surface font-medium text-xs hover:bg-on-surface hover:text-surface transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out of Workspace</span>
          </button>
        </div>
      </main>
    </div>
  );
}
