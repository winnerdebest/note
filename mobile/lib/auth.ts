import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredUser, clearAuthSession } from './api';

const CACHED_USER_ID_KEY = 'mindfulcanvas_cached_user_id';

/**
 * Gets the current user ID. 
 * Checks stored user session, falling back to local cached ID for offline access.
 */
export const getUserId = async (): Promise<string | null> => {
  try {
    const user = await getStoredUser();
    if (user?.id) {
      await AsyncStorage.setItem(CACHED_USER_ID_KEY, user.id);
      return user.id;
    }
    return AsyncStorage.getItem(CACHED_USER_ID_KEY);
  } catch (e) {
    console.error('Error getting user ID:', e);
    return AsyncStorage.getItem(CACHED_USER_ID_KEY);
  }
};

/**
 * Clears the cached user ID on sign out.
 */
export const clearCachedUserId = async () => {
  await clearAuthSession();
};
