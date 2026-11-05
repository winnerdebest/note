'use client';

import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { LogOut, ArrowLeft, Moon, Sun, Monitor, User } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/');
      else setUser(user);
    }
    getUser();
  }, [router, supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (!user) return <div className="min-h-screen bg-surface flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-inter">
      <header className="px-5 md:px-8 py-4 flex items-center gap-3 border-b border-outline-variant/10">
        <button onClick={() => router.push('/notes')} className="icon-btn">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold tracking-tight">Settings</h1>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto px-5 py-8 flex flex-col gap-8">
        {/* Profile */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-3 px-1">
            Account
          </h2>
          <div className="card space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-outline-variant/10">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-on-surface truncate">{user.email}</div>
                <div className="text-xs text-on-surface-variant/50 capitalize">{user.app_metadata?.provider || 'Email'}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-3 px-1">
            Appearance
          </h2>
          <div className="card">
            <div className="grid grid-cols-3 gap-2">
              {themes.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`flex flex-col items-center justify-center py-4 rounded-lg border-2 transition-all text-sm font-medium ${
                    theme === id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent bg-surface-container/50 text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <Icon size={20} className="mb-1.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Shortcuts */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-3 px-1">
            Keyboard Shortcuts
          </h2>
          <div className="card space-y-2 text-sm">
            {[
              ['New note', '⌘ N'],
              ['Save', '⌘ S'],
              ['Search', '⌘ K'],
              ['Delete', '⌘ D'],
              ['Toggle preview', '⌘ ⇧ P'],
            ].map(([action, keys]) => (
              <div key={action} className="flex items-center justify-between py-1">
                <span className="text-on-surface-variant">{action}</span>
                <kbd className="px-2 py-0.5 bg-surface-container rounded text-[0.6875rem] font-mono text-on-surface-variant/70">{keys}</kbd>
              </div>
            ))}
          </div>
        </section>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-error/20 text-error font-semibold text-sm hover:bg-error/5 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </main>
    </div>
  );
}
