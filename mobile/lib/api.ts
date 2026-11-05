import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, DeviceEventEmitter } from 'react-native';

const DEFAULT_URL = Platform.select({
  android: 'http://10.0.2.2:8000',
  default: 'http://localhost:8000',
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;

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

export const register = async (email: string, password: string): Promise<AuthResponse> => {
  const data = await apiFetch('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await setAuthSession(data.access_token, data.user);
  return data;
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const data = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await setAuthSession(data.access_token, data.user);
  return data;
};

export const getMe = async (): Promise<User> => {
  const user = await apiFetch('/api/v1/auth/me');
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  await AsyncStorage.setItem('mindfulcanvas_cached_user_id', user.id);
  return user;
};
