'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Trash2,
  Pin,
  Eye,
  Code2,
  ArrowLeft,
  MoreHorizontal,
  Tag,
  Copy,
  Download,
  Heading2,
  Bold,
  Italic,
  Quote,
  ListTodo,
  Code,
  Feather,
} from 'lucide-react';
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
  onNewNote?: () => void;
}

/**
 * Converts inline Markdown (**bold**, *italic*, `code`) into clean HTML
 * for the live Visual Editor so the user never sees ** or ` characters.
 */
function inlineMarkdownToHtml(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return html;
}

/**
 * Converts a full Markdown string into editable Visual DOM blocks.
 */
function markdownToVisualHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) {
    return '<p><br></p>';
  }

  const lines = markdown.split('\n');
  return lines
    .map((line) => {
      // Checklist item: - [ ] or - [x]
      const todoMatch = line.match(/^\s*[-*]\s+\[([ xX])\]\s*(.*)$/);
      if (todoMatch) {
        const isDone = todoMatch[1].toLowerCase() === 'x';
        const itemHtml = inlineMarkdownToHtml(todoMatch[2]) || '<br>';
        return `<div class="ve-task" data-task="true" data-checked="${
          isDone ? 'true' : 'false'
        }"><button type="button" contenteditable="false" class="ve-checkbox" tabindex="-1" aria-label="Toggle task"></button><span class="ve-task-text">${itemHtml}</span></div>`;
      }

      // Headings
      if (/^###\s+/.test(line)) {
        const inner = inlineMarkdownToHtml(line.replace(/^###\s+/, '')) || '<br>';
        return `<h3>${inner}</h3>`;
      }
      if (/^##\s+/.test(line)) {
        const inner = inlineMarkdownToHtml(line.replace(/^##\s+/, '')) || '<br>';
        return `<h2>${inner}</h2>`;
      }
      if (/^#\s+/.test(line)) {
        const inner = inlineMarkdownToHtml(line.replace(/^#\s+/, '')) || '<br>';
        return `<h1>${inner}</h1>`;
      }

      // Blockquote
      if (/^>\s?/.test(line)) {
        const inner = inlineMarkdownToHtml(line.replace(/^>\s?/, '')) || '<br>';
        return `<blockquote>${inner}</blockquote>`;
      }

      // Empty line
      if (!line.trim()) {
        return '<p><br></p>';
      }

      return `<p>${inlineMarkdownToHtml(line)}</p>`;
    })
    .join('');
}

/**
 * Serializes the live Visual Editor DOM back into clean Markdown
 * for storage, sync, and optional "Show Syntax" mode.
 */
function serializeInlineNodes(parent: Node): string {
  let out = '';
  parent.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      out += (child.textContent || '').replace(/\u200B/g, '');
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const tag = el.tagName.toUpperCase();
      if (el.classList.contains('ve-checkbox')) {
        return;
      }
      if (tag === 'BR') {
        return;
      }
      const inner = serializeInlineNodes(el);
      if (!inner) return;

      if (tag === 'CODE') {
        out += `\`${inner}\``;
      } else if (tag === 'STRONG' || tag === 'B') {
        out += `**${inner}**`;
      } else if (tag === 'EM' || tag === 'I') {
        out += `*${inner}*`;
      } else {
        out += inner;
      }
    }
  });
  return out;
}

function visualDomToMarkdown(root: HTMLElement): string {
  const lines: string[] = [];

  if (root.childNodes.length === 0) {
    return '';
  }

  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || '').replace(/\u200B/g, '');
      if (text) lines.push(text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();

    if (el.getAttribute('data-task') === 'true' || el.classList.contains('ve-task')) {
      const checked = el.getAttribute('data-checked') === 'true';
      const textContainer = el.querySelector('.ve-task-text') || el;
      const text = serializeInlineNodes(textContainer);
      lines.push(`- [${checked ? 'x' : ' '}] ${text}`);
      return;
    }

    if (tag === 'H1') {
      lines.push(`# ${serializeInlineNodes(el)}`);
      return;
    }
    if (tag === 'H2') {
      lines.push(`## ${serializeInlineNodes(el)}`);
      return;
    }
    if (tag === 'H3') {
      lines.push(`### ${serializeInlineNodes(el)}`);
      return;
    }
    if (tag === 'BLOCKQUOTE') {
      lines.push(`> ${serializeInlineNodes(el)}`);
      return;
    }

    lines.push(serializeInlineNodes(el));
  });

  // Trim trailing empty line if the editor only contains a single empty paragraph
  if (lines.length === 1 && lines[0] === '') {
    return '';
  }
  return lines.join('\n');
}

