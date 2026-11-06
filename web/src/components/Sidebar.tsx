'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Settings,
  Search,
  Trash2,
  RotateCcw,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  Pin,
  Cloud,
  Feather,
} from 'lucide-react';

interface Note {
  id?: string;
  title: string;
  content: string;
  isPinned: boolean;
  updatedAt?: string;
  tags?: string[];
  deletedAt?: string | null;
}

interface SidebarProps {
  onNewNote: () => void;
  activeNoteId?: string;
  onSelectNote: (id: string) => void;
  notes: Note[];
  trashedNotes: Note[];
  onRestoreNote: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTag: string;
  onTagChange: (tag: string) => void;
  allTags: string[];
}

const Sidebar: React.FC<SidebarProps> = ({
  onNewNote,
  notes,
  activeNoteId,
  onSelectNote,
  trashedNotes,
  onRestoreNote,
  onPermanentDelete,
  searchQuery,
  onSearchChange,
  activeTag,
  onTagChange,
  allTags,
}) => {
  const router = useRouter();
  const [showTrash, setShowTrash] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'pinned'>('all');

  const pinnedCount = useMemo(
    () => notes.filter((n) => n.isPinned).length,
    [notes]
  );

  const displayedNotes = useMemo(() => {
    if (filterMode === 'pinned') {
      return notes.filter((n) => n.isPinned);
    }
    return notes;
  }, [notes, filterMode]);

  const getPreview = (content: string) => {
    if (!content) return 'Empty note…';
    const cleaned = content
      .replace(/^#+\s+/gm, '')
      .replace(/^\s*[-*]\s+\[[ xX]\]\s+/gm, '✓ ')
      .replace(/[#*_~`>\-\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return 'Empty note…';
    return cleaned.slice(0, 65) + (cleaned.length > 65 ? '…' : '');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <aside className="w-full md:w-[300px] h-full bg-surface-low flex flex-col text-on-surface-variant overflow-hidden select-none">
      {/* Top Workspace Header */}
      <div className="p-3.5 pb-2.5">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <div className="flex items-center gap-2">
            <div className="flex size-6 md:size-5 items-center justify-center rounded-md md:rounded bg-on-surface text-surface">
              <Feather size={12} className="md:hidden" />
              <FileText size={11} className="hidden md:block" />
            </div>
            <h1 className="text-sm md:text-xs font-semibold tracking-tight text-on-surface">
              <span className="md:hidden">
                Notes <span className="font-normal text-on-surface-variant text-xs">by Winner</span>
              </span>
              <span className="hidden md:inline">All Notes</span>
            </h1>
            <span className="rounded-full bg-surface-high/70 px-1.5 py-0.5 font-mono text-[10px] text-on-surface-variant">
              {notes.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onNewNote}
            className="inline-flex items-center gap-1 rounded-lg md:rounded-md border border-outline-variant bg-surface-lowest px-2.5 py-1.5 md:py-1 text-xs md:text-[11px] font-medium text-on-surface shadow-2xs hover:bg-surface-container active:scale-97 transition-all cursor-pointer"
          >
            <Plus size={13} strokeWidth={2.2} />
            <span>New</span>
          </button>
        </div>

        {/* Search Input with ⌘K badge */}
        <div className="relative mb-3" id="search-container">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search notes or #tags…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 md:h-8 pl-8 pr-9 md:pr-11 bg-surface-lowest rounded-lg text-base sm:text-xs text-on-surface placeholder:text-on-surface-variant/50 outline-none border border-outline-variant focus:border-on-surface transition-colors"
            id="search-input"
          />
          {searchQuery ? (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-surface-container text-on-surface-variant cursor-pointer"
              onClick={() => onSearchChange('')}
            >
              <X size={13} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-outline-variant bg-surface-low px-1 py-0.5 font-mono text-[10px] text-on-surface-variant/60">
              ⌘K
            </kbd>
          )}
        </div>

        {/* All / Pinned Filter Pills */}
        <div className="flex items-center gap-1 px-0.5">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
              filterMode === 'all' && !activeTag
                ? 'bg-on-surface text-surface'
                : 'text-on-surface-variant hover:bg-surface-high/60 hover:text-on-surface'
            }`}
          >
            All ({notes.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('pinned')}
            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
              filterMode === 'pinned'
                ? 'bg-on-surface text-surface'
                : 'text-on-surface-variant hover:bg-surface-high/60 hover:text-on-surface'
            }`}
          >
            Pinned ({pinnedCount})
          </button>
        </div>

        {/* Tag Filter Row */}
        {allTags && allTags.length > 0 && (
          <div className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
            {activeTag && (
              <button
                type="button"
                onClick={() => onTagChange('')}
                className="shrink-0 rounded-md border border-outline-variant bg-surface-lowest px-1.5 py-0.5 font-mono text-[10px] text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                Clear
              </button>
            )}
            {allTags.map((tag) => {
              const isTagActive = activeTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagChange(isTagActive ? '' : tag)}
                  className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] transition-colors cursor-pointer border ${
                    isTagActive
                      ? 'border-on-surface bg-on-surface text-surface font-medium'
                      : 'border-outline-variant bg-surface-lowest text-on-surface-variant hover:border-on-surface/40 hover:text-on-surface'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes Feed */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
        {displayedNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
            <div className="w-10 h-10 rounded-xl border border-outline-variant bg-surface-lowest flex items-center justify-center mb-3">
              <FileText size={18} className="text-on-surface-variant/40" />
            </div>
            <p className="text-xs text-on-surface font-medium">
              {searchQuery
                ? 'No matching notes'
                : filterMode === 'pinned'
                ? 'No pinned notes yet'
                : 'Your notebook is empty'}
            </p>
            <p className="text-[11px] text-on-surface-variant/60 mt-1">
              {searchQuery
                ? 'Try a different keyword or tag'
                : filterMode === 'pinned'
                ? 'Pin important notes for quick access'
                : 'Click + New to write your first note'}
            </p>
          </div>
        )}

        {displayedNotes.map((note) => {
          const isSelected = activeNoteId === note.id;
          return (
            <button
              key={note.id}
              type="button"
              onClick={() => onSelectNote(note.id!)}
              className={`w-full text-left note-card ${
                isSelected ? 'note-card-active' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-on-surface flex items-center gap-1.5">
                  {note.isPinned && (
                    <Pin
                      size={10}
                      className="shrink-0 fill-on-surface text-on-surface"
                    />
                  )}
                  <span className="truncate">{note.title || 'Untitled'}</span>
                </span>
                <span className="shrink-0 font-mono text-[10px] text-on-surface-variant/60">
                  {note.updatedAt ? formatDate(note.updatedAt) : 'Now'}
                </span>
              </div>

              <p className="mt-1 line-clamp-1 text-[11px] text-on-surface-variant leading-relaxed">
                {getPreview(note.content)}
              </p>

              {note.tags && note.tags.length > 0 && (
                <div className="mt-2 flex items-center gap-1 overflow-hidden">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[9px] text-on-surface-variant"
                    >
                      #{tag}
                    </span>
                  ))}
                  {note.tags.length > 3 && (
                    <span className="font-mono text-[9px] text-on-surface-variant/50">
                      +{note.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Footer Section */}
      <div className="border-t border-outline-variant p-3 space-y-1 bg-surface-low">
        {/* Trash Accordion */}
        <button
          type="button"
          className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg hover:bg-surface-container transition-colors text-xs cursor-pointer"
          onClick={() => setShowTrash(!showTrash)}
        >
          <Trash2 size={13} className="text-on-surface-variant/70" />
          <span className="flex-1 text-left text-on-surface-variant font-medium">
            Trash ({trashedNotes.length})
          </span>
          {showTrash ? (
            <ChevronDown size={13} className="text-on-surface-variant/50" />
          ) : (
            <ChevronRight size={13} className="text-on-surface-variant/50" />
          )}
        </button>

        {showTrash && (
          <div className="pl-2 pr-1 py-1 max-h-[180px] overflow-y-auto space-y-1">
            {trashedNotes.length === 0 && (
              <div className="text-[11px] text-on-surface-variant/40 px-2 py-1.5 italic">
                Trash is empty
              </div>
            )}
            {trashedNotes.map((note) => (
              <div
                key={note.id}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-lowest border border-outline-variant/60"
              >
                <div className="flex-1 min-w-0 text-[11px] text-on-surface-variant truncate">
                  {note.title || 'Untitled'}
                </div>
                <button
                  type="button"
                  className="icon-btn !w-6 !h-6 !rounded text-on-surface-variant hover:text-on-surface"
                  onClick={() => onRestoreNote(note.id!)}
                  title="Restore note"
                >
                  <RotateCcw size={11} />
                </button>
                <button
                  type="button"
                  className="icon-btn !w-6 !h-6 !rounded text-on-surface-variant hover:text-on-surface"
                  onClick={() => onPermanentDelete(note.id!)}
                  title="Delete permanently"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Settings + Sync Status Row */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container transition-colors text-xs text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            <Settings size={13} />
            <span className="font-medium">Settings</span>
          </button>

          <span className="flex items-center gap-1 px-2 font-mono text-[10px] text-on-surface-variant/60">
            <Cloud size={11} />
            Synced
          </span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
