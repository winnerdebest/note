const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '728681741345-jcjahvj8tbh79i55d5qe2ko1b88598v3.apps.googleusercontent.com';

const TOKEN_KEY = 'mindfulcanvas_jwt_token';
const USER_KEY = 'mindfulcanvas_user';

export interface User {
  id: string;
  email: string;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface NotePayload {
  id?: string;
  title: string;
  content: string;
  is_pinned?: boolean;
  isPinned?: boolean;
  tags?: string[];
  deleted_at?: string | null;
  deletedAt?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setAuthSession = (token: string, user: User) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuthSession = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorBody.detail || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
};

export const register = async (email: string, password: string): Promise<AuthResponse> => {
  const data = await apiFetch('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuthSession(data.access_token, data.user);
  return data;
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const data = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuthSession(data.access_token, data.user);
  return data;
};

export const loginWithGoogleToken = async (payload: {
  access_token?: string;
  id_token?: string;
  code?: string;
}): Promise<AuthResponse> => {
  const data = await apiFetch('/api/v1/auth/google', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setAuthSession(data.access_token, data.user);
  return data;
};

const ensureGoogleScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google Sign-In is only available in the browser.'));
      return;
    }
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        if ((window as any).google?.accounts?.oauth2) {
          clearInterval(timer);
          resolve();
        } else if (attempts > 40) {
          clearInterval(timer);
          reject(new Error('Google Sign-In script took too long to load.'));
        }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In script.'));
    document.head.appendChild(script);
  });
};

export const signInWithGooglePopup = async (): Promise<AuthResponse> => {
  await ensureGoogleScript();

  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: async (response: any) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        try {
          const authData = await loginWithGoogleToken({
            access_token: response.access_token,
          });
          resolve(authData);
        } catch (err) {
          reject(err);
        }
      },
      error_callback: (err: any) => {
        reject(new Error(err?.message || 'Google sign-in popup was closed or blocked.'));
      },
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });
};

export const getMe = async (): Promise<User> => {
  const user = await apiFetch('/api/v1/auth/me');
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  return user;
};

export const mapFromApiNote = (note: any) => ({
  id: note.id,
  title: note.title,
  content: note.content,
  isPinned: note.is_pinned ?? false,
  tags: note.tags || [],
  createdAt: note.created_at,
  updatedAt: note.updated_at,
  deletedAt: note.deleted_at || null,
});

export const mapToApiNote = (note: any) => ({
  id: note.id,
  title: note.title || '',
  content: note.content || '',
  is_pinned: note.isPinned ?? note.is_pinned ?? false,
  tags: note.tags || [],
  deleted_at: note.deletedAt ?? note.deleted_at ?? null,
});

export const fetchNotesApi = async (includeDeleted = false, search = '', tag = '') => {
  const params = new URLSearchParams();
  if (includeDeleted) params.set('include_deleted', 'true');
  if (search) params.set('search', search);
  
  const endpoint = `/api/v1/notes${params.toString() ? `?${params.toString()}` : ''}`;
  const data = await apiFetch(endpoint);
  
  let notes = (data || []).map(mapFromApiNote);
  if (tag) {
    notes = notes.filter((n: any) => n.tags?.includes(tag));
  }
  return notes;
};

export const createNoteApi = async (note: any) => {
  const body = mapToApiNote(note);
  const data = await apiFetch('/api/v1/notes', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapFromApiNote(data);
};

export const updateNoteApi = async (id: string, note: any) => {
  const body = mapToApiNote(note);
  const data = await apiFetch(`/api/v1/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return mapFromApiNote(data);
};

export const deleteNoteApi = async (id: string, permanent = false) => {
  await apiFetch(`/api/v1/notes/${id}${permanent ? '?permanent=true' : ''}`, {
    method: 'DELETE',
  });
};
