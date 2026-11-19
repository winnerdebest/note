/**
 * Bidirectional Markdown <-> Visual HTML converters and Syntax-mode helpers
 * shared across the Mobile Studio Editor.
 */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function inlineMarkdownToHtml(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function buildTaskHtml(innerHtml: string, isDone: boolean): string {
  const checkedAttr = isDone ? 'true' : 'false';
  return (
    `<div class="ve-task" data-task="true" data-checked="${checkedAttr}">` +
    `<button type="button" contenteditable="false" class="ve-checkbox" aria-label="Toggle task"></button>` +
    `<span class="ve-task-text">${innerHtml || '<br/>'}</span>` +
    `<span class="ve-task-actions" contenteditable="false">` +
    `<button type="button" class="ve-move-btn ve-move-up" aria-label="Move task up">▲</button>` +
    `<button type="button" class="ve-move-btn ve-move-down" aria-label="Move task down">▼</button>` +
    `</span>` +
    `</div>`
  );
}

/**
 * Converts Markdown to Visual HTML, grouping consecutive <ul> and <ol> items
 * so list continuation and numbering work naturally in RichEditor.
 */
export function markdownToHtml(md: string): string {
  if (!md || !md.trim()) return '';
  // If already contains HTML block tags from legacy mobile edits, return as-is
  if (/<(p|div|h1|h2|h3|ul|ol|li|blockquote)\b/i.test(md)) {
    return md;
  }

  const lines = md.split('\n');
  const out: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];

  const flushList = () => {
    if (!listType || listItems.length === 0) return;
    out.push(`<${listType}>${listItems.map((item) => `<li>${item}</li>`).join('')}</${listType}>`);
    listType = null;
    listItems = [];
  };

  for (const line of lines) {
    // Checklist item: - [ ] or - [x]
    const todo = line.match(/^\s*[-*]\s+\[([ xX])\]\s*(.*)$/);
    if (todo) {
      flushList();
      const isDone = todo[1].toLowerCase() === 'x';
      out.push(buildTaskHtml(inlineMarkdownToHtml(todo[2]), isDone));
      continue;
    }

    // Bullet list item: - text or * text
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(inlineMarkdownToHtml(bullet[1]) || '<br/>');
      continue;
    }

    // Ordered list item: 1. text
    const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ordered) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listItems.push(inlineMarkdownToHtml(ordered[1]) || '<br/>');
      continue;
    }

    flushList();

    if (/^###\s+/.test(line)) {
      out.push(`<h3>${inlineMarkdownToHtml(line.replace(/^###\s+/, ''))}</h3>`);
    } else if (/^##\s+/.test(line)) {
      out.push(`<h2>${inlineMarkdownToHtml(line.replace(/^##\s+/, ''))}</h2>`);
    } else if (/^#\s+/.test(line)) {
      out.push(`<h1>${inlineMarkdownToHtml(line.replace(/^#\s+/, ''))}</h1>`);
    } else if (/^>\s?/.test(line)) {
      out.push(`<blockquote>${inlineMarkdownToHtml(line.replace(/^>\s?/, ''))}</blockquote>`);
    } else if (/^```/.test(line)) {
      out.push(`<pre>${escapeHtml(line.replace(/^```\w*/, ''))}</pre>`);
    } else if (!line.trim()) {
      out.push('<p><br/></p>');
    } else {
      out.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
    }
  }

  flushList();
  return out.join('');
}

