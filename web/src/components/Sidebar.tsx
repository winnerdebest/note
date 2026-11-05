'use client';

import React, { useState } from 'react';
import { Plus, Settings, Search, Trash2, RotateCcw, X, ChevronDown, ChevronRight, FileText } from 'lucide-react';

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
  const [showTrash, setShowTrash] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);

  const getPreview = (content: string) => {
    if (!content) return 'Empty note';
    return content.replace(/[#*_~`>\-\[\]]/g, '').slice(0, 55) + (content.length > 55 ? '…' : '');
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
    <aside className="w-full md:w-[320px] h-full bg-surface-low flex flex-col text-on-surface-variant overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-inter font-bold text-lg text-on-surface tracking-tight">Notes</h1>
          <button
            onClick={onNewNote}
            className="icon-btn !w-auto px-3 gap-1.5 text-primary font-semibold text-xs"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative" id="search-container">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-surface-container/60 rounded-lg text-[0.8125rem] text-on-surface placeholder:text-on-surface-variant/35 outline-none focus:bg-surface-container focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:border-primary/20"
            id="search-input"
          />
          {searchQuery && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-surface-high text-on-surface-variant/50"
              onClick={() => onSearchChange('')}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Tag Filter */}
      {allTags && allTags.length > 0 && (
        <div className="px-4 pb-2">
          <button
            className="flex items-center gap-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-on-surface-variant/50 hover:text-on-surface-variant transition-colors mb-1.5"
            onClick={() => setShowTagFilter(!showTagFilter)}
          >
            {showTagFilter ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            Tags
          </button>
          {showTagFilter && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              <button
                className={`tag-pill cursor-pointer text-[0.625rem] ${!activeTag ? '' : 'opacity-40 hover:opacity-70'}`}
                onClick={() => onTagChange('')}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  className={`tag-pill cursor-pointer text-[0.625rem] ${activeTag === tag ? '' : 'opacity-40 hover:opacity-70'}`}
                  onClick={() => onTagChange(activeTag === tag ? '' : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {notes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center mb-3">
              <FileText size={22} className="text-on-surface-variant/30" />
            </div>
            <p className="text-sm text-on-surface-variant/50 font-medium">
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </p>
            <p className="text-xs text-on-surface-variant/30 mt-1">
              {searchQuery ? 'Try a different search' : 'Tap + to create one'}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-0.5">
          {notes.map((note, index) => (
            <div
              key={note.id}
              className={`note-card ${activeNoteId === note.id ? 'note-card-active' : ''}`}
              onClick={() => onSelectNote(note.id!)}
              style={{ animation: `slide-up 0.2s ease ${index * 0.03}s both` }}
            >
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <div className="font-semibold text-[0.8125rem] text-on-surface truncate leading-snug">
                  {note.isPinned && <span className="text-primary mr-1 text-xs">●</span>}
                  {note.title || 'Untitled'}
                </div>
                <span className="text-[0.625rem] text-on-surface-variant/40 whitespace-nowrap mt-0.5 flex-shrink-0">
                  {note.updatedAt && formatDate(note.updatedAt)}
                </span>
              </div>
              <div className="text-[0.75rem] text-on-surface-variant/50 truncate leading-relaxed">
                {getPreview(note.content)}
              </div>
              {note.tags && note.tags.length > 0 && (
                <div className="flex gap-1 mt-1.5 overflow-hidden">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="tag-pill" style={{ fontSize: '0.5625rem', padding: '1px 6px' }}>
                      {tag}
                    </span>
                  ))}
                  {note.tags.length > 3 && (
                    <span className="text-[0.5625rem] text-on-surface-variant/30 self-center">+{note.tags.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-outline-variant/15 p-3 space-y-0.5">
        {/* Trash */}
        <button
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-surface-container transition-colors text-[0.8125rem]"
          onClick={() => setShowTrash(!showTrash)}
        >
          <Trash2 size={15} className="opacity-50" />
          <span className="flex-1 text-left text-on-surface-variant/70">Trash</span>
          {trashedNotes.length > 0 && (
            <span className="text-[0.625rem] bg-surface-container px-1.5 py-0.5 rounded-full text-on-surface-variant/50 font-medium">
              {trashedNotes.length}
            </span>
          )}
          {showTrash ? <ChevronDown size={13} className="opacity-30" /> : <ChevronRight size={13} className="opacity-30" />}
        </button>

        {showTrash && (
          <div className="pl-2 max-h-[200px] overflow-y-auto">
            {trashedNotes.length === 0 && (
              <div className="text-[0.6875rem] text-on-surface-variant/30 px-3 py-2 italic">Empty</div>
            )}
            {trashedNotes.map((note) => (
              <div key={note.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-container/50">
                <div className="flex-1 min-w-0 text-[0.75rem] text-on-surface-variant/50 truncate">
                  {note.title || 'Untitled'}
                </div>
                <button
                  className="icon-btn !w-6 !h-6 !rounded-md text-primary/60 hover:text-primary"
                  onClick={() => onRestoreNote(note.id!)}
                  title="Restore"
                >
                  <RotateCcw size={12} />
                </button>
                <button
                  className="icon-btn !w-6 !h-6 !rounded-md text-error/50 hover:text-error"
                  onClick={() => onPermanentDelete(note.id!)}
                  title="Delete forever"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Settings */}
        <button
          onClick={() => window.location.href = '/settings'}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-surface-container transition-colors text-[0.8125rem]"
        >
          <Settings size={15} className="opacity-50" />
          <span className="text-on-surface-variant/70">Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
