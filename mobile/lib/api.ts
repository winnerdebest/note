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

/**
 * Option 1: Hosted Web Auth Bridge
 * Opens the /mobile-auth bridge on the hosted web domain (e.g. https://notes.buildwithwinner.name.ng/mobile-auth)
 * which runs Google OAuth on the authorized web origin and redirects back via deep link with the JWT + User.
 */
export const signInWithGoogleMobileBridge = async (): Promise<AuthResponse> => {
  if (!WEB_BASE_URL) {
    throw new Error('EXPO_PUBLIC_WEB_URL is not configured in .env');
  }

  const redirectUri = Linking.createURL('auth');
  const authUrl = `${WEB_BASE_URL}/mobile-auth?redirect_uri=${encodeURIComponent(redirectUri)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in was cancelled.');
  }

  return completeSessionFromRedirectUrl(result.url);
};

export const completeSessionFromRedirectUrl = async (url: string): Promise<AuthResponse> => {
  const parsed = Linking.parse(url);
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
