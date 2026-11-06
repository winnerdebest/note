'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Feather } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import {
  getToken,
  getMe,
  fetchNotesApi,
  createNoteApi,
  updateNoteApi,
  deleteNoteApi,
} from '@/lib/api';

type MobileView = 'list' | 'editor';

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [trashedNotes, setTrashedNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [mobileView, setMobileView] = useState<MobileView>('list');
  const [userEmail, setUserEmail] = useState<string>('');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'default';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    variant: 'default',
    onConfirm: () => {},
  });

  const router = useRouter();
  const { toasts, addToast, dismissToast } = useToast();

  const fetchNotes = useCallback(
    async (search?: string, tag?: string) => {
      try {
        const data = await fetchNotesApi(false, search, tag);
        setNotes(data);
      } catch (error: any) {
        console.error('Failed to fetch notes:', error);
        if (
          error.message?.includes('401') ||
          error.message?.includes('Could not validate credentials')
        ) {
          router.push('/');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const fetchTrashedNotes = useCallback(async () => {
    try {
      const data = await fetchNotesApi(true);
      const trashed = data.filter((n: any) => n.deletedAt !== null);
      setTrashedNotes(trashed);
    } catch (error) {
      console.error('Failed to fetch trashed notes:', error);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (!token) {
        router.push('/');
        return;
      }
      try {
        const me = await getMe();
        setUserEmail(me.email || '');
        await Promise.all([fetchNotes(), fetchTrashedNotes()]);
      } catch (err) {
        console.error('Session validation error:', err);
        router.push('/');
      }
    };
    checkAuth();
  }, [fetchNotes, fetchTrashedNotes, router]);

  const handleSearchChange = useCallback(
    (q: string) => {
      setSearchQuery(q);
      fetchNotes(q, activeTag);
    },
    [activeTag, fetchNotes]
  );

  const handleTagChange = useCallback(
    (tag: string) => {
      setActiveTag(tag);
      fetchNotes(searchQuery, tag);
    },
    [searchQuery, fetchNotes]
  );

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => (n.tags || []).forEach((t: string) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [notes]);

  const handleNewNote = () => {
    const newNote = {
      title: '',
      content: '',
      isPinned: false,
      tags: [],
    };
    setActiveNote(newNote);
    setMobileView('editor');
  };

  const handleSelectNote = (id: string) => {
    const found = notes.find((n) => n.id === id);
    if (found) {
      setActiveNote(found);
      setMobileView('editor');
    }
  };

  const handleMobileBack = () => {
    setMobileView('list');
  };

  const handleSaveNote = async (noteData: any) => {
    try {
      let saved: any;
      if (noteData.id) {
        saved = await updateNoteApi(noteData.id, noteData);
      } else {
        saved = await createNoteApi(noteData);
      }
      await fetchNotes(searchQuery, activeTag);
      setActiveNote(saved);
    } catch (error) {
      console.error('Failed to save note:', error);
      addToast('error', 'Failed to save note');
    }
  };

  const handleDeleteNote = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Move to Trash',
      message:
        'This note will be moved to trash. You can restore it anytime from the sidebar.',
      confirmLabel: 'Move to Trash',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteNoteApi(id, false);
          await fetchNotes(searchQuery, activeTag);
          await fetchTrashedNotes();
          setActiveNote(null);
          setMobileView('list');
          addToast('success', 'Moved to trash');
        } catch {
          addToast('error', 'Failed to delete note');
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleRestoreNote = async (id: string) => {
    try {
      await updateNoteApi(id, { deletedAt: null });
      await fetchNotes(searchQuery, activeTag);
      await fetchTrashedNotes();
      addToast('success', 'Note restored');
    } catch {
      addToast('error', 'Failed to restore note');
    }
  };

  const handlePermanentDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Permanently',
      message: 'This cannot be undone. The note will be permanently removed.',
      confirmLabel: 'Delete Forever',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteNoteApi(id, true);
          await fetchTrashedNotes();
          addToast('info', 'Permanently deleted');
        } catch {
          addToast('error', 'Failed to delete');
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const shortcuts = useMemo(
    () => ({
      'ctrl+n': () => handleNewNote(),
      'ctrl+k': () => {
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.focus();
      },
      'ctrl+d': () => {
        if (activeNote?.id) handleDeleteNote(activeNote.id);
      },
    }),
    [activeNote]
  );
  useKeyboardShortcuts(shortcuts);

  if (isLoading) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-on-surface/20 border-t-on-surface rounded-full animate-spin" />
          <span className="text-xs text-on-surface-variant font-mono">
            Opening workspace…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh w-screen overflow-hidden bg-surface text-on-surface">
      {/* Top Studio Bar — Desktop Only (Matches Landing Page AppPreview Chrome, no duplicate Settings button) */}
      <header className="hidden md:flex items-center justify-between border-b border-outline-variant/80 bg-surface-low/80 px-4 py-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <a
            href="/"
            translate="no"
            className="flex items-center gap-2 text-xs font-semibold tracking-tight text-on-surface hover:opacity-80 transition-opacity"
          >
            <span className="flex size-5 items-center justify-center rounded border border-outline-variant bg-surface-lowest text-on-surface">
              <Feather size={11} />
            </span>
            <span>Notes</span>
            <span className="font-normal text-on-surface-variant">by Winner</span>
          </a>
          <span className="h-3.5 w-px bg-outline-variant" />
          <span className="font-mono text-[11px] text-on-surface-variant truncate">
            {userEmail || 'Personal Workspace'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-lowest px-2.5 py-0.5 text-[11px] font-medium text-on-surface-variant">
            <span className="size-1.5 rounded-full bg-on-surface" />
            Synced across devices
          </span>
        </div>
      </header>

      {/* Split Workspace */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`
            ${mobileView === 'list' ? 'flex' : 'hidden'}
            md:flex
            w-full md:w-[300px] flex-shrink-0
            border-r border-outline-variant/80
            h-full
          `}
        >
          <Sidebar
            notes={notes}
            trashedNotes={trashedNotes}
            activeNoteId={activeNote?.id}
            onNewNote={handleNewNote}
            onSelectNote={handleSelectNote}
            onRestoreNote={handleRestoreNote}
            onPermanentDelete={handlePermanentDelete}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            activeTag={activeTag}
            onTagChange={handleTagChange}
            allTags={allTags}
          />
        </div>

        {/* Editor */}
        <div
          className={`
            ${mobileView === 'editor' ? 'flex' : 'hidden'}
            md:flex
            flex-1 h-full min-w-0
          `}
        >
          <Editor
            note={mobileView === 'editor' || activeNote ? activeNote : null}
            onSave={handleSaveNote}
            onDelete={handleDeleteNote}
            onBack={handleMobileBack}
            onNewNote={handleNewNote}
          />
        </div>
      </div>

      {/* Mobile Floating Action Button (positioned above bottom bar so it never overlaps) */}
      {mobileView === 'list' && (
        <button
          type="button"
          aria-label="New note"
          className="fab md:hidden !bottom-16 !right-4"
          onClick={handleNewNote}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
