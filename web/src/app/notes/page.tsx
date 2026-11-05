'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { createClient } from '@/utils/supabase/client';

type MobileView = 'list' | 'editor';

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [trashedNotes, setTrashedNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [mobileView, setMobileView] = useState<MobileView>('list');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'default';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', confirmLabel: '', variant: 'default', onConfirm: () => {} });

  const router = useRouter();
  const supabase = createClient();
  const { toasts, addToast, dismissToast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
      } else {
        fetchNotes();
        fetchTrashedNotes();
      }
    };
    checkUser();
  }, []);

  const fetchNotes = async (search?: string, tag?: string) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (tag) params.set('tag', tag);

      const res = await fetch(`/api/notes?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setNotes(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrashedNotes = async () => {
    try {
      const res = await fetch('/api/notes?deleted=true');
      const data = await res.json();
      if (data.success) {
        setTrashedNotes(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch trashed notes:', error);
    }
  };

  const handleSearchChange = useCallback(
    (q: string) => {
      setSearchQuery(q);
      fetchNotes(q, activeTag);
    },
    [activeTag]
  );

  const handleTagChange = useCallback(
    (tag: string) => {
      setActiveTag(tag);
      fetchNotes(searchQuery, tag);
    },
    [searchQuery]
  );

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => (n.tags || []).forEach((t: string) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [notes]);

  // Create new note — on mobile, jump to editor
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

  // Select note — on mobile, jump to editor
  const handleSelectNote = (id: string) => {
    const found = notes.find((n) => n.id === id);
    if (found) {
      setActiveNote(found);
      setMobileView('editor');
    }
  };

  // Back to list on mobile
  const handleMobileBack = () => {
    setMobileView('list');
    // Don't clear activeNote so desktop still shows it
  };

  const handleSaveNote = async (noteData: any) => {
    try {
      const method = noteData.id ? 'PATCH' : 'POST';
      const url = noteData.id ? `/api/notes/${noteData.id}` : '/api/notes';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      });

      const data = await res.json();
      if (data.success) {
        await fetchNotes(searchQuery, activeTag);
        setActiveNote(data.data);
      } else {
        addToast('error', 'Failed to save note');
      }
    } catch (error) {
      console.error('Failed to save note:', error);
      addToast('error', 'Failed to save note');
    }
  };

  const handleDeleteNote = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Move to Trash',
      message: 'This note will be moved to trash. You can restore it later from the sidebar.',
      confirmLabel: 'Move to Trash',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            await fetchNotes(searchQuery, activeTag);
            await fetchTrashedNotes();
            setActiveNote(null);
            setMobileView('list');
            addToast('success', 'Moved to trash');
          }
        } catch (error) {
          addToast('error', 'Failed to delete note');
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleRestoreNote = async (id: string) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: true }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchNotes(searchQuery, activeTag);
        await fetchTrashedNotes();
        addToast('success', 'Note restored');
      }
    } catch (error) {
      addToast('error', 'Failed to restore note');
    }
  };

  const handlePermanentDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Permanently',
      message: 'This cannot be undone. The note will be gone forever.',
      confirmLabel: 'Delete Forever',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/notes/${id}?permanent=true`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            await fetchTrashedNotes();
            addToast('info', 'Permanently deleted');
          }
        } catch (error) {
          addToast('error', 'Failed to delete');
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Global shortcuts
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
      <div className="flex h-screen w-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-xs text-on-surface-variant/50 font-medium">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface">
      {/* === SIDEBAR / LIST VIEW === */}
      {/* Desktop: always visible. Mobile: only when mobileView === 'list' */}
      <div className={`
        ${mobileView === 'list' ? 'flex' : 'hidden'}
        md:flex
        w-full md:w-[320px] flex-shrink-0
        border-r border-outline-variant/10
        h-full
      `}>
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

      {/* === EDITOR VIEW === */}
      {/* Desktop: always visible. Mobile: only when mobileView === 'editor' */}
      <div className={`
        ${mobileView === 'editor' ? 'flex' : 'hidden'}
        md:flex
        flex-1 h-full min-w-0
      `}>
        <Editor
          note={mobileView === 'editor' || activeNote ? activeNote : null}
          onSave={handleSaveNote}
          onDelete={handleDeleteNote}
          onBack={handleMobileBack}
        />
      </div>

      {/* === MOBILE FAB (New Note) === shown only on list view on mobile */}
      {mobileView === 'list' && (
        <button className="fab md:hidden" onClick={handleNewNote}>
          <Plus size={24} strokeWidth={2.5} />
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

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
