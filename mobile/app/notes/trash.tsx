import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/theme';
import {
  getTrashedNotes,
  restoreLocalNote,
  permanentlyDeleteLocalNote,
  Note,
} from '../../lib/db';
import { deleteRemoteNote } from '../../lib/api';
import { runSync, isOnline } from '../../lib/sync';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';

export default function TrashScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTrashedNotes = useCallback(async () => {
    const local = await getTrashedNotes();
    setNotes(local);
  }, []);

  useEffect(() => {
    fetchTrashedNotes();
  }, [fetchTrashedNotes]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTrashedNotes();
    setIsRefreshing(false);
  };

  const handleRestore = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await restoreLocalNote(id);
    runSync();
    fetchTrashedNotes();
    Toast.show('Note restored', {
      duration: Toast.durations.SHORT,
      position: Toast.positions.BOTTOM,
      backgroundColor: colors.text,
      textColor: colors.background,
    });
  };

  const handlePermanentDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete Permanently',
      `"${title || 'Untitled'}" will be permanently deleted and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const online = await isOnline();
            if (online) {
              await deleteRemoteNote(id, true).catch(() => {});
            }
            await permanentlyDeleteLocalNote(id);
            fetchTrashedNotes();
            Toast.show('Permanently deleted', {
              duration: Toast.durations.SHORT,
              position: Toast.positions.BOTTOM,
              backgroundColor: colors.text,
              textColor: colors.background,
            });
          },
        },
      ]
    );
  };

  const handleEmptyTrash = () => {
    if (notes.length === 0) return;
    Alert.alert(
      'Empty Trash',
      `Permanently delete all ${notes.length} note${notes.length !== 1 ? 's' : ''} in the trash?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty Trash',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const ids = notes.map((n) => n.id);
            const online = await isOnline();
            for (const id of ids) {
              if (online) {
                await deleteRemoteNote(id, true).catch(() => {});
              }
              await permanentlyDeleteLocalNote(id);
            }
            fetchTrashedNotes();
            Toast.show('Trash emptied', {
              duration: Toast.durations.SHORT,
              position: Toast.positions.BOTTOM,
              backgroundColor: colors.text,
              textColor: colors.background,
            });
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getCleanPreview = (raw: string) =>
    raw
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/[#*_~`>\-\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const renderRightActions = (item: Note) => () => (
    <TouchableOpacity
      style={[
        styles.swipeAction,
        { backgroundColor: colors.accent },
      ]}
      onPress={() => handlePermanentDelete(item.id, item.title)}
    >
      <Feather name="x" size={18} color={colors.accentText} />
      <Text style={[styles.swipeText, { color: colors.accentText }]}>Delete</Text>
    </TouchableOpacity>
  );

  const renderLeftActions = (item: Note) => () => (
    <TouchableOpacity
      style={[
        styles.swipeAction,
        styles.restoreAction,
        { backgroundColor: colors.surfaceContainer, borderColor: colors.border },
      ]}
      onPress={() => handleRestore(item.id)}
    >
      <Feather name="rotate-ccw" size={18} color={colors.text} />
      <Text style={[styles.swipeText, { color: colors.text }]}>Restore</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Note }) => (
    <Swipeable
      renderRightActions={renderRightActions(item)}
      renderLeftActions={renderLeftActions(item)}
      overshootRight={false}
      overshootLeft={false}
    >
      <View
        style={[
          styles.noteCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title || 'Untitled'}
          </Text>
          <Text style={[styles.noteDate, { color: colors.textMuted }]}>
            {item.deleted_at ? formatDate(item.deleted_at) : ''}
          </Text>
        </View>
        <Text style={[styles.noteContent, { color: colors.textMuted }]} numberOfLines={2}>
          {getCleanPreview(item.content) || 'Empty note'}
        </Text>
        <View style={styles.cardFooterActions}>
          <TouchableOpacity
            style={[styles.inlineActionBtn, { borderColor: colors.border }]}
            onPress={() => handleRestore(item.id)}
          >
            <Feather name="rotate-ccw" size={12} color={colors.text} />
            <Text style={[styles.inlineActionText, { color: colors.text }]}>Restore</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.inlineActionBtn, { borderColor: colors.border }]}
            onPress={() => handlePermanentDelete(item.id, item.title)}
          >
            <Feather name="trash-2" size={12} color={colors.textSecondary} />
            <Text style={[styles.inlineActionText, { color: colors.textSecondary }]}>
              Delete Forever
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Swipeable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Feather name="arrow-left" size={15} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Trash</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </Text>
        </View>
        {notes.length > 0 && (
          <TouchableOpacity
            style={[
              styles.emptyBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={handleEmptyTrash}
          >
            <Text style={[styles.emptyBtnText, { color: colors.text }]}>Empty Trash</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.text}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIconContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Feather name="trash-2" size={24} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Trash is empty</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Deleted notes appear here so you can restore them anytime or remove them permanently.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  emptyBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
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
    marginBottom: 4,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  noteContent: {
    fontSize: 13,
    lineHeight: 19,
  },
  noteDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardFooterActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  inlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
  },
  inlineActionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    marginBottom: 10,
    borderRadius: 14,
    gap: 4,
    marginLeft: 8,
  },
  restoreAction: {
    marginLeft: 0,
    marginRight: 8,
    borderWidth: 1,
  },
  swipeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 90,
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
