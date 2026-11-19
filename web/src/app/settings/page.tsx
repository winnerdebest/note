'use client';

import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { LogOut, ArrowLeft, Moon, Sun, Monitor, User, Feather, Lock, Unlock } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getMe,
  clearAuthSession,
  getEncryptionBundleApi,
  updateEncryptionBundleApi,
  encryptAllWebNotesApi,
} from '@/lib/api';
import {
  getActiveDek,
  clearActiveDek,
  setupE2eeKeys,
  unlockE2eeWithSecret,
} from '@/lib/crypto';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [e2eeEnabled, setE2eeEnabled] = useState(false);
  const [e2eeUnlocked, setE2eeUnlocked] = useState(false);
  const [e2eeBundle, setE2eeBundle] = useState<any>(null);
  const [passphrase, setPassphrase] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [e2eeStatus, setE2eeStatus] = useState<string | null>(null);
  const [e2eeBusy, setE2eeBusy] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const u = await getMe();
        setUser(u);
        setE2eeUnlocked(!!getActiveDek());
        try {
          const bundle = await getEncryptionBundleApi();
          setE2eeBundle(bundle);
          setE2eeEnabled(!!bundle?.e2ee_enabled);
        } catch {
          // ignore
        }
      } catch (err) {
        console.error('Failed to load user info:', err);
        router.push('/');
      }
    }
    loadUser();
  }, [router]);

  const handleEnableE2ee = async () => {
    if (passphrase.trim().length < 6) {
      setE2eeStatus('Please enter at least 6 characters.');
      return;
    }
    setE2eeBusy(true);
    setE2eeStatus(null);
    try {
      const { bundle, recoveryKey: rk } = await setupE2eeKeys(passphrase.trim());
      await updateEncryptionBundleApi(bundle);
      await encryptAllWebNotesApi();
      setE2eeEnabled(true);
      setE2eeUnlocked(true);
      setE2eeBundle({ ...bundle, e2ee_enabled: true });
      setRecoveryKey(rk);
      setPassphrase('');
      setE2eeStatus('End-to-end encryption enabled and existing notes encrypted.');
    } catch (e: any) {
      setE2eeStatus(e?.message || 'Failed to enable encryption.');
    } finally {
      setE2eeBusy(false);
    }
  };

  const handleUnlockE2ee = async () => {
    if (!passphrase.trim()) return;
    setE2eeBusy(true);
    setE2eeStatus(null);
    try {
      const bundle = e2eeBundle?.wrapped_dek ? e2eeBundle : await getEncryptionBundleApi();
      await unlockE2eeWithSecret(passphrase.trim(), bundle, useRecovery);
      setE2eeUnlocked(true);
      setPassphrase('');
      setE2eeStatus('Notes unlocked for this browser session.');
    } catch (e: any) {
      setE2eeStatus(e?.message || 'Incorrect passphrase or recovery key.');
    } finally {
      setE2eeBusy(false);
    }
  };

  const handleLockE2ee = () => {
    clearActiveDek();
    setE2eeUnlocked(false);
    setE2eeStatus('Vault locked in this browser.');
  };

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

        {/* End-to-End Encryption */}
        <section>
          <h2 className="font-mono text-[11px] font-medium uppercase tracking-widest text-on-surface-variant mb-3 px-0.5">
            04 / End-to-End Encryption
          </h2>
          <div className="card space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant flex items-center gap-2">
                {e2eeUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
                <span>Vault Status</span>
              </span>
              <span className="font-mono font-medium text-on-surface">
                {!e2eeEnabled ? 'Not Enabled' : e2eeUnlocked ? 'Unlocked' : 'Locked'}
              </span>
            </div>

            {recoveryKey && (
              <div className="p-3 rounded-xl border border-outline-variant bg-surface-low space-y-1.5">
                <div className="text-xs font-semibold text-on-surface">
                  Save Your One-Time Recovery Key
                </div>
                <div className="font-mono text-xs break-all select-all text-on-surface-variant">
                  {recoveryKey}
                </div>
              </div>
            )}

            {(!e2eeEnabled || !e2eeUnlocked) && (
              <div className="space-y-2.5">
                <input
                  type={useRecovery ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder={
                    !e2eeEnabled
                      ? 'Set encryption passphrase (min 6 chars)…'
                      : useRecovery
                      ? 'Enter your Recovery Key…'
                      : 'Enter your encryption passphrase…'
                  }
                  className="w-full rounded-xl border border-outline-variant bg-surface-low px-3 py-2 text-xs text-on-surface outline-none focus:border-on-surface"
                />
                {e2eeEnabled && !e2eeUnlocked && (
                  <button
                    type="button"
                    onClick={() => setUseRecovery((p) => !p)}
                    className="text-[11px] text-on-surface-variant underline cursor-pointer"
                  >
                    {useRecovery ? 'Use passphrase instead' : 'Forgot passphrase? Use Recovery Key'}
                  </button>
                )}
                <button
                  type="button"
                  disabled={e2eeBusy}
                  onClick={!e2eeEnabled ? handleEnableE2ee : handleUnlockE2ee}
                  className="w-full py-2.5 rounded-xl bg-on-surface text-surface text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {e2eeBusy
                    ? 'Processing…'
                    : !e2eeEnabled
                    ? 'Enable End-to-End Encryption'
                    : 'Unlock Notes'}
                </button>
              </div>
            )}

            {e2eeEnabled && e2eeUnlocked && (
              <button
                type="button"
                onClick={handleLockE2ee}
                className="w-full py-2.5 rounded-xl border border-outline-variant bg-surface-low text-on-surface text-xs font-medium hover:bg-surface-container transition-colors cursor-pointer"
              >
                Lock Vault in This Browser
              </button>
            )}

            {e2eeStatus && (
              <p className="text-[11px] text-on-surface-variant">{e2eeStatus}</p>
            )}
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
