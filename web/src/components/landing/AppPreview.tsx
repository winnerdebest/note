'use client';

import { useState } from 'react';
import {
  Search,
  Plus,
  Pin,
  Eye,
  Edit3,
  Check,
  FileText,
  Trash2,
  Tag,
  Cloud,
  ArrowLeft,
} from 'lucide-react';

interface DemoNote {
  id: string;
  title: string;
  updated: string;
  readTime: string;
  wordCount: string;
  pinned?: boolean;
  tags: string[];
  preview: string;
  blocks: {
    heading: string;
    quote: string;
    quoteAuthor: string;
    paragraph: string;
    tasks: { text: string; done: boolean }[];
  };
}

const DEMO_NOTES: DemoNote[] = [
  {
    id: 'focus',
    title: 'Principles of Quiet Work',
    updated: 'Just now',
    readTime: '2 min read',
    wordCount: '284 words',
    pinned: true,
    tags: ['essays', 'focus'],
    preview: 'Clarity comes when the page in front of you asks for nothing but your next thought…',
    blocks: {
      heading: '1. Clearing the Mental Desk',
      quote: 'Simplicity is about subtracting the obvious and adding the meaningful.',
      quoteAuthor: 'John Maeda',
      paragraph:
        'Great writing happens when your tools disappear. A clean white page, crisp type, and instant saving let you capture fleeting ideas before they fade.',
      tasks: [
        { text: 'Draft morning reflection before checking messages', done: true },
        { text: 'Outline the three-part essay on minimalist tools', done: true },
        { text: 'Review highlights from my phone on the train', done: false },
      ],
    },
  },
  {
    id: 'design',
    title: 'Notes on Timeless Design',
    updated: '14m ago',
    readTime: '3 min read',
    wordCount: '390 words',
    pinned: true,
    tags: ['design', 'craft'],
    preview: 'Good design is unobtrusive. Objects that serve us well leave room for life…',
    blocks: {
      heading: 'Why Restraint Matters',
      quote: 'Less, but better — because it concentrates on the essential aspects.',
      quoteAuthor: 'Dieter Rams',
      paragraph:
        'By keeping the canvas calm and monochrome, hierarchy and rhythm carry the entire page. Nothing competes with your words.',
      tasks: [
        { text: 'Collect visual references for the studio', done: true },
        { text: 'Finalize typography pairing for long-form reading', done: true },
        { text: 'Share reading list with the team', done: true },
      ],
    },
  },
  {
    id: 'journal',
    title: 'Weekly Synthesis & Reading List',
    updated: 'Yesterday',
    readTime: '4 min read',
    wordCount: '512 words',
    pinned: false,
    tags: ['journal', 'books'],
    preview: 'Jotting down chapters on the commute and expanding them at my desk…',
    blocks: {
      heading: 'Highlights From This Week',
      quote: 'We shape our tools, and thereafter our tools shape us.',
      quoteAuthor: 'Marshall McLuhan',
      paragraph:
        'Moving between my laptop and my phone now feels effortless. I can jot a quick voice thought or checklist offline on a flight, and it is waiting on my desktop when I land.',
      tasks: [
        { text: 'Finish reading Chapter 4 of The Creative Act', done: true },
        { text: 'Organize book quotes under #books', done: false },
        { text: 'Plan Sunday evening weekly review', done: false },
      ],
    },
  },
];

