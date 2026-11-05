import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Platform, DeviceEventEmitter, ScrollView,
  RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/theme';
import { getLocalNotes, softDeleteLocalNote, togglePinLocalNote, Note } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { runSync, isOnline } from '../../lib/sync';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';

export default function NotesListScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [online, setOnline] = useState(true);

  const fetchNotes = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          const { data } = await supabase
            .from('notes').select('*')
            .eq('user_id', sessionData.session.user.id)
            .is('deleted_at', null)
            .order('updated_at', { ascending: false });
          if (data) setNotes(data as Note[]);
        }
      } else {
        const local = await getLocalNotes();
        setNotes(local);
      }
    } catch (err) {
      console.error('Fetch notes error:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotes();

    // Check online status
    isOnline().then(setOnline);

    const syncStatusSub = DeviceEventEmitter.addListener('sync_status', (status: boolean) => {
      setIsSyncing(status);
    });
    const syncCompleteSub = DeviceEventEmitter.addListener('sync_complete', () => {
      fetchNotes();
    });
    return () => {
      syncStatusSub.remove();
      syncCompleteSub.remove();
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
      Toast.show('You are offline. Showing local notes.', {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        backgroundColor: colors.warning,
        textColor: '#FFF',
      });
    }
  }, [fetchNotes, colors]);

  const handleDelete = async (id: string) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (Platform.OS === 'web') {
      await supabase.from('notes').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    } else {
      await softDeleteLocalNote(id);
      runSync();
    }
    fetchNotes();
    Toast.show('Moved to trash', {
      duration: Toast.durations.SHORT,
      position: Toast.positions.BOTTOM,
      backgroundColor: colors.card,
      textColor: colors.text,
      shadow: true,
    });
  };

  const handleTogglePin = async (note: Note) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS !== 'web') {
      await togglePinLocalNote(note.id, !note.is_pinned);
      runSync();
    }
    fetchNotes();
  };

  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || []))).filter(Boolean);

  const filteredNotes = notes.filter(n => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    const matchesTag = !selectedTag || (n.tags || []).includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.is_pinned);
  const displayNotes = [...pinnedNotes, ...unpinnedNotes];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const stripHtml = (html: string) =>
    html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

  const renderRightActions = (item: Note) => () => (
    <TouchableOpacity
      style={[styles.swipeAction, { backgroundColor: colors.danger }]}
      onPress={() => handleDelete(item.id)}
    >
      <Ionicons name="trash" size={22} color="#FFF" />
      <Text style={styles.swipeLabel}>Trash</Text>
    </TouchableOpacity>
  );

  const renderLeftActions = (item: Note) => () => (
    <TouchableOpacity
      style={[styles.swipeAction, styles.leftAction, { backgroundColor: item.is_pinned ? colors.textMuted : colors.accent }]}
      onPress={() => handleTogglePin(item)}
    >
      <Ionicons name={item.is_pinned ? 'pin' : 'pin-outline'} size={22} color="#FFF" />
      <Text style={styles.swipeLabel}>{item.is_pinned ? 'Unpin' : 'Pin'}</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item, index }: { item: Note; index: number }) => (
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
            backgroundColor: item.is_pinned ? colors.accentSoft : colors.card,
            borderColor: item.is_pinned ? colors.accent + '30' : colors.border,
          }
        ]}
        onPress={() => router.push(`/notes/${item.id}`)}
        activeOpacity={0.75}
      >
        {item.is_pinned && (
          <View style={[styles.pinnedBadge, { backgroundColor: colors.accent }]}>
            <Ionicons name="pin" size={10} color="#FFF" />
          </View>
        )}
        <View style={styles.cardHeader}>
          <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title || 'Untitled'}
          </Text>
          <Text style={[styles.noteDate, { color: colors.textMuted }]}>
            {formatDate(item.updated_at)}
          </Text>
        </View>
        {stripHtml(item.content) ? (
          <Text style={[styles.noteContent, { color: colors.textSecondary }]} numberOfLines={2}>
            {stripHtml(item.content)}
          </Text>
        ) : null}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagRow}>
            {item.tags.slice(0, 3).map((tag, i) => (
              <View key={i} style={[styles.tagChip, { backgroundColor: colors.tagBackground }]}>
                <Text style={[styles.tagChipText, { color: colors.tagText }]}>#{tag}</Text>
              </View>
            ))}
            {item.tags.length > 3 && (
              <Text style={[styles.tagMore, { color: colors.textMuted }]}>+{item.tags.length - 3}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notes</Text>
          <View style={styles.headerMeta}>
            {isSyncing ? (
              <View style={[styles.statusPill, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="sync" size={11} color={colors.accent} />
                <Text style={[styles.statusText, { color: colors.accent }]}>Syncing</Text>
              </View>
            ) : !online ? (
              <View style={[styles.statusPill, { backgroundColor: colors.dangerSoft }]}>
                <Ionicons name="cloud-offline-outline" size={11} color={colors.danger} />
                <Text style={[styles.statusText, { color: colors.danger }]}>Offline</Text>
              </View>
            ) : (
              <View style={[styles.statusPill, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="checkmark-circle" size={11} color={colors.success} />
                <Text style={[styles.statusText, { color: colors.success }]}>Synced</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/notes/trash')}
          >
            <Ionicons name="trash-outline" size={19} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/notes/settings')}
          >
            <Ionicons name="person-circle-outline" size={19} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.searchBackground, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={17} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search notes..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagScroll}
        >
          <TouchableOpacity
            style={[styles.filterPill, { backgroundColor: !selectedTag ? colors.accent : colors.surface, borderColor: !selectedTag ? colors.accent : colors.border }]}
            onPress={() => setSelectedTag(null)}
          >
            <Ionicons name="apps-outline" size={12} color={!selectedTag ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.filterPillText, { color: !selectedTag ? '#FFF' : colors.textSecondary }]}>All</Text>
          </TouchableOpacity>
          {allTags.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.filterPill, { backgroundColor: selectedTag === tag ? colors.accent : colors.tagBackground, borderColor: selectedTag === tag ? colors.accent : 'transparent' }]}
              onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
            >
              <Text style={[styles.filterPillText, { color: selectedTag === tag ? '#FFF' : colors.tagText }]}>#{tag}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Section label */}
      {pinnedNotes.length > 0 && !selectedTag && !searchQuery && (
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PINNED</Text>
      )}

      {/* List */}
      <FlatList
        data={displayNotes}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.card}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name={searchQuery ? 'search-outline' : 'document-text-outline'} size={36} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {searchQuery ? 'No results found' : 'No notes yet'}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              {searchQuery ? 'Try a different keyword' : 'Pull down to sync, or tap + to create'}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/notes/new');
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color="#FFF" />
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
    paddingTop: 6,
    paddingBottom: 14,
  },
  headerLeft: { gap: 4 },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  headerMeta: { flexDirection: 'row' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  tagScroll: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
    flexDirection: 'row',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  filterPillText: { fontSize: 14, fontWeight: '500' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 110,
  },
  noteCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
    overflow: 'hidden',
  },
  pinnedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 22,
    height: 22,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  noteDate: { fontSize: 11, fontWeight: '500' },
  noteContent: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagChipText: { fontSize: 11, fontWeight: '600' },
  tagMore: { fontSize: 11, alignSelf: 'center' },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 68,
    marginBottom: 10,
    borderRadius: 18,
    gap: 3,
  },
  leftAction: { marginRight: 8 },
  swipeLabel: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 34,
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
  },
});
