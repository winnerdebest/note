import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  DeviceEventEmitter,
  ScrollView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/theme';
import {
  getLocalNotes,
  softDeleteLocalNote,
  togglePinLocalNote,
  Note,
} from '../../lib/db';
import { runSync, isOnline } from '../../lib/sync';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import { Feather, Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';

export default function NotesListScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pinned'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [online, setOnline] = useState(true);

  const fetchNotes = useCallback(async () => {
    try {
      const local = await getLocalNotes();
      setNotes(local);
    } catch (err) {
      console.error('Fetch notes error:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
    isOnline().then(setOnline);

    const syncStatusSub = DeviceEventEmitter.addListener('sync_status', (status: boolean) => {
      setIsSyncing(status);
    });
    // Listen to 'notes_updated' emitted by lib/sync.ts
    const notesUpdatedSub = DeviceEventEmitter.addListener('notes_updated', () => {
      fetchNotes();
    });

    return () => {
      syncStatusSub.remove();
      notesUpdatedSub.remove();
    };
  }, [fetchNotes]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const networkOnline = await isOnline();
    setOnline(networkOnline);
    if (networkOnline) {
      await runSync();
    }
    await fetchNotes();
    setIsRefreshing(false);
    if (!networkOnline) {
      Toast.show('Offline mode — showing local notes', {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        backgroundColor: colors.text,
        textColor: colors.background,
      });
    }
  }, [fetchNotes, colors]);

  const handleDelete = async (id: string) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await softDeleteLocalNote(id);
    runSync();
    fetchNotes();
    Toast.show('Moved to trash', {
      duration: Toast.durations.SHORT,
      position: Toast.positions.BOTTOM,
      backgroundColor: colors.text,
      textColor: colors.background,
    });
  };

  const handleTogglePin = async (note: Note) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await togglePinLocalNote(note.id, !note.is_pinned);
    runSync();
    fetchNotes();
  };

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || []))).filter(Boolean);
  const pinnedTotal = notes.filter((n) => n.is_pinned).length;

  const filteredNotes = notes.filter((n) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      (n.tags || []).some((t) => t.toLowerCase().includes(q.replace(/^#/, '')));
    const matchesTag = !selectedTag || (n.tags || []).includes(selectedTag);
    const matchesPin = filterMode === 'all' || n.is_pinned;
    return matchesSearch && matchesTag && matchesPin;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.is_pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.is_pinned);
  const displayNotes = [...pinnedNotes, ...unpinnedNotes];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Strip both HTML tags and Markdown syntax (**bold**, `code`, ## Heading, - [ ]) for clean preview
  const getCleanPreview = (raw: string) => {
    if (!raw) return '';
    return raw
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/^#+\s+/gm, '')
      .replace(/^\s*[-*]\s+\[[ xX]\]\s+/gm, '✓ ')
      .replace(/[#*_~`>\-\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const renderRightActions = (item: Note) => () => (
    <TouchableOpacity
      style={[
        styles.swipeAction,
        { backgroundColor: colors.surfaceContainer, borderColor: colors.border },
      ]}
      onPress={() => handleDelete(item.id)}
    >
      <Feather name="trash-2" size={18} color={colors.text} />
      <Text style={[styles.swipeLabel, { color: colors.text }]}>Trash</Text>
    </TouchableOpacity>
  );

  const renderLeftActions = (item: Note) => () => (
    <TouchableOpacity
      style={[
        styles.swipeAction,
        styles.leftAction,
        { backgroundColor: colors.accent },
      ]}
      onPress={() => handleTogglePin(item)}
    >
      <Ionicons
        name={item.is_pinned ? 'pin-outline' : 'pin'}
        size={18}
        color={colors.accentText}
      />
      <Text style={[styles.swipeLabel, { color: colors.accentText }]}>
        {item.is_pinned ? 'Unpin' : 'Pin'}
      </Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Note }) => {
    const preview = getCleanPreview(item.content);
    return (
      <Swipeable
        renderRightActions={renderRightActions(item)}
        renderLeftActions={renderLeftActions(item)}
        overshootRight={false}
        overshootLeft={false}
      >
        <TouchableOpacity
          style={[
            styles.noteCard,
            {
              backgroundColor: colors.card,
              borderColor: item.is_pinned ? colors.text + '45' : colors.border,
            },
          ]}
          onPress={() => router.push(`/notes/${item.id}`)}
          activeOpacity={0.75}
        >
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              {item.is_pinned && (
                <Ionicons
                  name="pin"
                  size={12}
                  color={colors.text}
                  style={{ marginRight: 5 }}
                />
              )}
              <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title || 'Untitled'}
              </Text>
            </View>
            <Text style={[styles.noteDate, { color: colors.textMuted }]}>
              {formatDate(item.updated_at)}
            </Text>
          </View>

          <Text style={[styles.noteContent, { color: colors.textSecondary }]} numberOfLines={2}>
            {preview || 'Empty note…'}
          </Text>

          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagRow}>
              {item.tags.slice(0, 3).map((tag, i) => (
                <View
                  key={i}
                  style={[
                    styles.tagChip,
                    { backgroundColor: colors.tagBackground, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.tagChipText, { color: colors.tagText }]}>#{tag}</Text>
                </View>
              ))}
              {item.tags.length > 3 && (
                <Text style={[styles.tagMore, { color: colors.textMuted }]}>
                  +{item.tags.length - 3}
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Top Studio Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.brandRow}>
            <View
              style={[
                styles.brandBadge,
                { backgroundColor: colors.accent },
              ]}
            >
              <Feather name="feather" size={12} color={colors.accentText} />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Notes <Text style={[styles.byWinner, { color: colors.textMuted }]}>by Winner</Text>
            </Text>
          </View>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: !online ? colors.textMuted : colors.text,
                  opacity: isSyncing ? 0.45 : 1,
                },
              ]}
            />
            <Text style={[styles.statusText, { color: colors.textMuted }]}>
              {isSyncing
                ? 'Syncing…'
                : !online
                ? 'Offline ready'
                : `Synced · ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/notes/trash')}
            accessibilityLabel="Trash"
          >
            <Feather name="trash-2" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/notes/settings')}
            accessibilityLabel="Settings"
          >
            <Feather name="settings" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.searchBackground, borderColor: colors.border },
        ]}
      >
        <Feather name="search" size={15} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search notes or #tags…"
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={17} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Pills (All / Pinned / #tags) */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor:
                  filterMode === 'all' && !selectedTag ? colors.accent : colors.surface,
                borderColor:
                  filterMode === 'all' && !selectedTag ? colors.accent : colors.border,
              },
            ]}
            onPress={() => {
              setFilterMode('all');
              setSelectedTag(null);
            }}
          >
            <Text
              style={[
                styles.filterPillText,
                {
                  color:
                    filterMode === 'all' && !selectedTag
                      ? colors.accentText
                      : colors.textSecondary,
                },
              ]}
            >
              All ({notes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor: filterMode === 'pinned' ? colors.accent : colors.surface,
                borderColor: filterMode === 'pinned' ? colors.accent : colors.border,
              },
            ]}
            onPress={() => setFilterMode(filterMode === 'pinned' ? 'all' : 'pinned')}
          >
            <Text
              style={[
                styles.filterPillText,
                {
                  color: filterMode === 'pinned' ? colors.accentText : colors.textSecondary,
                },
              ]}
            >
              Pinned ({pinnedTotal})
            </Text>
          </TouchableOpacity>

          {allTags.map((tag) => {
            const active = selectedTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.accent : colors.surface,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => setSelectedTag(active ? null : tag)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: active ? colors.accentText : colors.textSecondary },
                  ]}
                >
                  #{tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notes Feed */}
      <FlatList
        data={displayNotes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.text}
            colors={[colors.text]}
            progressBackgroundColor={colors.card}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Feather
                name={searchQuery ? 'search' : 'file-text'}
                size={24}
                color={colors.textMuted}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {searchQuery
                ? 'No matching notes'
                : filterMode === 'pinned'
                ? 'No pinned notes yet'
                : 'Your notebook is empty'}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              {searchQuery
                ? 'Try a different keyword or #tag'
                : 'Pull down to sync or tap + to start writing'}
            </Text>
          </View>
        }
      />

      {/* Monochrome Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/notes/new');
        }}
        activeOpacity={0.85}
        accessibilityLabel="New note"
      >
        <Feather name="plus" size={24} color={colors.accentText} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerLeft: { gap: 4 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  byWinner: {
    fontSize: 15,
    fontWeight: '400',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 13,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    gap: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  filterScroll: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 6,
    flexDirection: 'row',
  },
  filterPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 110,
  },
  noteCard: {
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
    letterSpacing: -0.2,
  },
  noteDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  noteContent: {
    fontSize: 13,
    lineHeight: 19,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 10,
  },
  tagChip: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagChipText: {
    fontSize: 10,
    fontWeight: '500',
  },
  tagMore: {
    fontSize: 10,
    alignSelf: 'center',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 68,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    marginLeft: 8,
  },
  leftAction: {
    marginLeft: 0,
    marginRight: 8,
    borderWidth: 0,
  },
  swipeLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});
