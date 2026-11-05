'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Trash2, Pin, Eye, Edit3, ArrowLeft, MoreHorizontal } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface Note {
  id?: string;
  title: string;
  content: string;
  isPinned: boolean;
  updatedAt?: string;
  tags?: string[];
}

interface EditorProps {
  note: Note | null;
  onSave: (note: Note) => Promise<void>;
  onDelete: (id: string) => void;
  onBack?: () => void;
}

// Simple markdown renderer
function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^[*\-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  html = html
    .split('\n\n')
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^<(h[1-6]|ul|ol|li|blockquote|pre|hr)/.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  return html;
}

const Editor: React.FC<EditorProps> = ({ note, onSave, onDelete, onBack }) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showActions, setShowActions] = useState(false);
  const noteRef = useRef(note);

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags || []);
    } else {
      setTitle('');
      setContent('');
      setTags([]);
    }
    setSaveStatus('saved');
    setIsPreview(false);
    setShowActions(false);
  }, [note?.id]);

  const autoSaveCallback = useCallback(
    async (t: string, c: string, tg: string[]) => {
      if (!t.trim() && !c.trim()) return;
      setSaveStatus('saving');
      try {
        await onSave({
          ...noteRef.current,
          title: t,
          content: c,
          isPinned: noteRef.current?.isPinned || false,
          tags: tg,
        });
        setSaveStatus('saved');
      } catch {
        setSaveStatus('unsaved');
      }
    },
    [onSave]
  );

  const { debouncedFn: debouncedSave, flush: flushSave } = useDebounce(autoSaveCallback, 1500);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSaveStatus('unsaved');
    debouncedSave(val, content, tags);
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    setSaveStatus('unsaved');
    debouncedSave(title, val, tags);
  };

  const handleForceSave = useCallback(() => {
    if (!title.trim() && !content.trim()) return;
    flushSave(title, content, tags);
  }, [title, content, tags, flushSave]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 's') {
        e.preventDefault();
        handleForceSave();
      }
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsPreview((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleForceSave]);

  const handleAddTag = () => {
    const newTag = tagInput.trim().toLowerCase();
    if (newTag && !tags.includes(newTag)) {
      const newTags = [...tags, newTag];
      setTags(newTags);
      setTagInput('');
      setSaveStatus('unsaved');
      debouncedSave(title, content, newTags);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter((t) => t !== tagToRemove);
    setTags(newTags);
    setSaveStatus('unsaved');
    debouncedSave(title, content, newTags);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      handleRemoveTag(tags[tags.length - 1]);
    }
  };

  const stats = useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars = content.length;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readingTime };
  }, [content]);

  // Empty state — desktop only (on mobile the sidebar is shown instead)
  if (!note && !title && !content) {
    return (
      <main className="flex-1 h-full hidden md:flex flex-col bg-surface overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-surface-container/60 flex items-center justify-center mx-auto mb-5">
              <Edit3 size={28} className="text-on-surface-variant/20" />
            </div>
            <p className="text-on-surface-variant/40 text-sm font-medium mb-2">Select a note to start editing</p>
            <p className="text-on-surface-variant/25 text-xs">
              <kbd className="px-1.5 py-0.5 bg-surface-container rounded text-[0.625rem] font-mono">⌘N</kbd> new note
              &nbsp;·&nbsp;
              <kbd className="px-1.5 py-0.5 bg-surface-container rounded text-[0.625rem] font-mono">⌘K</kbd> search
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 h-full flex flex-col bg-surface overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-2.5 border-b border-outline-variant/10">
        <div className="flex items-center gap-2">
          {/* Back button — visible on mobile */}
          {onBack && (
            <button className="icon-btn md:hidden" onClick={onBack}>
              <ArrowLeft size={18} />
            </button>
          )}
          <div className={`save-status save-status-${saveStatus}`}>
            <span className="save-status-dot" />
            <span>{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Unsaved'}</span>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            className={`icon-btn ${isPreview ? '!bg-primary/10 !text-primary' : ''}`}
            title={isPreview ? 'Edit' : 'Preview'}
            onClick={() => setIsPreview(!isPreview)}
          >
            {isPreview ? <Edit3 size={16} /> : <Eye size={16} />}
          </button>
          <button
            className={`icon-btn ${note?.isPinned ? '!text-primary' : ''}`}
            title="Pin"
            onClick={() => onSave({ ...note!, title, content, isPinned: !note?.isPinned, tags })}
          >
            <Pin size={16} className={note?.isPinned ? 'fill-primary' : ''} />
          </button>

          {/* More actions menu */}
          <div className="relative">
            <button className="icon-btn" onClick={() => setShowActions(!showActions)}>
              <MoreHorizontal size={16} />
            </button>
            {showActions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-full mt-1 bg-surface-lowest border border-outline-variant/20 rounded-xl shadow-lg py-1 w-44 z-50" style={{ animation: 'slide-up 0.15s ease' }}>
                  <button
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[0.8125rem] hover:bg-surface-container transition-colors text-error"
                    onClick={() => { note?.id && onDelete(note.id); setShowActions(false); }}
                  >
                    <Trash2 size={14} />
                    Move to Trash
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] w-full mx-auto px-5 md:px-10 py-6 md:py-10 min-h-full flex flex-col">
          <input
            type="text"
            className="font-inter text-xl md:text-3xl font-bold border-none outline-none text-on-surface mb-1 bg-transparent w-full placeholder:text-on-surface/15 tracking-tight"
            placeholder="Untitled"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            readOnly={isPreview}
          />

          {/* Tags row */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {tags.map((tag) => (
              <span key={tag} className="tag-pill tag-pill-removable text-[0.625rem]" onClick={() => handleRemoveTag(tag)}>
                {tag} ×
              </span>
            ))}
            {!isPreview && (
              <input
                type="text"
                className="bg-transparent outline-none text-[0.6875rem] text-on-surface-variant/50 placeholder:text-on-surface-variant/25 min-w-[60px] py-0.5"
                placeholder={tags.length === 0 ? 'Add tags…' : '+'}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={handleAddTag}
              />
            )}
          </div>

          {/* Timestamp */}
          {note?.updatedAt && (
            <div className="text-[0.6875rem] text-on-surface-variant/35 mb-6 font-medium">
              {new Date(note.updatedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              {' · '}
              {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}

          {/* Content */}
          {isPreview ? (
            <div
              className="flex-1 markdown-preview"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          ) : (
            <textarea
              className="flex-1 border-none outline-none resize-none w-full bg-transparent text-on-surface text-[0.9375rem] md:text-base font-playfair leading-[1.85] placeholder:text-on-surface/10"
              placeholder="Start writing… (Supports Markdown)"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
            />
          )}
        </div>
      </div>

      {/* Word count */}
      <div className="word-count-bar border-t border-outline-variant/10 px-5 md:px-10">
        <span>{stats.words} words</span>
        <span>{stats.chars} chars</span>
        <span>{stats.readingTime} min read</span>
      </div>
    </main>
  );
};

export default Editor;
