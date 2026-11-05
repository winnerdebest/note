import { Platform, DeviceEventEmitter } from 'react-native';
import * as Network from 'expo-network';
import { apiFetch, getToken } from './api';
import { 
  getPendingSyncNotes, 
  markNotesSynced, 
  getLastSyncedAt, 
  updateLastSyncedAt, 
  upsertLocalNote,
  getLocalNote,
  Note
} from './db';

let isSyncing = false;

export const isOnline = async (): Promise<boolean> => {
  try {
    const state = await Network.getNetworkStateAsync();
    return !!(state.isConnected && state.isInternetReachable);
  } catch {
    return false;
  }
};

export const runSync = async () => {
  if (Platform.OS === 'web') return;
  if (isSyncing) return;

  // Check network connectivity BEFORE attempting any requests
  const online = await isOnline();
  if (!online) {
    return;
  }

  const token = await getToken();
  if (!token) {
    return;
  }

  isSyncing = true;
  DeviceEventEmitter.emit('sync_status', true);
  try {
    const lastSyncedAt = await getLastSyncedAt();
    const pendingNotes = await getPendingSyncNotes();

    const pushPayload = pendingNotes.map(n => ({
      id: n.id,
      title: n.title,
      content: n.content,
      is_pinned: n.is_pinned,
      tags: n.tags,
      deleted_at: n.deleted_at,
      created_at: n.created_at,
      updated_at: n.updated_at,
    }));

    // Single atomic round-trip sync with FastAPI backend
    const syncResult = await apiFetch('/api/v1/notes/sync', {
      method: 'POST',
      body: JSON.stringify({
        last_synced_at: lastSyncedAt,
        push_notes: pushPayload,
      }),
    });

    if (syncResult) {
      // 1. Mark pushed notes as synced locally
      if (syncResult.synced_ids && syncResult.synced_ids.length > 0) {
        await markNotesSynced(syncResult.synced_ids);
      }

      // 2. Upsert pulled remote notes (Last-write-wins)
      if (syncResult.pulled_notes && syncResult.pulled_notes.length > 0) {
        for (const remoteNote of syncResult.pulled_notes) {
          const localNote = await getLocalNote(remoteNote.id);
          if (!localNote || new Date(remoteNote.updated_at) > new Date(localNote.updated_at)) {
            await upsertLocalNote({
              ...remoteNote,
              sync_status: 'synced',
            } as Note);
          }
        }
      }

      // 3. Update sync timestamp with authoritative server time
      if (syncResult.server_time) {
        await updateLastSyncedAt(syncResult.server_time);
      }
    }

    // Notify UI components to re-fetch notes
    DeviceEventEmitter.emit('notes_updated');
  } catch (err) {
    console.warn('Sync failed:', err);
  } finally {
    isSyncing = false;
    DeviceEventEmitter.emit('sync_status', false);
  }
};