export default function AppPreview() {
  const [activeId, setActiveId] = useState<string>('focus');
  const [mode, setMode] = useState<'formatted' | 'markdown'>('formatted');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pinned'>('all');
  const [mobilePane, setMobilePane] = useState<'list' | 'editor'>('editor');

  const activeNote = DEMO_NOTES.find((n) => n.id === activeId) || DEMO_NOTES[0];
  const visibleNotes =
    activeFilter === 'pinned' ? DEMO_NOTES.filter((n) => n.pinned) : DEMO_NOTES;

  return (
    <div className="w-full rounded-2xl border border-neutral-200/90 bg-white shadow-[0_24px_70px_-20px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.03)] overflow-hidden">
      {/* Top Window Chrome */}
      <div className="flex items-center justify-between border-b border-neutral-200/80 bg-neutral-50/70 px-3.5 sm:px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border border-neutral-300 bg-white" />
            <span className="size-2.5 rounded-full border border-neutral-300 bg-white" />
            <span className="size-2.5 rounded-full border border-neutral-300 bg-white" />
          </div>
          <span className="hidden sm:inline mx-1.5 h-3.5 w-px bg-neutral-200" />
          <span className="font-mono text-[11px] text-neutral-500 tracking-tight truncate">
            Notes by Winner
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile Pane Switcher (visible only on < md) */}
          <div className="flex md:hidden items-center gap-0.5 rounded-lg border border-neutral-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setMobilePane('list')}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                mobilePane === 'list'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Notes ({DEMO_NOTES.length})
            </button>
            <button
              type="button"
              onClick={() => setMobilePane('editor')}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                mobilePane === 'editor'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Editor
            </button>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
            <span className="size-1.5 rounded-full bg-neutral-900" />
            Synced across devices
          </span>
          <span className="hidden md:inline-flex items-center rounded border border-neutral-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-neutral-400">
            Interactive Preview
          </span>
        </div>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 md:grid-cols-[270px_1fr] md:min-h-[440px] text-left">
        {/* Sidebar */}
        <div
          className={`${
            mobilePane === 'list' ? 'flex' : 'hidden md:flex'
          } border-b md:border-b-0 md:border-r border-neutral-200/80 bg-neutral-50/40 p-3.5 flex-col justify-between`}
        >
          <div>
            {/* Workspace Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <div className="flex size-5 items-center justify-center rounded bg-neutral-900 text-white">
                  <FileText size={11} />
                </div>
                <span className="text-xs font-semibold tracking-tight text-neutral-900">
                  All Notes
                </span>
                <span className="rounded-full bg-neutral-200/70 px-1.5 py-0.2 font-mono text-[10px] text-neutral-600">
                  {DEMO_NOTES.length}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 shadow-2xs">
                <Plus size={11} />
                New
              </span>
            </div>

            {/* Search Bar */}
            <div className="mb-3 flex h-8 items-center gap-2 rounded-lg border border-neutral-200/90 bg-white px-2.5 text-xs text-neutral-400">
              <Search size={12} className="text-neutral-400" />
              <span>Search notes or #tags…</span>
              <kbd className="ml-auto rounded border border-neutral-200 bg-neutral-50 px-1 py-0.5 font-mono text-[10px] text-neutral-400">
                ⌘K
              </kbd>
            </div>

            {/* Filter Pills */}
            <div className="mb-3 flex items-center gap-1 px-0.5">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-900'
                }`}
              >
                All ({DEMO_NOTES.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('pinned')}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                  activeFilter === 'pinned'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-900'
                }`}
              >
                Pinned (2)
              </button>
              <span className="ml-auto font-mono text-[10px] text-neutral-400">Click a note</span>
            </div>

            {/* Note Cards */}
            <div className="space-y-1.5">
              {visibleNotes.map((note) => {
                const isSelected = note.id === activeNote.id;
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => {
                      setActiveId(note.id);
                      setMobilePane('editor');
                    }}
                    className={`w-full text-left rounded-xl p-2.5 transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-white border-neutral-300 shadow-xs'
                        : 'bg-transparent border-transparent hover:bg-white/70 hover:border-neutral-200/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                        {note.pinned && <Pin size={10} className="shrink-0 fill-neutral-900 text-neutral-900" />}
                        <span className="truncate">{note.title}</span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-neutral-400">
                        {note.updated}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[11px] text-neutral-500 leading-relaxed">
                      {note.preview}
                    </p>
                    <div className="mt-2 flex items-center gap-1">
                      {note.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[9px] text-neutral-500"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="hidden md:flex items-center justify-between border-t border-neutral-200/70 pt-3 mt-4 px-1 text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Trash2 size={12} />
              Trash (0)
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <Cloud size={11} />
              Offline Ready
            </span>
          </div>
        </div>

        {/* Editor Area */}
        <div
          className={`${
            mobilePane === 'editor' ? 'flex' : 'hidden md:flex'
          } bg-white p-5 sm:p-8 lg:p-10 flex-col justify-between`}
        >
          <div>
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between gap-2 pb-4 sm:pb-5 mb-5 sm:mb-6 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-xs text-neutral-500 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobilePane('list')}
                  className="inline-flex md:hidden items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] font-medium text-neutral-800 hover:bg-neutral-100 cursor-pointer shrink-0"
                >
                  <ArrowLeft size={12} />
                  <span>Notes</span>
                </button>
                <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700 shrink-0">
                  <span className="size-1.5 rounded-full bg-neutral-900" />
                  Saved
                </span>
                <span className="hidden sm:inline text-neutral-300">·</span>
                <span className="hidden sm:inline">{activeNote.updated}</span>
                <span className="hidden md:inline text-neutral-300">·</span>
                <span className="hidden md:inline font-mono text-[11px]">{activeNote.readTime}</span>
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setMode('formatted')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                    mode === 'formatted'
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Eye size={12} />
                  Reader
                </button>
                <button
                  type="button"
                  onClick={() => setMode('markdown')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                    mode === 'markdown'
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Edit3 size={12} />
                  Markdown
                </button>
              </div>
            </div>

            {/* Note Title & Tags */}
            <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
              {activeNote.title}
            </h3>

            <div className="mt-3 mb-6 flex flex-wrap items-center gap-1.5">
              {activeNote.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 font-mono text-[11px] text-neutral-600"
                >
                  <Tag size={10} />
                  {tag}
                </span>
              ))}
            </div>

            {/* Note Body */}
            {mode === 'formatted' ? (
              <div className="space-y-4 text-sm leading-relaxed text-neutral-600">
                <blockquote className="border-l-2 border-neutral-900 pl-4 py-0.5 italic font-playfair text-base text-neutral-800">
                  &ldquo;{activeNote.blocks.quote}&rdquo;
                  <footer className="mt-1 not-italic font-inter text-xs text-neutral-400">
                    — {activeNote.blocks.quoteAuthor}
                  </footer>
                </blockquote>

                <h4 className="pt-1 text-sm font-semibold text-neutral-900 tracking-tight">
                  {activeNote.blocks.heading}
                </h4>

                <p className="text-neutral-600 leading-relaxed">{activeNote.blocks.paragraph}</p>

                <div className="space-y-2 pt-1">
                  {activeNote.blocks.tasks.map((task) => (
                    <div key={task.text} className="flex items-center gap-2.5 text-[13px]">
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                          task.done
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-300 bg-white'
                        }`}
                      >
                        {task.done && <Check size={10} strokeWidth={3} />}
                      </span>
                      <span className={task.done ? 'line-through text-neutral-400' : 'text-neutral-800'}>
                        {task.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <pre className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 font-mono text-xs leading-relaxed text-neutral-700 overflow-x-auto">
{`# ${activeNote.title}

> "${activeNote.blocks.quote}" — ${activeNote.blocks.quoteAuthor}

## ${activeNote.blocks.heading}
${activeNote.blocks.paragraph}

${activeNote.blocks.tasks.map((t) => `- [${t.done ? 'x' : ' '}] ${t.text}`).join('\n')}`}
              </pre>
            )}
          </div>

          {/* Editor Footer */}
          <div className="mt-8 pt-4 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-neutral-400">
            <span>{activeNote.wordCount} · {activeNote.readTime}</span>
            <span>Auto-saved</span>
          </div>
        </div>
      </div>
    </div>
  );
}
