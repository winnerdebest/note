import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/theme';
import { getTrashedNotes, restoreLocalNote, permanentlyDeleteLocalNote, Note } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { runSync } from '../../lib/sync';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';

export default function TrashScreen() {
  const { colors } = useTheme();
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
      backgroundColor: colors.success,
      textColor: '#FFF',
    });
  };

  const handlePermanentDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete Forever',
      `"${title || 'Untitled'}" will be permanently deleted and cannot be recovered.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            // Also delete from Supabase
            await supabase.from('notes').delete().eq('id', id);
            await permanentlyDeleteLocalNote(id);
            fetchTrashedNotes();
            Toast.show('Permanently deleted', {
              duration: Toast.durations.SHORT,
              position: Toast.positions.BOTTOM,
              backgroundColor: colors.danger,
              textColor: '#FFF',
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
      `This will permanently delete all ${notes.length} note${notes.length !== 1 ? 's' : ''} in the trash.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty Trash',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const ids = notes.map(n => n.id);
            // Delete from Supabase
            await supabase.from('notes').delete().in('id', ids);
            // Delete locally
            for (const id of ids) {
              await permanentlyDeleteLocalNote(id);
            }
            fetchTrashedNotes();
            Toast.show('Trash emptied', {
              duration: Toast.durations.SHORT,
              position: Toast.positions.BOTTOM,
              backgroundColor: colors.danger,
              textColor: '#FFF',
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

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

  const renderRightActions = (item: Note) => () => (
    <TouchableOpacity
      style={[styles.swipeAction, { backgroundColor: colors.danger }]}
      onPress={() => handlePermanentDelete(item.id, item.title)}
    >
      <Ionicons name="trash-outline" size={20} color="#FFF" />
      <Text style={styles.swipeText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderLeftActions = (item: Note) => () => (
    <TouchableOpacity
      style={[styles.swipeAction, styles.restoreAction, { backgroundColor: colors.success }]}
      onPress={() => handleRestore(item.id)}
    >
      <Ionicons name="refresh-outline" size={20} color="#FFF" />
      <Text style={styles.swipeText}>Restore</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Note }) => (
    <Swipeable
      renderRightActions={renderRightActions(item)}
      renderLeftActions={renderLeftActions(item)}
      overshootRight={false}
      overshootLeft={false}
    >
      <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.noteTitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.title || 'Untitled'}
          </Text>
          <Text style={[styles.noteDate, { color: colors.textMuted }]}>
            {formatDate(item.deleted_at!)}
          </Text>
        </View>
        <Text style={[styles.noteContent, { color: colors.textMuted }]} numberOfLines={2}>
          {stripHtml(item.content) || 'No content'}
        </Text>
      </View>
    </Swipeable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Trash Bin</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {notes.length} item{notes.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {notes.length > 0 && (
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: colors.dangerSoft, borderColor: colors.danger + '40' }]}
            onPress={handleEmptyTrash}
          >
            <Text style={[styles.emptyBtnText, { color: colors.danger }]}>Empty</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notes}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="trash-outline" size={48} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Your trash is empty</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Notes you delete will stay here for 30 days before being permanently removed.
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
    paddingVertical: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  noteCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  noteContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  noteDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    marginBottom: 12,
    borderRadius: 18,
    gap: 4,
  },
  restoreAction: {
    marginRight: 8,
  },
  swipeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