function stripInlineHtmlToMarkdown(html: string): string {
  return html
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\u200B/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Converts Visual HTML from RichEditor back to clean Markdown.
 */
export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';
  if (!/<[a-z][\s\S]*>/i.test(html)) return html;

  let text = html;

  // Convert custom .ve-task blocks first
  text = text.replace(
    /<div[^>]*class="[^"]*ve-task[^"]*"[^>]*data-checked="(true|false)"[^>]*>([\s\S]*?)<\/div>/gi,
    (_m, checked, inner) => {
      const textMatch = inner.match(/<span[^>]*class="[^"]*ve-task-text[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      const taskBody = stripInlineHtmlToMarkdown(textMatch ? textMatch[1] : inner).trim();
      return `${checked === 'true' ? '- [x]' : '- [ ]'} ${taskBody}\n`;
    }
  );
  // Also handle data-checked before class attribute order
  text = text.replace(
    /<div[^>]*data-checked="(true|false)"[^>]*class="[^"]*ve-task[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    (_m, checked, inner) => {
      const textMatch = inner.match(/<span[^>]*class="[^"]*ve-task-text[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      const taskBody = stripInlineHtmlToMarkdown(textMatch ? textMatch[1] : inner).trim();
      return `${checked === 'true' ? '- [x]' : '- [ ]'} ${taskBody}\n`;
    }
  );

  // Convert <ol>...</ol> with sequential numbering
  text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, inner) => {
    let idx = 1;
    const items: string[] = [];
    inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_li: string, liBody: string) => {
      if (/<input[^>]*type=["']checkbox["'][^>]*>/i.test(liBody)) {
        const isChecked = /checked/i.test(liBody);
        const clean = stripInlineHtmlToMarkdown(liBody.replace(/<input[^>]*>/gi, '')).trim();
        items.push(`${isChecked ? '- [x]' : '- [ ]'} ${clean}`);
      } else {
        items.push(`${idx}. ${stripInlineHtmlToMarkdown(liBody).trim()}`);
        idx += 1;
      }
      return '';
    });
    return items.join('\n') + '\n';
  });

  // Convert <ul>...</ul>
  text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m, inner) => {
    const items: string[] = [];
    inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_li: string, liBody: string) => {
      if (/<input[^>]*type=["']checkbox["'][^>]*>/i.test(liBody)) {
        const isChecked = /checked/i.test(liBody);
        const clean = stripInlineHtmlToMarkdown(liBody.replace(/<input[^>]*>/gi, '')).trim();
        items.push(`${isChecked ? '- [x]' : '- [ ]'} ${clean}`);
      } else {
        items.push(`- ${stripInlineHtmlToMarkdown(liBody).trim()}`);
      }
      return '';
    });
    return items.join('\n') + '\n';
  });

  text = text
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_m, inner) => `# ${stripInlineHtmlToMarkdown(inner).trim()}\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, inner) => `## ${stripInlineHtmlToMarkdown(inner).trim()}\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, inner) => `### ${stripInlineHtmlToMarkdown(inner).trim()}\n`)
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, inner) => `> ${stripInlineHtmlToMarkdown(inner).trim()}\n`)
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, inner) => `\`\`\`\n${stripInlineHtmlToMarkdown(inner).trim()}\n\`\`\`\n`)
    .replace(/<li[^>]*>\s*<input[^>]*checked[^>]*>\s*([\s\S]*?)<\/li>/gi, (_m, inner) => `- [x] ${stripInlineHtmlToMarkdown(inner).trim()}\n`)
    .replace(/<li[^>]*>\s*<input[^>]*>\s*([\s\S]*?)<\/li>/gi, (_m, inner) => `- [ ] ${stripInlineHtmlToMarkdown(inner).trim()}\n`)
    .replace(/<div[^>]*>\s*<input[^>]*checked[^>]*>\s*([\s\S]*?)<\/div>/gi, (_m, inner) => `- [x] ${stripInlineHtmlToMarkdown(inner).trim()}\n`)
    .replace(/<div[^>]*>\s*<input[^>]*>\s*([\s\S]*?)<\/div>/gi, (_m, inner) => `- [ ] ${stripInlineHtmlToMarkdown(inner).trim()}\n`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, inner) => `- ${stripInlineHtmlToMarkdown(inner).trim()}\n`)
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\u200B/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * In Syntax Mode (TextInput), detects when the user just pressed Enter
 * and continues ordered lists (1. -> 2.), bullet lists (- ), or checklists (- [ ] ).
 * Pressing Enter on an empty list item exits the list cleanly.
 */
export function applySyntaxEnterContinuation(
  prevText: string,
  nextText: string,
  prevSelectionEnd?: number
): { text: string; newCursor?: number } {
  // Only trigger when a single newline was added
  if (nextText.length !== prevText.length + 1) {
    return { text: nextText };
  }

  let insertPos = -1;
  if (typeof prevSelectionEnd === 'number' && nextText[prevSelectionEnd] === '\n') {
    insertPos = prevSelectionEnd;
  } else {
    for (let i = 0; i < nextText.length; i++) {
      if (prevText[i] !== nextText[i]) {
        if (nextText[i] === '\n') insertPos = i;
        break;
      }
    }
  }

  if (insertPos === -1) return { text: nextText };

  const beforeNewline = nextText.slice(0, insertPos);
  const afterNewline = nextText.slice(insertPos + 1);
  const lineStart = beforeNewline.lastIndexOf('\n') + 1;
  const currentLine = beforeNewline.slice(lineStart);

  // 1. Checklist: - [ ] or - [x]
  const todoMatch = currentLine.match(/^(\s*)([-*]\s+\[[ xX]\]\s)(.*)$/);
  if (todoMatch) {
    const [, indent, , body] = todoMatch;
    if (!body.trim()) {
      const cleaned = beforeNewline.slice(0, lineStart) + afterNewline;
      return { text: cleaned, newCursor: lineStart };
    }
    const prefix = `${indent}- [ ] `;
    return {
      text: `${beforeNewline}\n${prefix}${afterNewline}`,
      newCursor: insertPos + 1 + prefix.length,
    };
  }

  // 2. Ordered list: 1. , 2. , ...
  const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/);
  if (orderedMatch) {
    const [, indent, numStr, body] = orderedMatch;
    if (!body.trim()) {
      const cleaned = beforeNewline.slice(0, lineStart) + afterNewline;
      return { text: cleaned, newCursor: lineStart };
    }
    const nextNum = parseInt(numStr, 10) + 1;
    const prefix = `${indent}${nextNum}. `;
    return {
      text: `${beforeNewline}\n${prefix}${afterNewline}`,
      newCursor: insertPos + 1 + prefix.length,
    };
  }

  // 3. Bullet list: - or *
  const bulletMatch = currentLine.match(/^(\s*)([-*]\s)(.*)$/);
  if (bulletMatch) {
    const [, indent, marker, body] = bulletMatch;
    if (!body.trim()) {
      const cleaned = beforeNewline.slice(0, lineStart) + afterNewline;
      return { text: cleaned, newCursor: lineStart };
    }
    const prefix = `${indent}${marker}`;
    return {
      text: `${beforeNewline}\n${prefix}${afterNewline}`,
      newCursor: insertPos + 1 + prefix.length,
    };
  }

  return { text: nextText };
}

