import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Platform, ScrollView, KeyboardAvoidingView, Alert,
  Animated, Keyboard, AppState
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../lib/theme';
import { getLocalNote, upsertLocalNote, Note } from '../../lib/db';
import { getUserId } from '../../lib/auth';
import { runSync } from '../../lib/sync';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';

const generateId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [noteId] = useState(isNew ? generateId() : id);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [userId, setUserId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const richEditorRef = useRef<RichEditor>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const headerElevation = useRef(new Animated.Value(0)).current;

  // Refs for auto-save to avoid stale closures
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const tagsRef = useRef(tags);
  const isPinnedRef = useRef(isPinned);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { tagsRef.current = tags; }, [tags]);
  useEffect(() => { isPinnedRef.current = isPinned; }, [isPinned]);

  useEffect(() => {
    const loadNote = async () => {
      const uid = await getUserId();
      if (uid) setUserId(uid);

      if (!isNew) {
        const local = await getLocalNote(id);
        if (local) {
          setTitle(local.title);
          setContent(local.content);
          setIsPinned(local.is_pinned);
          setTags(local.tags || []);
        }
      }
    };
    loadNote();
  }, [id, isNew]);

  const saveNote = useCallback(async (isManual = false) => {
    // If we're leaving, try to get the latest HTML directly from the editor ref
    // because onChange might not have fired for the very last keystroke.
    if (isManual && richEditorRef.current) {
      try {
        const html = await richEditorRef.current.getContentHtml();
        if (html !== undefined) {
          contentRef.current = html;
          setContent(html);
        }
      } catch (e) {
        console.warn('Could not get latest HTML from editor:', e);
      }
    }

    let activeUserId = userId;
    if (!activeUserId) {
      activeUserId = await getUserId() || '';
      if (activeUserId) setUserId(activeUserId);
    }

    if (!activeUserId) return;

    const currentTitle = titleRef.current;
    const currentContent = contentRef.current;
    
    // Don't auto-save totally empty notes unless it's a manual save (back button)
    if (!isManual && !currentTitle.trim() && !currentContent.trim()) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const noteData: Note = {
        id: noteId,
        title: currentTitle || 'Untitled Note',
        content: currentContent,
        is_pinned: isPinnedRef.current,
        created_at: now,
        updated_at: now,
        user_id: activeUserId,
        tags: tagsRef.current,
        deleted_at: null,
        sync_status: 'pending',
      };

      if (Platform.OS !== 'web') {
        const existing = await getLocalNote(noteId);
        if (existing) noteData.created_at = existing.created_at;
        await upsertLocalNote(noteData);
      }

      if (isManual) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show('Saved locally', {
          duration: Toast.durations.SHORT,
          position: Toast.positions.BOTTOM,
          backgroundColor: colors.accent,
          textColor: '#FFF',
          shadow: true,
        });
      }
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  }, [noteId, userId, colors]);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNote(false), 2500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [title, content, isPinned, tags, saveNote]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') saveNote(false);
    });
    return () => sub.remove();
  }, [saveNote]);

  const handleBack = async () => {
    Keyboard.dismiss();
    await saveNote(true);
    if (Platform.OS !== 'web') runSync();
    router.back();
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const onScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    Animated.timing(headerElevation, {
      toValue: y > 10 ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <Animated.View style={[
        styles.header, 
        { 
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
          shadowOpacity: headerElevation.interpolate({ inputRange: [0, 1], outputRange: [0, 0.05] }),
          elevation: headerElevation.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }),
        }
      ]}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={[styles.statusIndicator, { backgroundColor: isSaving ? colors.warning : colors.success }]} />
          <Text style={[styles.headerStatus, { color: colors.textMuted }]}>
            {isSaving ? 'Saving...' : 'Auto-saved'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setIsPinned(!isPinned);
          }}
          style={[styles.headerBtn, isPinned && { backgroundColor: colors.accentSoft }]}
        >
          <Ionicons name={isPinned ? 'pin' : 'pin-outline'} size={20} color={isPinned ? colors.accent : colors.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {/* Title Input */}
          <TextInput
            style={[styles.titleInput, { color: colors.text }]}
            placeholder="Untitled Note"
            placeholderTextColor={colors.textMuted + '80'}
            value={title}
            onChangeText={setTitle}
            multiline
            returnKeyType="next"
          />

          {/* Tag Input */}
          <View style={styles.tagsContainer}>
            <View style={[styles.tagInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="pricetag-outline" size={14} color={colors.accent} />
              <TextInput
                style={[styles.tagInput, { color: colors.text }]}
                placeholder="Add tags..."
                placeholderTextColor={colors.textMuted}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={handleAddTag}
                blurOnSubmit={false}
              />
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsRow}>
              {tags.map((tag, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.tagPill, { backgroundColor: colors.tagBackground, borderColor: colors.accent + '20' }]}
                  onPress={() => handleRemoveTag(tag)}
                >
                  <Text style={[styles.tagPillText, { color: colors.tagText }]}>#{tag}</Text>
                  <Ionicons name="close-circle" size={14} color={colors.tagText} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Rich Text Editor */}
          <View style={styles.editorContainer}>
            <RichEditor
              ref={richEditorRef}
              style={styles.richEditor}
              initialContentHTML={content}
              onChange={(html) => setContent(html)}
              placeholder="Start writing your thoughts..."
              editorStyle={{
                backgroundColor: 'transparent',
                contentCSSText: `
                  font-family: -apple-system, system-ui;
                  font-size: 17px;
                  line-height: 1.6;
                  color: ${colors.text};
                  padding: 0;
                  caret-color: ${colors.accent};
                `,
                placeholderColor: colors.textMuted,
              }}
              initialHeight={500}
              useContainer={false}
            />
          </View>
        </ScrollView>

        {/* Formatting Toolbar */}
        <RichToolbar
          editor={richEditorRef}
          actions={[
            actions.setBold,
            actions.setItalic,
            actions.setUnderline,
            actions.setStrikethrough,
            actions.insertBulletsList,
            actions.insertOrderedList,
            actions.checkboxList,
            actions.heading1,
            actions.heading2,
            actions.code,
            actions.undo,
            actions.redo,
          ]}
          iconTint={colors.textSecondary}
          selectedIconTint={colors.accent}
          style={[styles.toolbar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}
        />
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerStatus: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleInput: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 16,
    letterSpacing: -1,
  },
  tagsContainer: {
    marginBottom: 20,
    gap: 12,
  },
  tagInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  tagInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  tagsRow: {
    flexDirection: 'row',
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    gap: 6,
  },
  tagPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginBottom: 20,
    opacity: 0.5,
  },
  editorContainer: {
    minHeight: 500,
  },
  richEditor: {
    backgroundColor: 'transparent',
  },
  toolbar: {
    borderTopWidth: 1,
    height: 50,
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
  },
});
