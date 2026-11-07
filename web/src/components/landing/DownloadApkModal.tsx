'use client';

import { useEffect, useState } from 'react';
import { X, Download, Check, Smartphone, Feather, ShieldCheck, RefreshCw } from 'lucide-react';

interface DownloadApkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadApkModal({ isOpen, onClose }: DownloadApkModalProps) {
  const [downloaded, setDownloaded] = useState(false);

  const downloadUrl = process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL || '/download/android';

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => setDownloaded(false), 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const triggerDownload = () => {
    setDownloaded(true);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', 'notes-by-winner.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="apk-modal-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 sm:p-7 text-neutral-900 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer"
        >
          <X size={15} />
        </button>

        {!downloaded ? (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-xs">
                <Feather size={19} strokeWidth={2.2} />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 font-mono text-[10px] font-medium text-neutral-600">
                  <Smartphone size={10} />
                  <span>v1.0.0 · Android APK</span>
                </div>
                <h2
                  id="apk-modal-title"
                  className="mt-1 text-lg font-semibold tracking-tight text-neutral-900"
                >
                  Notes by Winner for Android
                </h2>
              </div>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-neutral-500">
              Install the native Android workspace directly on your phone. Works completely offline and syncs automatically with your web studio.
            </p>

            <div className="mt-5 space-y-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/70 p-4 text-xs text-neutral-700">
              <div className="flex items-center gap-2.5">
                <Check size={14} className="shrink-0 text-neutral-900" />
                <span>Monochrome Paper &amp; Ink interface with Dark Mode</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check size={14} className="shrink-0 text-neutral-900" />
                <span>Live Visual &amp; Markdown Syntax editor with keyboard bar</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check size={14} className="shrink-0 text-neutral-900" />
                <span>Instant 1-tap Google Sign-In &amp; offline SQLite storage</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={triggerDownload}
                className="lp-btn lp-btn-ink w-full !h-11 justify-center cursor-pointer"
              >
                <Download size={15} />
                <span>Download Android APK</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-neutral-400">
                <ShieldCheck size={13} className="text-neutral-600" />
                <span>Signed production APK · Android 8.0+ · iOS coming soon</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-sm">
              <Check size={22} strokeWidth={2.5} />
            </div>

            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 font-mono text-[10px] font-medium text-neutral-600">
              <span>notes-by-winner.apk</span>
            </div>

            <h2
              id="apk-modal-title"
              className="text-xl font-semibold tracking-tight text-neutral-900"
            >
              Thanks for downloading!
            </h2>

            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-neutral-500">
              Your download has started. Follow these quick steps to finish installing on your Android phone:
            </p>

            <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 text-left text-xs text-neutral-600 space-y-2">
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 font-mono text-[10px] font-semibold text-white">
                  1
                </span>
                <span>
                  Open <strong className="font-semibold text-neutral-900">notes-by-winner.apk</strong> from your browser&apos;s downloads bar or notification shade.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 font-mono text-[10px] font-semibold text-white">
                  2
                </span>
                <span>
                  If prompted by Android, tap <strong className="font-semibold text-neutral-900">Settings → Allow from this source</strong> and confirm <strong className="font-semibold text-neutral-900">Install</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 font-mono text-[10px] font-semibold text-white">
                  3
                </span>
                <span>
                  Open <strong className="font-semibold text-neutral-900">Notes by Winner</strong> and tap <strong className="font-semibold text-neutral-900">Continue with Google</strong> to sync your workspace.
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="lp-btn lp-btn-ink w-full !h-10 justify-center cursor-pointer"
              >
                <span>Done</span>
              </button>

              <button
                type="button"
                onClick={triggerDownload}
                className="inline-flex items-center justify-center gap-1.5 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                <RefreshCw size={12} />
                <span>Download didn&apos;t start? Tap to try again</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
