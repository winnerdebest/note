import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export interface Note {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  tags: string[]; // parsed as array for the app, stored as string in sqlite
  deleted_at: string | null;
  sync_status?: 'pending' | 'synced'; // only in sqlite
}

// In-memory fallback for web so we don't crash, but we won't use it
const noopDb = {
  execAsync: async () => {},
  runAsync: async () => ({ changes: 0, lastInsertRowId: 0 }),
  getFirstAsync: async () => null,
  getAllAsync: async () => [],
};

let dbInstance: SQLite.SQLiteDatabase | null = null;

const getDb = () => {
  if (Platform.OS === 'web') {
    return noopDb as any as SQLite.SQLiteDatabase;
  }
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('notes.db');
  }
  return dbInstance;
};

export const initDb = async () => {
  if (Platform.OS === 'web') return;

  const db = getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      user_id TEXT NOT NULL,
      tags TEXT NOT NULL,
      deleted_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS sync_meta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      last_synced_at TEXT NOT NULL
    );
  `);
};

export const getLocalNotes = async (): Promise<Note[]> => {
  if (Platform.OS === 'web') return [];
  const db = getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY updated_at DESC');
  return rows.map(row => ({
    ...row,
    is_pinned: row.is_pinned === 1,
    tags: JSON.parse(row.tags),
  }));
};

export const getLocalNote = async (id: string): Promise<Note | null> => {
  if (Platform.OS === 'web') return null;
  const db = getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM notes WHERE id = ?', [id]);
  if (!row) return null;
  return {
    ...row,
    is_pinned: row.is_pinned === 1,
    tags: JSON.parse(row.tags),
  };
};

export const upsertLocalNote = async (note: Note) => {
  if (Platform.OS === 'web') return;
  const db = getDb();
  await db.runAsync(
    `INSERT INTO notes (id, title, content, is_pinned, created_at, updated_at, user_id, tags, deleted_at, sync_status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET 
       title = excluded.title,
       content = excluded.content,
       is_pinned = excluded.is_pinned,
       updated_at = excluded.updated_at,
       tags = excluded.tags,
       deleted_at = excluded.deleted_at,
       sync_status = excluded.sync_status`,
    [
      note.id,
      note.title,
      note.content,
      note.is_pinned ? 1 : 0,
      note.created_at,
      note.updated_at,
      note.user_id,
      JSON.stringify(note.tags),
      note.deleted_at,
      note.sync_status || 'pending',
    ]
  );
};

export const softDeleteLocalNote = async (id: string) => {
  if (Platform.OS === 'web') return;
  const db = getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE notes SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`,
    [now, now, id]
  );
};

export const getPendingSyncNotes = async (): Promise<Note[]> => {
  if (Platform.OS === 'web') return [];
  const db = getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM notes WHERE sync_status = "pending"');
  return rows.map(row => ({
    ...row,
    is_pinned: row.is_pinned === 1,
    tags: JSON.parse(row.tags),
  }));
};

export const markNotesSynced = async (ids: string[]) => {
  if (Platform.OS === 'web' || ids.length === 0) return;
  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE notes SET sync_status = 'synced' WHERE id IN (${placeholders})`,
    ids
  );
};

export const getLastSyncedAt = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return null;
  const db = getDb();
  const row = await db.getFirstAsync<{ last_synced_at: string }>('SELECT last_synced_at FROM sync_meta ORDER BY id DESC LIMIT 1');
  return row ? row.last_synced_at : null;
};

export const updateLastSyncedAt = async (timestamp: string) => {
  if (Platform.OS === 'web') return;
  const db = getDb();
  await db.runAsync('INSERT INTO sync_meta (last_synced_at) VALUES (?)', [timestamp]);
};

export const getTrashedNotes = async (): Promise<Note[]> => {
  if (Platform.OS === 'web') return [];
  const db = getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM notes WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC');
  return rows.map(row => ({
    ...row,
    is_pinned: row.is_pinned === 1,
    tags: JSON.parse(row.tags),
  }));
};

export const restoreLocalNote = async (id: string) => {
  if (Platform.OS === 'web') return;
  const db = getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE notes SET deleted_at = NULL, updated_at = ?, sync_status = 'pending' WHERE id = ?`,
    [now, id]
  );
};

export const permanentlyDeleteLocalNote = async (id: string) => {
  if (Platform.OS === 'web') return;
  const db = getDb();
  await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
};

export const togglePinLocalNote = async (id: string, isPinned: boolean) => {
  if (Platform.OS === 'web') return;
  const db = getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE notes SET is_pinned = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`,
    [isPinned ? 1 : 0, now, id]
  );
};