export type FormatType =
  | 'bold'
  | 'italic'
  | 'h2'
  | 'quote'
  | 'todo'
  | 'bullet'
  | 'ordered'
  | 'code'
  | 'undo'
  | 'redo';

/**
 * Toggles Markdown formatting on the current line / selection in Syntax Mode.
 */
export function toggleSyntaxFormat(
  current: string,
  selection: { start: number; end: number },
  type: FormatType
): { text: string; selection: { start: number; end: number } } {
  const start = Math.max(0, Math.min(selection.start, current.length));
  const end = Math.max(start, Math.min(selection.end, current.length));

  // Inline formatting
  if (type === 'bold' || type === 'italic' || type === 'code') {
    const wrap = type === 'bold' ? '**' : type === 'italic' ? '*' : '`';
    const placeholder = type === 'bold' ? 'bold' : type === 'italic' ? 'italic' : 'code';
    const selected = current.slice(start, end);

    if (selected) {
      // Unwrap if already wrapped
      if (selected.startsWith(wrap) && selected.endsWith(wrap) && selected.length >= wrap.length * 2) {
        const unwrapped = selected.slice(wrap.length, -wrap.length);
        const next = current.slice(0, start) + unwrapped + current.slice(end);
        return { text: next, selection: { start, end: start + unwrapped.length } };
      }
      const wrapped = `${wrap}${selected}${wrap}`;
      const next = current.slice(0, start) + wrapped + current.slice(end);
      return { text: next, selection: { start: start + wrap.length, end: end + wrap.length } };
    }

    const snippet = `${wrap}${placeholder}${wrap}`;
    const next = current.slice(0, start) + snippet + current.slice(end);
    return {
      text: next,
      selection: { start: start + wrap.length, end: start + wrap.length + placeholder.length },
    };
  }

  // Block / line prefix toggling
  const lineStart = current.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const lineEndRaw = current.indexOf('\n', start);
  const lineEnd = lineEndRaw === -1 ? current.length : lineEndRaw;
  const line = current.slice(lineStart, lineEnd);

  const prefixMap: Partial<Record<FormatType, { prefix: string; regex: RegExp }>> = {
    h2: { prefix: '## ', regex: /^##\s+/ },
    quote: { prefix: '> ', regex: /^>\s?/ },
    todo: { prefix: '- [ ] ', regex: /^[-*]\s+\[[ xX]\]\s+/ },
    bullet: { prefix: '- ', regex: /^[-*]\s+(?!\[[ xX]\])/ },
    ordered: { prefix: '1. ', regex: /^\d+\.\s+/ },
  };

  const config = prefixMap[type];
  if (!config) return { text: current, selection };

  let updatedLine: string;
  let delta = 0;

  if (config.regex.test(line)) {
    // Toggle OFF
    const match = line.match(config.regex)!;
    updatedLine = line.slice(match[0].length);
    delta = -match[0].length;
  } else {
    // Strip any other block prefix first, then apply new prefix
    const stripped = line.replace(/^(#{1,6}\s+|>\s?|[-*]\s+\[[ xX]\]\s+|[-*]\s+|\d+\.\s+)/, '');
    const removedLen = line.length - stripped.length;
    updatedLine = `${config.prefix}${stripped}`;
    delta = config.prefix.length - removedLen;
  }

  const nextText = current.slice(0, lineStart) + updatedLine + current.slice(lineEnd);
  const nextCursor = Math.max(lineStart, start + delta);
  return { text: nextText, selection: { start: nextCursor, end: nextCursor } };
}

export function getChecklistStats(markdown: string): { total: number; done: number } {
  if (!markdown) return { total: 0, done: 0 };
  const matches = markdown.match(/^\s*[-*]\s+\[([ xX])\]/gm);
  if (!matches) return { total: 0, done: 0 };
  const done = matches.filter((m) => /\[[xX]\]/.test(m)).length;
  return { total: matches.length, done };
}
