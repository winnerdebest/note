import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Platform, AppStateStatus, useColorScheme, DeviceEventEmitter } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootSiblingParent } from 'react-native-root-siblings';
import * as Network from 'expo-network';
import { initDb } from '../lib/db';
import { runSync } from '../lib/sync';
import { ThemeContext, ThemeMode, getColors } from '../lib/theme';
import { getUserId } from '../lib/auth';
import { getStoredUser, getToken, User } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'mindfulcanvas_theme_mode';

export default function RootLayout() {
  const [session, setSession] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const segments = useSegments();
  const router = useRouter();
  const systemColorScheme = useColorScheme();

  // Determine if dark based on mode
  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';
  const colors = getColors(isDark);

  // Load saved theme on startup
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeModeState(saved);
      }
    });
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_KEY, mode);
  };

  useEffect(() => {
    const setup = async () => {
      await initDb();
      await getUserId(); // Prime the cache
      const token = await getToken();
      const user = await getStoredUser();
      if (token && user) {
        setSession(user);
        runSync();
      } else {
        setSession(null);
      }
      setInitialized(true);
    };
    setup();

    const sub = DeviceEventEmitter.addListener('auth_state_changed', (newUser: User | null) => {
      setSession(newUser);
      if (newUser) {
        runSync();
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === 'auth';
    const inNotesGroup = segments[0] === 'notes';

    if (!session && !inAuthGroup) {
      router.replace('/auth');
    } else if (session && !inNotesGroup) {
      router.replace('/notes');
    }
  }, [session, initialized, segments]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && session) {
        runSync();
      }
    });

    const networkInterval = setInterval(async () => {
      if (!session) return;
      const netInfo = await Network.getNetworkStateAsync();
      if (netInfo.isConnected && netInfo.isInternetReachable) {
        runSync();
      }
    }, 15000);

    return () => {
      subscription.remove();
      clearInterval(networkInterval);
    };
  }, [session]);

  if (!initialized) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ colors, isDark, themeMode, setThemeMode }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootSiblingParent>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="auth/index" />
            <Stack.Screen name="notes/index" />
            <Stack.Screen name="notes/[id]" />
            <Stack.Screen name="notes/trash" />
            <Stack.Screen name="notes/settings" />
          </Stack>
        </RootSiblingParent>
      </GestureHandlerRootView>
    </ThemeContext.Provider>
  );
}