const Editor: React.FC<EditorProps> = ({ note, onSave, onDelete, onBack, onNewNote }) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [tagInput, setTagInput] = useState('');
  // Default is 'visual' (hides ** and ` while typing). 'syntax' reveals raw Markdown characters.
  const [showSyntax, setShowSyntax] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);

  // Active formatting states in Visual mode so toolbar buttons show when a format is active
  const [activeFormats, setActiveFormats] = useState({
    heading: false,
    bold: false,
    italic: false,
    quote: false,
    checklist: false,
    code: false,
  });

  const noteRef = useRef(note);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  // Sync state & populate Visual Editor when switching notes
  useEffect(() => {
    const nextTitle = note?.title || '';
    const nextContent = note?.content || '';
    const nextTags = note?.tags || [];

    setTitle(nextTitle);
    setContent(nextContent);
    setTags(nextTags);
    setSaveStatus('saved');
    setShowActions(false);

    if (visualRef.current) {
      visualRef.current.innerHTML = markdownToVisualHtml(nextContent);
    }
  }, [note?.id]);

  // Populate Visual Editor when toggling from Show Syntax -> Visual mode
  useEffect(() => {
    if (!showSyntax && visualRef.current) {
      visualRef.current.innerHTML = markdownToVisualHtml(content);
    }
  }, [showSyntax]);

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

  const { debouncedFn: debouncedSave, flush: flushSave } = useDebounce(autoSaveCallback, 1200);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSaveStatus('unsaved');
    debouncedSave(val, content, tags);
  };

  const handleContentChange = useCallback(
    (val: string) => {
      setContent(val);
      setSaveStatus('unsaved');
      debouncedSave(title, val, tags);
    },
    [title, tags, debouncedSave]
  );

  const syncVisualToState = useCallback(() => {
    if (!visualRef.current) return;
    const md = visualDomToMarkdown(visualRef.current);
    handleContentChange(md);
  }, [handleContentChange]);

  // Detect active formatting at current cursor position in Visual Editor
  const updateActiveFormats = useCallback(() => {
    if (showSyntax || !visualRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let node: Node | null = sel.anchorNode;
    if (!node || !visualRef.current.contains(node)) return;

    let heading = false;
    let quote = false;
    let checklist = false;
    let code = false;

    let curr: Node | null = node;
    while (curr && curr !== visualRef.current) {
      if (curr.nodeType === Node.ELEMENT_NODE) {
        const el = curr as HTMLElement;
        const tag = el.tagName.toUpperCase();
        if (tag === 'H1' || tag === 'H2' || tag === 'H3') heading = true;
        if (tag === 'BLOCKQUOTE') quote = true;
        if (el.getAttribute('data-task') === 'true' || el.classList.contains('ve-task')) {
          checklist = true;
        }
        if (tag === 'CODE') code = true;
      }
      curr = curr.parentNode;
    }

    let bold = false;
    let italic = false;
    try {
      bold = document.queryCommandState('bold');
      italic = document.queryCommandState('italic');
    } catch {
      // ignore
    }

    setActiveFormats({ heading, bold, italic, quote, checklist, code });
  }, [showSyntax]);

  useEffect(() => {
    const onSelectionChange = () => updateActiveFormats();
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [updateActiveFormats]);

  const handleForceSave = useCallback(() => {
    const latestContent =
      !showSyntax && visualRef.current ? visualDomToMarkdown(visualRef.current) : content;
    if (!title.trim() && !latestContent.trim()) return;
    flushSave(title, latestContent, tags);
  }, [title, content, tags, showSyntax, flushSave]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleForceSave();
      }
      if (ctrl && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setShowSyntax((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleForceSave]);

  const handleAddTag = () => {
    const newTag = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (newTag && !tags.includes(newTag)) {
      const newTags = [...tags, newTag];
      setTags(newTags);
      setTagInput('');
      setSaveStatus('unsaved');
      debouncedSave(title, content, newTags);
    } else {
      setTagInput('');
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

  // Raw Markdown snippet insertion (only used when "Show Syntax" is turned ON)
  const insertRawSnippet = (prefix: string, suffix = '', placeholder = 'text') => {
    const el = textareaRef.current;
    if (!el) {
      const next = `${content}${
        content.endsWith('\n') || !content ? '' : '\n'
      }${prefix}${placeholder}${suffix}`;
      handleContentChange(next);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const next = content.slice(0, start) + prefix + selected + suffix + content.slice(end);
    handleContentChange(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  // Helper to get the top-level block inside visualRef containing the current selection
  const getCurrentBlock = (): HTMLElement | null => {
    if (!visualRef.current) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.anchorNode;
    if (!node || !visualRef.current.contains(node)) return null;
    if (node === visualRef.current) {
      const idx = Math.min(sel.anchorOffset, visualRef.current.childNodes.length - 1);
      return (visualRef.current.childNodes[idx] as HTMLElement) || null;
    }
    while (node && node.parentNode !== visualRef.current) {
      node = node.parentNode;
    }
    return (node as HTMLElement) || null;
  };

  const placeCaretAtEnd = (el: Node) => {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  // ===== Toolbar Actions (Visual Mode vs Show Syntax Mode) =====
  const handleFormatHeading = () => {
    if (showSyntax) {
      insertRawSnippet('## ', '', 'Heading');
      return;
    }
    if (!visualRef.current) return;
    visualRef.current.focus();
    const block = getCurrentBlock();
    if (block && block.tagName.toUpperCase() === 'H2') {
      document.execCommand('formatBlock', false, 'p');
    } else {
      document.execCommand('formatBlock', false, 'h2');
    }
    updateActiveFormats();
    syncVisualToState();
  };

  const handleFormatBold = () => {
    if (showSyntax) {
      insertRawSnippet('**', '**', 'bold');
      return;
    }
    if (!visualRef.current) return;
    visualRef.current.focus();
    document.execCommand('bold', false);
    updateActiveFormats();
    syncVisualToState();
  };

  const handleFormatItalic = () => {
    if (showSyntax) {
      insertRawSnippet('*', '*', 'italic');
      return;
    }
    if (!visualRef.current) return;
    visualRef.current.focus();
    document.execCommand('italic', false);
    updateActiveFormats();
    syncVisualToState();
  };

  const handleFormatQuote = () => {
    if (showSyntax) {
      insertRawSnippet('> ', '', 'Quote');
      return;
    }
    if (!visualRef.current) return;
    visualRef.current.focus();
    const block = getCurrentBlock();
    if (block && block.tagName.toUpperCase() === 'BLOCKQUOTE') {
      document.execCommand('formatBlock', false, 'p');
    } else {
      document.execCommand('formatBlock', false, 'blockquote');
    }
    updateActiveFormats();
    syncVisualToState();
  };

  const handleFormatChecklist = () => {
    if (showSyntax) {
      insertRawSnippet('- [ ] ', '', 'Task item');
      return;
    }
    if (!visualRef.current) return;
    visualRef.current.focus();
    const block = getCurrentBlock();

    if (block && (block.getAttribute('data-task') === 'true' || block.classList.contains('ve-task'))) {
      // Convert checklist item back to normal paragraph
      const textEl = block.querySelector('.ve-task-text') || block;
      const p = document.createElement('p');
      p.innerHTML = textEl.innerHTML || '<br>';
      block.replaceWith(p);
      placeCaretAtEnd(p);
    } else {
      const taskDiv = document.createElement('div');
      taskDiv.className = 've-task';
      taskDiv.setAttribute('data-task', 'true');
      taskDiv.setAttribute('data-checked', 'false');

      const checkbox = document.createElement('button');
      checkbox.type = 'button';
      checkbox.contentEditable = 'false';
      checkbox.className = 've-checkbox';
      checkbox.tabIndex = -1;

      const textSpan = document.createElement('span');
      textSpan.className = 've-task-text';
      textSpan.innerHTML = block && block.innerText.trim() ? block.innerHTML : '<br>';

      taskDiv.appendChild(checkbox);
      taskDiv.appendChild(textSpan);

      if (block) {
        block.replaceWith(taskDiv);
      } else {
        visualRef.current.appendChild(taskDiv);
      }
      placeCaretAtEnd(textSpan);
    }
    updateActiveFormats();
    syncVisualToState();
  };

  const handleFormatCode = () => {
    if (showSyntax) {
      insertRawSnippet('`', '`', 'code');
      return;
    }
    if (!visualRef.current) return;
    visualRef.current.focus();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    // Check if cursor is already inside a <code> element
    let node: Node | null = sel.anchorNode;
    let existingCode: HTMLElement | null = null;
    while (node && node !== visualRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName.toUpperCase() === 'CODE') {
        existingCode = node as HTMLElement;
        break;
      }
      node = node.parentNode;
    }

    if (existingCode) {
      // Step cursor outside the <code> pill so subsequent typing is normal text
      const spaceAfter = document.createTextNode('\u200B');
      existingCode.after(spaceAfter);
      const nextRange = document.createRange();
      nextRange.setStartAfter(spaceAfter);
      nextRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nextRange);
      // Clean up empty code element if user didn't type anything inside
      if (!existingCode.textContent?.replace(/\u200B/g, '').trim()) {
        existingCode.remove();
      }
      updateActiveFormats();
      syncVisualToState();
      return;
    }

    const selectedText = range.toString();
    const codeEl = document.createElement('code');
    codeEl.textContent = selectedText || '\u200B';
    range.deleteContents();
    range.insertNode(codeEl);

    const newRange = document.createRange();
    if (selectedText) {
      newRange.selectNodeContents(codeEl);
      newRange.collapse(false);
    } else {
      newRange.setStart(codeEl.firstChild!, 1);
      newRange.collapse(true);
    }
    sel.removeAllRanges();
    sel.addRange(newRange);

    updateActiveFormats();
    syncVisualToState();
  };

  // Handle checkbox clicks and keyboard ergonomics inside the Visual Editor
  const handleVisualClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('ve-checkbox')) {
      e.preventDefault();
      const taskRow = target.closest('.ve-task');
      if (taskRow) {
        const isChecked = taskRow.getAttribute('data-checked') === 'true';
        taskRow.setAttribute('data-checked', isChecked ? 'false' : 'true');
        syncVisualToState();
      }
    }
  };

  const handleVisualKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    // Exit inline <code> cleanly on ArrowRight at end or Enter
    let node: Node | null = sel.anchorNode;
    let activeCode: HTMLElement | null = null;
    while (node && node !== visualRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName.toUpperCase() === 'CODE') {
        activeCode = node as HTMLElement;
        break;
      }
      node = node.parentNode;
    }

    if (activeCode && e.key === 'ArrowRight' && sel.isCollapsed) {
      const textLen = (sel.anchorNode?.textContent || '').length;
      if (sel.anchorOffset >= textLen) {
        e.preventDefault();
        const afterNode = document.createTextNode('\u200B');
        activeCode.after(afterNode);
        const r = document.createRange();
        r.setStartAfter(afterNode);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        updateActiveFormats();
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      const block = getCurrentBlock();
      if (!block) return;

      // Pressing Enter inside a Checklist item creates the next checklist item (or exits if empty)
      if (block.getAttribute('data-task') === 'true' || block.classList.contains('ve-task')) {
        e.preventDefault();
        const textEl = block.querySelector('.ve-task-text') || block;
        const textContent = (textEl.textContent || '').replace(/\u200B/g, '').trim();

        if (!textContent) {
          // Empty checklist item -> convert to normal paragraph
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          block.replaceWith(p);
          placeCaretAtEnd(p);
        } else {
          // Create a new unchecked checklist item below
          const nextTask = document.createElement('div');
          nextTask.className = 've-task';
          nextTask.setAttribute('data-task', 'true');
          nextTask.setAttribute('data-checked', 'false');

          const checkbox = document.createElement('button');
          checkbox.type = 'button';
          checkbox.contentEditable = 'false';
          checkbox.className = 've-checkbox';
          checkbox.tabIndex = -1;

          const textSpan = document.createElement('span');
          textSpan.className = 've-task-text';
          textSpan.innerHTML = '<br>';

          nextTask.appendChild(checkbox);
          nextTask.appendChild(textSpan);
          block.after(nextTask);
          placeCaretAtEnd(textSpan);
        }
        updateActiveFormats();
        syncVisualToState();
        return;
      }

      // Pressing Enter at the end of a Heading or Quote starts a normal paragraph below
      const tag = block.tagName.toUpperCase();
      if (tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'BLOCKQUOTE') {
        e.preventDefault();
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        block.after(p);
        placeCaretAtEnd(p);
        updateActiveFormats();
        syncVisualToState();
        return;
      }
    }
  };

  const handleCopyMarkdown = () => {
    const md = `# ${title || 'Untitled'}\n\n${content}`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    setShowActions(false);
  };

  const handleDownloadMarkdown = () => {
    const md = `# ${title || 'Untitled'}\n\n${content}`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowActions(false);
  };

  const stats = useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars = content.length;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readingTime };
  }, [content]);

  const formattedUpdated = useMemo(() => {
    if (!note?.updatedAt) return 'Just now';
    const d = new Date(note.updatedAt);
    const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }, [note?.updatedAt]);

  // Empty state when no note is selected
  if (!note && !title && !content) {
    return (
      <main className="flex-1 h-full hidden md:flex flex-col bg-surface overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-sm text-center">
            <div className="w-12 h-12 rounded-2xl border border-outline-variant bg-surface-low flex items-center justify-center mx-auto mb-5">
              <Feather size={20} className="text-on-surface-variant" />
            </div>
            <h2 className="text-base font-semibold tracking-tight text-on-surface mb-1.5">
              Quiet workspace ready
            </h2>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
              Select a note from the sidebar or start a blank canvas. Everything saves automatically as you type.
            </p>
            {onNewNote && (
              <button
                type="button"
                onClick={onNewNote}
                className="lp-btn lp-btn-ink lp-btn-sm mb-6"
              >
                Start a New Note
              </button>
            )}
            <div className="flex items-center justify-center gap-4 text-[11px] text-on-surface-variant/70 font-mono">
              <span>
                <kbd className="px-1.5 py-0.5 border border-outline-variant bg-surface-low rounded text-[10px]">
                  Ctrl N
                </kbd>{' '}
                new
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 border border-outline-variant bg-surface-low rounded text-[10px]">
                  Ctrl K
                </kbd>{' '}
                search
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 border border-outline-variant bg-surface-low rounded text-[10px]">
                  Ctrl P
                </kbd>{' '}
                syntax
              </span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 h-full flex flex-col bg-surface overflow-hidden">
      {/* Studio Top Bar */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-6 md:px-8 py-2.5 md:py-3 border-b border-outline-variant/80 bg-surface">
        <div className="flex items-center gap-2 min-w-0 text-xs text-on-surface-variant">
          {onBack && (
            <button
              type="button"
              aria-label="Back to notes list"
              className="inline-flex md:hidden items-center gap-1 rounded-lg border border-outline-variant bg-surface-lowest px-2.5 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container active:scale-97 transition-all cursor-pointer shrink-0"
              onClick={onBack}
            >
              <ArrowLeft size={14} />
              <span>Notes</span>
            </button>
          )}
          <div className={`save-status save-status-${saveStatus} shrink-0`}>
            <span className="save-status-dot" />
            <span className="font-medium text-on-surface">
              {saveStatus === 'saving'
                ? 'Saving…'
                : saveStatus === 'saved'
                ? 'Saved'
                : 'Editing'}
            </span>
          </div>
          <span className="hidden sm:inline text-outline-variant">·</span>
          <span className="hidden sm:inline truncate">{formattedUpdated}</span>
          <span className="hidden md:inline text-outline-variant">·</span>
          <span className="hidden md:inline font-mono text-[11px] shrink-0">
            {stats.readingTime} min read
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Option to Hide or See Markdown Syntax (** / `) */}
          <div
            className="flex items-center gap-0.5 rounded-lg border border-outline-variant bg-surface-low p-0.5"
            title="Choose whether to hide or show raw Markdown symbols (** and `)"
          >
            <button
              type="button"
              onClick={() => setShowSyntax(false)}
              className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                !showSyntax
                  ? 'bg-surface-lowest text-on-surface shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Eye size={12} />
              <span>Visual</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSyntax(true)}
              className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                showSyntax
                  ? 'bg-surface-lowest text-on-surface shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Code2 size={12} />
              <span>Syntax</span>
            </button>
          </div>

          {/* Pin Toggle */}
          <button
            type="button"
            className={`icon-btn border ${
              note?.isPinned
                ? 'border-on-surface bg-on-surface text-surface hover:bg-on-surface/90 hover:text-surface'
                : 'border-outline-variant bg-surface-lowest'
            }`}
            title={note?.isPinned ? 'Unpin note' : 'Pin note'}
            onClick={() =>
              onSave({ ...note!, title, content, isPinned: !note?.isPinned, tags })
            }
          >
            <Pin size={14} className={note?.isPinned ? 'fill-current' : ''} />
          </button>

          {/* More Actions Menu */}
          <div className="relative">
            <button
              type="button"
              aria-label="More note actions"
              className="icon-btn border border-outline-variant bg-surface-lowest"
              onClick={() => setShowActions(!showActions)}
            >
              <MoreHorizontal size={15} />
            </button>
            {showActions && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowActions(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 bg-surface-lowest border border-outline-variant rounded-xl shadow-lg py-1.5 w-52 z-50">
                  <button
                    type="button"
                    className="flex items-center justify-between w-full px-3.5 py-2 text-xs text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                    onClick={() => {
                      setShowSyntax((prev) => !prev);
                      setShowActions(false);
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      <Code2 size={13} />
                      <span>{showSyntax ? 'Hide ** & ` Syntax' : 'Show ** & ` Syntax'}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                    onClick={handleCopyMarkdown}
                  >
                    <Copy size={13} />
                    <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                    onClick={handleDownloadMarkdown}
                  >
                    <Download size={13} />
                    <span>Export as .md</span>
                  </button>
                  {note?.id && (
                    <>
                      <div className="my-1 border-t border-outline-variant/70" />
                      <button
                        type="button"
                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-on-surface hover:bg-surface-container transition-colors cursor-pointer font-medium"
                        onClick={() => {
                          onDelete(note.id!);
                          setShowActions(false);
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Move to Trash</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Writing Canvas */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[740px] w-full mx-auto px-4 sm:px-8 md:px-12 py-5 sm:py-8 md:py-10 min-h-full flex flex-col">
          {/* Note Title */}
          <input
            type="text"
            className="font-inter text-xl sm:text-3xl font-semibold border-none outline-none text-on-surface bg-transparent w-full placeholder:text-on-surface-variant/30 tracking-tight"
            placeholder="Untitled note…"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
          />

          {/* Tags Row */}
          <div className="mt-3 mb-4 sm:mb-5 flex items-center gap-1.5 flex-wrap">
            {tags.map((tag) => (
              <span
                key={tag}
                onClick={() => handleRemoveTag(tag)}
                title="Click to remove tag"
                className="tag-pill tag-pill-removable"
              >
                <Tag size={10} />
                <span>{tag}</span>
                <span className="ml-0.5 opacity-50">×</span>
              </span>
            ))}
            <input
              type="text"
              className="bg-transparent outline-none font-mono text-base sm:text-[11px] text-on-surface-variant placeholder:text-on-surface-variant/40 min-w-[90px] py-0.5"
              placeholder={tags.length === 0 ? '+ Add #tags…' : '+ tag…'}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={handleAddTag}
            />
          </div>

          {/* Formatting Toolbar (works visually without ** or ` in Visual Mode) */}
          <div className="mb-4 sm:mb-5 flex flex-nowrap overflow-x-auto no-scrollbar items-center gap-1 pb-2.5 border-b border-outline-variant/60">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleFormatHeading}
              className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 sm:px-2 sm:py-1 text-xs sm:text-[11px] font-medium transition-colors cursor-pointer ${
                !showSyntax && activeFormats.heading
                  ? 'bg-on-surface text-surface'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
              title="Toggle Heading"
            >
              <Heading2 size={13} />
              <span>Heading</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleFormatBold}
              className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 sm:px-2 sm:py-1 text-xs sm:text-[11px] font-medium transition-colors cursor-pointer ${
                !showSyntax && activeFormats.bold
                  ? 'bg-on-surface text-surface'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
              title="Bold (Ctrl+B)"
            >
              <Bold size={13} />
              <span>Bold</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleFormatItalic}
              className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 sm:px-2 sm:py-1 text-xs sm:text-[11px] font-medium transition-colors cursor-pointer ${
                !showSyntax && activeFormats.italic
                  ? 'bg-on-surface text-surface'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
              title="Italic (Ctrl+I)"
            >
              <Italic size={13} />
              <span>Italic</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleFormatQuote}
              className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 sm:px-2 sm:py-1 text-xs sm:text-[11px] font-medium transition-colors cursor-pointer ${
                !showSyntax && activeFormats.quote
                  ? 'bg-on-surface text-surface'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
              title="Blockquote"
            >
              <Quote size={13} />
              <span>Quote</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleFormatChecklist}
              className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 sm:px-2 sm:py-1 text-xs sm:text-[11px] font-medium transition-colors cursor-pointer ${
                !showSyntax && activeFormats.checklist
                  ? 'bg-on-surface text-surface'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
              title="Checklist item"
            >
              <ListTodo size={13} />
              <span>Checklist</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleFormatCode}
              className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 sm:px-2 sm:py-1 text-xs sm:text-[11px] font-medium transition-colors cursor-pointer ${
                !showSyntax && activeFormats.code
                  ? 'bg-on-surface text-surface'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
              title="Inline Code"
            >
              <Code size={13} />
              <span>Code</span>
            </button>
          </div>

          {/* Content Area: Live Visual Editor (Default) vs Raw Syntax Mode (Optional) */}
          {!showSyntax ? (
            <div
              ref={visualRef}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Start writing… Click Bold, Code, Heading, or Checklist above to format without Markdown symbols."
              data-empty={!content.trim() ? 'true' : 'false'}
              onInput={syncVisualToState}
              onClick={handleVisualClick}
              onKeyDown={handleVisualKeyDown}
              onKeyUp={updateActiveFormats}
              className="visual-editor flex-1 w-full"
            />
          ) : (
            <textarea
              ref={textareaRef}
              className="flex-1 border-none outline-none resize-none w-full bg-transparent text-on-surface text-sm sm:text-[0.9375rem] font-mono leading-[1.8] placeholder:text-on-surface-variant/35"
              placeholder="Raw Markdown syntax mode (**bold**, `code`, ## Heading)…"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
            />
          )}
        </div>
      </div>

      {/* Studio Footer Bar */}
      <div className="word-count-bar border-t border-outline-variant/80 px-4 sm:px-6 md:px-12 bg-surface">
        <div className="flex items-center gap-2 sm:gap-3">
          <span>{stats.words} words</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">{stats.chars} chars</span>
          <span>·</span>
          <span>{stats.readingTime} min read</span>
        </div>
        <button
          type="button"
          onClick={() => setShowSyntax((prev) => !prev)}
          className="hover:text-on-surface transition-colors cursor-pointer"
          title="Click to toggle raw Markdown syntax visibility"
        >
          {showSyntax ? 'Syntax visible (** / `)' : 'Visual mode · Auto-saved'}
        </button>
      </div>
    </main>
  );
};

export default Editor;
