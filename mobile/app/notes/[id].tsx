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
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';

const generateId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

/**
 * Bidirectional Markdown <-> Visual HTML converters so notes created on the
 * Web Studio and Android App render identically without raw ** or ` symbols.
 */
function markdownToHtml(md: string): string {
  if (!md || !md.trim()) return '';
  // If already contains HTML block tags from previous mobile edits, return as-is
  if (/<(p|div|h1|h2|h3|ul|ol|li|blockquote|b|strong|i|em|code)\b/i.test(md)) {
    return md;
  }

  const inline = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

  return md
    .split('\n')
    .map((line) => {
      if (/^###\s+/.test(line)) return `<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`;
      if (/^##\s+/.test(line)) return `<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`;
      if (/^#\s+/.test(line)) return `<h1>${inline(line.replace(/^#\s+/, ''))}</h1>`;
      if (/^>\s?/.test(line)) return `<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`;
      const todo = line.match(/^\s*[-*]\s+\[([ xX])\]\s*(.*)$/);
      if (todo) {
        const checked = todo[1].toLowerCase() === 'x' ? 'checked' : '';
        return `<div><input type="checkbox" ${checked}/> ${inline(todo[2])}</div>`;
      }
      if (!line.trim()) return '<p><br/></p>';
      return `<p>${inline(line)}</p>`;
    })
    .join('');
}

function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';
  // If it doesn't contain HTML tags, it's already raw Markdown
  if (!/<[a-z][\s\S]*>/i.test(html)) return html;

  let text = html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n')
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<li[^>]*>\s*<input[^>]*checked[^>]*>\s*([\s\S]*?)<\/li>/gi, '- [x] $1\n')
    .replace(/<li[^>]*>\s*<input[^>]*>\s*([\s\S]*?)<\/li>/gi, '- [ ] $1\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [noteId] = useState(isNew ? generateId() : id);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visualHtml, setVisualHtml] = useState('');
  const [showSyntax, setShowSyntax] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [userId, setUserId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const richEditorRef = useRef<RichEditor>(null);
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

  useEffect(() => {
    const loadNote = async () => {
      const uid = await getUserId();
      if (uid) setUserId(uid);

      if (!isNew) {
        const local = await getLocalNote(id);
        if (local) {
          const cleanMd = htmlToMarkdown(local.content);
          const html = markdownToHtml(local.content);
          setTitle(local.title);
          setContent(cleanMd);
          setVisualHtml(html);
          setIsPinned(local.is_pinned);
          setTags(local.tags || []);
        }
      }
    };
    loadNote();
  }, [id, isNew]);

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
      setVisualHtml(html);
      setShowSyntax(false);
      setTimeout(() => {
        richEditorRef.current?.setContentHTML(html);
      }, 50);
    }
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
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNote(false), 1800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [title, content, isPinned, tags, saveNote]);

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
    return { words, readMins };
  }, [content]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
        style={{ flex: 1 }}
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

          {/* Editor Canvas: Visual Mode (Hides ** & `) vs Syntax Mode */}
          {!showSyntax ? (
            <View style={styles.editorContainer}>
              <RichEditor
                ref={richEditorRef}
                style={styles.richEditor}
                initialContentHTML={visualHtml}
                onChange={(html) => {
                  setVisualHtml(html);
                  setContent(htmlToMarkdown(html));
                }}
                placeholder="Write it down…"
                editorStyle={{
                  backgroundColor: 'transparent',
                  contentCSSText: `
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    font-size: 16px;
                    line-height: 1.75;
                    color: ${colors.text};
                    padding: 0;
                    caret-color: ${colors.text};
                  `,
                  placeholderColor: colors.textMuted,
                }}
                initialHeight={420}
                useContainer={false}
              />
            </View>
          ) : (
            <TextInput
              style={[styles.syntaxInput, { color: colors.text }]}
              placeholder="Raw Markdown syntax (**bold**, `code`, ## Heading)…"
              placeholderTextColor={colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
            />
          )}
        </ScrollView>

        {/* Bottom Word Count + Rich Formatting Toolbar */}
        <View
          style={[
            styles.footerBar,
            { backgroundColor: colors.background, borderTopColor: colors.border },
          ]}
        >
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            {stats.words} words · {stats.readMins} min read
          </Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            {isSaving ? 'Saving…' : showSyntax ? 'Syntax mode' : 'Visual · Auto-saved'}
          </Text>
        </View>

        {!showSyntax && (
          <RichToolbar
            editor={richEditorRef}
            actions={[
              actions.heading2,
              actions.setBold,
              actions.setItalic,
              actions.blockquote,
              actions.checkboxList,
              actions.code,
              actions.insertBulletsList,
              actions.undo,
              actions.redo,
            ]}
            iconTint={colors.textSecondary}
            selectedIconTint={colors.text}
            style={[
              styles.toolbar,
              { backgroundColor: colors.surface, borderTopColor: colors.border },
            ]}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  editorContainer: {
    minHeight: 420,
    paddingBottom: 24,
  },
  richEditor: {
    backgroundColor: 'transparent',
  },
  syntaxInput: {
    minHeight: 420,
    fontSize: 14,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingBottom: 24,
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  toolbar: {
    borderTopWidth: 1,
    height: 46,
  },
});
