import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  Keyboard,
  AppState,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../lib/theme';
import {
  getLocalNote,
  upsertLocalNote,
  softDeleteLocalNote,
  Note,
} from '../../lib/db';
import { getUserId } from '../../lib/auth';
import { runSync } from '../../lib/sync';
import * as Haptics from 'expo-haptics';
import { Feather, Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';
import { RichEditor, actions } from 'react-native-pell-rich-editor';
import {
  markdownToHtml,
  htmlToMarkdown,
  applySyntaxEnterContinuation,
  toggleSyntaxFormat,
  getChecklistStats,
  FormatType,
} from '../../lib/markdown';

const generateId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [noteId] = useState(isNew ? generateId() : id);
  const [isNoteLoaded, setIsNoteLoaded] = useState(isNew);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visualHtml, setVisualHtml] = useState('');
  const [showSyntax, setShowSyntax] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [userId, setUserId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const [syntaxSelection, setSyntaxSelection] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });

  const richEditorRef = useRef<RichEditor>(null);
  const isEditorReadyRef = useRef(false);
  const visualHtmlRef = useRef('');
  const syntaxSelectionRef = useRef(syntaxSelection);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const tagsRef = useRef(tags);
  const isPinnedRef = useRef(isPinned);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);
  useEffect(() => {
    isPinnedRef.current = isPinned;
  }, [isPinned]);

  // Track keyboard height so the formatting toolbar docks directly on top of the keyboard
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadNote = async () => {
      const uid = await getUserId();
      if (uid && mounted) setUserId(uid);

      if (!isNew) {
        const local = await getLocalNote(id);
        if (local && mounted) {
          const cleanMd = htmlToMarkdown(local.content || '');
          const html = markdownToHtml(local.content || '');
          visualHtmlRef.current = html;
          contentRef.current = cleanMd;
          titleRef.current = local.title || '';
          setTitle(local.title || '');
          setContent(cleanMd);
          setVisualHtml(html);
          setIsPinned(local.is_pinned);
          setTags(local.tags || []);

          if (isEditorReadyRef.current && richEditorRef.current) {
            richEditorRef.current.setContentHTML(html);
          }
        }
      }
      if (mounted) {
        setIsNoteLoaded(true);
      }
    };
    loadNote();
    return () => {
      mounted = false;
    };
  }, [id, isNew]);

  const injectEditorEnhancements = useCallback(() => {
    if (!richEditorRef.current) return;
    richEditorRef.current.injectJavascript(`
      (function() {
        var content = document.querySelector('#content .pell-content') || document.querySelector('[contenteditable="true"]');
        if (!content) return;
        content.setAttribute('autocapitalize', 'sentences');
        content.setAttribute('autocorrect', 'on');
        content.setAttribute('spellcheck', 'true');
        content.autocapitalize = 'sentences';
        content.autocorrect = true;
        content.spellcheck = true;

        if (window.__notesEnhanced) return;
        window.__notesEnhanced = true;

        function notifyChange() {
          content.dispatchEvent(new Event('input', { bubbles: true }));
        }

        function createTaskEl(html, checked) {
          var div = document.createElement('div');
          div.className = 've-task';
          div.setAttribute('data-task', 'true');
          div.setAttribute('data-checked', checked ? 'true' : 'false');

          var cb = document.createElement('button');
          cb.type = 'button';
          cb.contentEditable = 'false';
          cb.className = 've-checkbox';

          var txt = document.createElement('span');
          txt.className = 've-task-text';
          txt.innerHTML = html || '<br/>';

          var acts = document.createElement('span');
          acts.className = 've-task-actions';
          acts.contentEditable = 'false';
          acts.innerHTML = '<button type="button" class="ve-move-btn ve-move-up">▲</button><button type="button" class="ve-move-btn ve-move-down">▼</button>';

          div.appendChild(cb);
          div.appendChild(txt);
          div.appendChild(acts);
          return div;
        }

        function placeCaretAtEnd(el) {
          var range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }

        function getCurrentBlock() {
          var sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) return null;
          var node = sel.anchorNode;
          while (node && node !== content) {
            if (node.nodeType === 1 && node.parentNode === content) return node;
            node = node.parentNode;
          }
          return null;
        }

        window.__toggleTaskBlock = function() {
          content.focus();
          var block = getCurrentBlock();
          if (block && block.classList && block.classList.contains('ve-task')) {
            var txtEl = block.querySelector('.ve-task-text') || block;
            var p = document.createElement('p');
            p.innerHTML = txtEl.innerHTML || '<br/>';
            block.replaceWith(p);
            placeCaretAtEnd(p);
          } else {
            var inner = (block && block.innerText && block.innerText.trim()) ? block.innerHTML : '<br/>';
            var task = createTaskEl(inner, false);
            if (block) {
              block.replaceWith(task);
            } else {
              content.appendChild(task);
            }
            placeCaretAtEnd(task.querySelector('.ve-task-text'));
          }
          notifyChange();
        };

        content.addEventListener('click', function(e) {
          var target = e.target;
          if (!target || !target.classList) return;

          if (target.classList.contains('ve-checkbox')) {
            e.preventDefault();
            e.stopPropagation();
            var task = target.closest('.ve-task');
            if (task) {
              var next = task.getAttribute('data-checked') !== 'true';
              task.setAttribute('data-checked', next ? 'true' : 'false');
              notifyChange();
            }
            return;
          }

          if (target.classList.contains('ve-move-up')) {
            e.preventDefault();
            e.stopPropagation();
            var taskUp = target.closest('.ve-task');
            if (taskUp && taskUp.previousElementSibling) {
              content.insertBefore(taskUp, taskUp.previousElementSibling);
              notifyChange();
            }
            return;
          }

          if (target.classList.contains('ve-move-down')) {
            e.preventDefault();
            e.stopPropagation();
            var taskDown = target.closest('.ve-task');
            if (taskDown && taskDown.nextElementSibling) {
              content.insertBefore(taskDown.nextElementSibling, taskDown);
              notifyChange();
            }
            return;
          }
        });

        content.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            var block = getCurrentBlock();
            if (block && block.classList && block.classList.contains('ve-task')) {
              e.preventDefault();
              var txtEl = block.querySelector('.ve-task-text') || block;
              var plain = (txtEl.textContent || '').replace(/\\u200B/g, '').trim();
              if (!plain) {
                var p = document.createElement('p');
                p.innerHTML = '<br/>';
                block.replaceWith(p);
                placeCaretAtEnd(p);
              } else {
                var nextTask = createTaskEl('<br/>', false);
                block.after(nextTask);
                placeCaretAtEnd(nextTask.querySelector('.ve-task-text'));
              }
              notifyChange();
            }
          }
        });
      })();
    `);
  }, []);

  const handleEditorInitialized = useCallback(() => {
    isEditorReadyRef.current = true;
    if (visualHtmlRef.current && richEditorRef.current) {
      richEditorRef.current.setContentHTML(visualHtmlRef.current);
    }
    richEditorRef.current?.registerToolbar((items) => {
      const normalized = (items || []).map((item) =>
        typeof item === 'string' ? item : item.type
      );
      setActiveFormats(normalized);
    });
    setTimeout(injectEditorEnhancements, 80);
  }, [injectEditorEnhancements]);

  const toggleEditorMode = async (nextShowSyntax: boolean) => {
    if (nextShowSyntax === showSyntax) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (nextShowSyntax) {
      // Visual -> Syntax: serialize latest HTML to clean Markdown
      if (richEditorRef.current) {
        try {
          const latestHtml = await richEditorRef.current.getContentHtml();
          if (latestHtml !== undefined) {
            const md = htmlToMarkdown(latestHtml);
            setContent(md);
            contentRef.current = md;
          }
        } catch {
          // fallback to current content
        }
      }
      setShowSyntax(true);
    } else {
      // Syntax -> Visual: convert Markdown to visual HTML
      const html = markdownToHtml(contentRef.current);
      visualHtmlRef.current = html;
      setVisualHtml(html);
      setShowSyntax(false);
      setTimeout(() => {
        richEditorRef.current?.setContentHTML(html);
      }, 60);
    }
  };

  // Formatting actions for our Keyboard-Docked Studio Bar (works in both Visual & Syntax modes!)
  const applyFormat = async (type: FormatType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!showSyntax && richEditorRef.current) {
      if (type === 'todo') {
        richEditorRef.current.injectJavascript('window.__toggleTaskBlock && window.__toggleTaskBlock();');
        return;
      }

      // Toggle off block-level formats (H2, Quote, Code) back to normal paragraph
      if (type === 'h2' && activeFormats.includes(actions.heading2)) {
        richEditorRef.current.sendAction(actions.setParagraph, 'result');
        return;
      }
      if (type === 'quote' && activeFormats.includes(actions.blockquote)) {
        richEditorRef.current.sendAction(actions.setParagraph, 'result');
        return;
      }
      if (type === 'code' && activeFormats.includes(actions.code)) {
        richEditorRef.current.sendAction(actions.setParagraph, 'result');
        return;
      }

      const actionMap: Record<Exclude<FormatType, 'todo'>, string> = {
        bold: actions.setBold,
        italic: actions.setItalic,
        h2: actions.heading2,
        quote: actions.blockquote,
        bullet: actions.insertBulletsList,
        ordered: actions.insertOrderedList,
        code: actions.code,
        undo: actions.undo,
        redo: actions.redo,
      };
      richEditorRef.current.sendAction(actionMap[type], 'result');
      return;
    }

    // Syntax mode Markdown helpers (toggles prefixes & wraps selections cleanly)
    const { text: updated, selection: nextSel } = toggleSyntaxFormat(
      contentRef.current,
      syntaxSelectionRef.current,
      type
    );
    setContent(updated);
    contentRef.current = updated;
    setSyntaxSelection(nextSel);
    syntaxSelectionRef.current = nextSel;
  };

  const saveNote = useCallback(
    async (isManual = false) => {
      if (isManual && !showSyntax && richEditorRef.current) {
        try {
          const html = await richEditorRef.current.getContentHtml();
          if (html !== undefined) {
            const md = htmlToMarkdown(html);
            contentRef.current = md;
            setContent(md);
          }
        } catch (e) {
          console.warn('Could not get latest HTML from editor:', e);
        }
      }

      let activeUserId = userId;
      if (!activeUserId) {
        activeUserId = (await getUserId()) || '';
        if (activeUserId) setUserId(activeUserId);
      }

      if (!activeUserId) return;

      const currentTitle = titleRef.current;
      const currentContent = contentRef.current;

      if (!isManual && !currentTitle.trim() && !currentContent.trim()) return;

      setIsSaving(true);
      try {
        const now = new Date().toISOString();
        const noteData: Note = {
          id: noteId,
          title: currentTitle || 'Untitled',
          content: currentContent,
          is_pinned: isPinnedRef.current,
          created_at: now,
          updated_at: now,
          user_id: activeUserId,
          tags: tagsRef.current,
          deleted_at: null,
          sync_status: 'pending',
        };

        const existing = await getLocalNote(noteId);
        if (existing) noteData.created_at = existing.created_at;
        await upsertLocalNote(noteData);
      } catch (e) {
        console.error('Save error:', e);
      } finally {
        setTimeout(() => setIsSaving(false), 600);
      }
    },
    [noteId, userId, showSyntax]
  );

  useEffect(() => {
    if (!isNoteLoaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNote(false), 1800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [title, content, isPinned, tags, saveNote, isNoteLoaded]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') saveNote(false);
    });
    return () => sub.remove();
  }, [saveNote]);

  const handleBack = async () => {
    Keyboard.dismiss();
    await saveNote(true);
    runSync();
    router.back();
  };

  const handleMoveToTrash = () => {
    Alert.alert('Move to Trash', 'Move this note to the trash bin?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Move to Trash',
        style: 'destructive',
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await softDeleteLocalNote(noteId);
          runSync();
          Toast.show('Moved to trash', {
            duration: Toast.durations.SHORT,
            position: Toast.positions.BOTTOM,
            backgroundColor: colors.text,
            textColor: colors.background,
          });
          router.back();
        },
      },
    ]);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '').toLowerCase().replace(/\s+/g, '-');
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const stats = useMemo(() => {
    const clean = content.trim();
    const words = clean ? clean.split(/\s+/).length : 0;
    const readMins = Math.max(1, Math.ceil(words / 200));
    const tasks = getChecklistStats(content);
    return { words, readMins, tasks };
  }, [content]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Studio Top Bar */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Feather name="arrow-left" size={14} color={colors.text} />
          <Text style={[styles.backPillText, { color: colors.text }]}>Notes</Text>
        </TouchableOpacity>

        {/* Visual | Syntax Toggle Pill (Matches Web Studio) */}
        <View
          style={[
            styles.modeToggle,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.modeBtn,
              !showSyntax && { backgroundColor: colors.accent },
            ]}
            onPress={() => toggleEditorMode(false)}
          >
            <Feather
              name="eye"
              size={11}
              color={!showSyntax ? colors.accentText : colors.textSecondary}
            />
            <Text
              style={[
                styles.modeBtnText,
                { color: !showSyntax ? colors.accentText : colors.textSecondary },
              ]}
            >
              Visual
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeBtn,
              showSyntax && { backgroundColor: colors.accent },
            ]}
            onPress={() => toggleEditorMode(true)}
          >
            <Feather
              name="code"
              size={11}
              color={showSyntax ? colors.accentText : colors.textSecondary}
            />
            <Text
              style={[
                styles.modeBtnText,
                { color: showSyntax ? colors.accentText : colors.textSecondary },
              ]}
            >
              Syntax
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setIsPinned(!isPinned);
            }}
            style={[
              styles.iconBtn,
              {
                backgroundColor: isPinned ? colors.accent : colors.surface,
                borderColor: isPinned ? colors.accent : colors.border,
              },
            ]}
          >
            <Ionicons
              name={isPinned ? 'pin' : 'pin-outline'}
              size={15}
              color={isPinned ? colors.accentText : colors.textSecondary}
            />
          </TouchableOpacity>

          {!isNew && (
            <TouchableOpacity
              onPress={handleMoveToTrash}
              style={[
                styles.iconBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Feather name="trash-2" size={15} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={[
          styles.keyboardContainer,
          Platform.OS === 'android' && keyboardHeight > 0
            ? { paddingBottom: keyboardHeight }
            : null,
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Note Title */}
          <TextInput
            style={[styles.titleInput, { color: colors.text }]}
            placeholder="Untitled note…"
            placeholderTextColor={colors.textMuted + '70'}
            value={title}
            onChangeText={setTitle}
            multiline
            returnKeyType="next"
            autoCapitalize="sentences"
            autoCorrect={true}
            spellCheck={true}
          />

          {/* Tags Row */}
          <View style={styles.tagsRow}>
            {tags.map((tag, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.tagPill,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => handleRemoveTag(tag)}
              >
                <Text style={[styles.tagPillText, { color: colors.textSecondary }]}>
                  #{tag} ×
                </Text>
              </TouchableOpacity>
            ))}

            <TextInput
              style={[styles.tagInput, { color: colors.textSecondary }]}
              placeholder={tags.length === 0 ? '+ Add #tags…' : '+ tag…'}
              placeholderTextColor={colors.textMuted}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={handleAddTag}
              onBlur={handleAddTag}
              blurOnSubmit={false}
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Editor Canvas: Visual Mode vs Syntax Mode */}
          {!isNoteLoaded ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.text} />
            </View>
          ) : !showSyntax ? (
            <View style={styles.editorContainer}>
              <RichEditor
                key={`editor-${noteId}`}
                ref={richEditorRef}
                style={styles.richEditor}
                initialContentHTML={visualHtml}
                editorInitializedCallback={handleEditorInitialized}
                onChange={(html) => {
                  visualHtmlRef.current = html;
                  setVisualHtml(html);
                  setContent(htmlToMarkdown(html));
                }}
                placeholder="Write it down…"
                autoCapitalize="sentences"
                autoCorrect={true}
                editorStyle={{
                  backgroundColor: 'transparent',
                  contentCSSText: `
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    font-size: 16px;
                    line-height: 1.75;
                    color: ${colors.text};
                    padding: 0 0 80px 0;
                    caret-color: ${colors.text};
                  `,
                  cssText: `
                    .ve-task {
                      display: flex;
                      align-items: flex-start;
                      gap: 10px;
                      padding: 6px 8px;
                      margin: 4px 0;
                      border-radius: 10px;
                      background: ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
                    }
                    .ve-checkbox {
                      width: 20px;
                      height: 20px;
                      min-width: 20px;
                      margin-top: 3px;
                      border-radius: 6px;
                      border: 2px solid ${colors.textMuted};
                      background: transparent;
                      padding: 0;
                      position: relative;
                    }
                    .ve-task[data-checked="true"] .ve-checkbox {
                      background: ${colors.accent};
                      border-color: ${colors.accent};
                    }
                    .ve-task[data-checked="true"] .ve-checkbox::after {
                      content: "✓";
                      position: absolute;
                      inset: 0;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      color: ${colors.accentText};
                      font-size: 12px;
                      font-weight: 700;
                    }
                    .ve-task-text {
                      flex: 1;
                      min-width: 0;
                      outline: none;
                    }
                    .ve-task[data-checked="true"] .ve-task-text {
                      text-decoration: line-through;
                      opacity: 0.55;
                    }
                    .ve-task-actions {
                      display: flex;
                      align-items: center;
                      gap: 4px;
                      margin-top: 2px;
                    }
                    .ve-move-btn {
                      border: 1px solid ${colors.border};
                      background: ${colors.surface};
                      color: ${colors.textSecondary};
                      border-radius: 5px;
                      width: 22px;
                      height: 22px;
                      font-size: 9px;
                      line-height: 1;
                      padding: 0;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    }
                  `,
                  placeholderColor: colors.textMuted,
                }}
                initialHeight={380}
                useContainer={true}
              />
            </View>
          ) : (
            <TextInput
              style={[styles.syntaxInput, { color: colors.text }]}
              placeholder="Raw Markdown syntax (**bold**, `code`, ## Heading)…"
              placeholderTextColor={colors.textMuted}
              value={content}
              selection={syntaxSelection}
              onSelectionChange={(e) => {
                const sel = e.nativeEvent.selection;
                setSyntaxSelection(sel);
                syntaxSelectionRef.current = sel;
              }}
              onChangeText={(val) => {
                const result = applySyntaxEnterContinuation(
                  contentRef.current,
                  val,
                  syntaxSelectionRef.current.end
                );
                setContent(result.text);
                contentRef.current = result.text;
                if (typeof result.newCursor === 'number') {
                  const nextSel = { start: result.newCursor, end: result.newCursor };
                  setSyntaxSelection(nextSel);
                  syntaxSelectionRef.current = nextSel;
                }
              }}
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
              autoCorrect={true}
              spellCheck={true}
            />
          )}
        </ScrollView>

        {/* Keyboard-Docked Formatting Toolbar + Word Count Bar */}
        <View
          style={[
            styles.bottomDock,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
            },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={styles.formatBarContent}
          >
            {(
              [
                { key: 'bold', action: actions.setBold, icon: 'bold' as const },
                { key: 'italic', action: actions.setItalic, icon: 'italic' as const },
                { key: 'h2', action: actions.heading2, label: 'H2' },
                { key: 'todo', action: 'todo', icon: 'check-square' as const },
                { key: 'bullet', action: actions.insertBulletsList, icon: 'list' as const },
                { key: 'ordered', action: actions.insertOrderedList, label: '1.' },
                { key: 'quote', action: actions.blockquote, label: '“ ”' },
                { key: 'code', action: actions.code, icon: 'code' as const },
              ] as const
            ).map((btn) => {
              const isActive = !showSyntax && activeFormats.includes(btn.action);
              return (
                <TouchableOpacity
                  key={btn.key}
                  style={[
                    styles.formatBtn,
                    {
                      borderColor: isActive ? colors.accent : colors.border,
                      backgroundColor: isActive ? colors.accent : colors.card,
                    },
                  ]}
                  onPress={() => applyFormat(btn.key)}
                >
                  {'icon' in btn ? (
                    <Feather
                      name={btn.icon}
                      size={15}
                      color={isActive ? colors.accentText : colors.text}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.formatBtnLabel,
                        { color: isActive ? colors.accentText : colors.text },
                      ]}
                    >
                      {btn.label}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}

            {!showSyntax && (
              <>
                <TouchableOpacity
                  style={[styles.formatBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                  onPress={() => applyFormat('undo')}
                >
                  <Feather name="rotate-ccw" size={14} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formatBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                  onPress={() => applyFormat('redo')}
                >
                  <Feather name="rotate-cw" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </>
            )}

            {keyboardHeight > 0 && (
              <TouchableOpacity
                style={[styles.formatBtn, { borderColor: colors.border, backgroundColor: colors.accent }]}
                onPress={() => Keyboard.dismiss()}
              >
                <Feather name="chevron-down" size={15} color={colors.accentText} />
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={[styles.footerBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              {stats.words} words · {stats.readMins} min read
              {stats.tasks.total > 0 ? ` · ${stats.tasks.done}/${stats.tasks.total} tasks` : ''}
            </Text>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              {isSaving ? 'Saving…' : showSyntax ? 'Syntax mode' : 'Visual · Auto-saved'}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardContainer: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  backPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modeToggle: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 9,
    borderWidth: 1,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleInput: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 10,
    letterSpacing: -0.6,
    padding: 0,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  tagInput: {
    fontSize: 12,
    minWidth: 90,
    paddingVertical: 2,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  loadingBox: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editorContainer: {
    minHeight: 380,
    paddingBottom: 24,
  },
  richEditor: {
    backgroundColor: 'transparent',
    minHeight: 380,
  },
  syntaxInput: {
    minHeight: 380,
    fontSize: 14,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingBottom: 24,
  },
  bottomDock: {
    borderTopWidth: 1,
  },
  formatBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  formatBtn: {
    height: 34,
    minWidth: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
