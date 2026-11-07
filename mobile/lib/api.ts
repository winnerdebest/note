import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
export const WEB_BASE_URL = (process.env.EXPO_PUBLIC_WEB_URL || '').replace(/\/+$/, '');
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';

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

export const getToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(TOKEN_KEY);
};

export const setAuthSession = async (token: string, user: User) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  await AsyncStorage.setItem('mindfulcanvas_cached_user_id', user.id);
  DeviceEventEmitter.emit('auth_state_changed', user);
};

export const clearAuthSession = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
  await AsyncStorage.removeItem('mindfulcanvas_cached_user_id');
  DeviceEventEmitter.emit('auth_state_changed', null);
};

export const getStoredUser = async (): Promise<User | null> => {
  const userJson = await AsyncStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getToken();
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

export const loginWithGoogleToken = async (payload: {
  access_token?: string;
  id_token?: string;
  code?: string;
}): Promise<AuthResponse> => {
  const data = await apiFetch('/api/v1/auth/google', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  await setAuthSession(data.access_token, data.user);
  return data;
};

/**
 * Option A: 1-Tap Direct Google Account Picker
 * Opens Google's OAuth 2.0 account chooser directly (skipping any intermediate webpage button),
 * then bounces through the authorized web origin in 0ms back to the mobile app deep link.
 */
export const signInWithGoogleMobileBridge = async (): Promise<AuthResponse> => {
  if (!WEB_BASE_URL) {
    throw new Error('EXPO_PUBLIC_WEB_URL is not configured in .env');
  }
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('EXPO_PUBLIC_GOOGLE_CLIENT_ID is not configured in .env');
  }

  const redirectUri = Linking.createURL('auth');
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: WEB_BASE_URL,
    response_type: 'token',
    scope: 'openid email profile',
    prompt: 'select_account',
    state: redirectUri,
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  const result = await WebBrowser.openAuthSessionAsync(googleAuthUrl, redirectUri);

  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in was cancelled.');
  }

  return completeSessionFromRedirectUrl(result.url);
};

export const completeSessionFromRedirectUrl = async (url: string): Promise<AuthResponse> => {
  const parsed = Linking.parse(url);
  const googleAccessToken = parsed.queryParams?.google_access_token as string | undefined;
  const googleIdToken = parsed.queryParams?.google_id_token as string | undefined;

  if (googleAccessToken || googleIdToken) {
    return loginWithGoogleToken({
      access_token: googleAccessToken ? decodeURIComponent(googleAccessToken) : undefined,
      id_token: googleIdToken ? decodeURIComponent(googleIdToken) : undefined,
    });
  }

  const token = parsed.queryParams?.token as string | undefined;
  const userRaw = parsed.queryParams?.user as string | undefined;

  if (!token) {
    throw new Error('Authentication token missing from redirect.');
  }

  let user: User | null = null;
  if (userRaw) {
    try {
      user = JSON.parse(decodeURIComponent(userRaw));
    } catch {
      try {
        user = JSON.parse(userRaw);
      } catch {
        user = null;
      }
    }
  }

  if (!user) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    user = await getMe();
  }

  await setAuthSession(token, user);
  return {
    access_token: token,
    token_type: 'bearer',
    user,
  };
};

export const getMe = async (): Promise<User> => {
  const user = await apiFetch('/api/v1/auth/me');
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  await AsyncStorage.setItem('mindfulcanvas_cached_user_id', user.id);
  return user;
};

export const deleteRemoteNote = async (id: string, permanent = false) => {
  return apiFetch(`/api/v1/notes/${id}?permanent=${permanent}`, {
    method: 'DELETE',
  });
};
