import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import {
  signInWithGoogleMobileBridge,
  completeSessionFromRedirectUrl,
} from '../../lib/api';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function AuthScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle deep-link return if Android OS opens notesbywinner://auth?token=... directly
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      if (url && url.includes('token=')) {
        try {
          setLoading(true);
          await completeSessionFromRedirectUrl(url);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/notes');
        } catch (err: any) {
          setErrorMsg(err.message || 'Could not complete Google sign-in.');
        } finally {
          setLoading(false);
        }
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url && url.includes('token=')) {
        handleUrl({ url });
      }
    });

    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub.remove();
  }, [router]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await signInWithGoogleMobileBridge();

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/notes');
    } catch (err: any) {
      if (err.message !== 'Google sign-in was cancelled.') {
        setErrorMsg(err.message || 'Authentication failed. Please try again.');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.content}>
        {/* Top Brand Row */}
        <View style={styles.brandRow}>
          <View
            style={[
              styles.brandIcon,
              {
                backgroundColor: colors.accent,
                borderColor: colors.accent,
              },
            ]}
          >
            <Feather name="feather" size={16} color={colors.accentText} />
          </View>
          <Text style={[styles.brandTitle, { color: colors.text }]}>
            Notes <Text style={{ color: colors.textMuted, fontWeight: '400' }}>by Winner</Text>
          </Text>
        </View>

        {/* Main Editorial Hero */}
        <View style={styles.heroSection}>
          <Text style={[styles.headline, { color: colors.text }]}>
            Write it down.{'\n'}
            <Text style={[styles.headlineMuted, { color: colors.textMuted }]}>
              It’s already synced.
            </Text>
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            A quiet, distraction-free space for your thoughts. Capture ideas offline on your phone and find them waiting on your computer.
          </Text>
        </View>

        {/* Sign-In Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {errorMsg ? (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.errorText, { color: colors.text }]}>{errorMsg}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.googleButton,
              { backgroundColor: colors.accent },
              loading && { opacity: 0.7 },
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.accentText} size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={17} color={colors.accentText} />
                <Text style={[styles.googleButtonText, { color: colors.accentText }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Ionicons name="checkmark" size={13} color={colors.text} />
              <Text style={[styles.trustText, { color: colors.textMuted }]}>
                Works 100% offline
              </Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="checkmark" size={13} color={colors.text} />
              <Text style={[styles.trustText, { color: colors.textMuted }]}>
                Synced with Web Studio
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  heroSection: {
    marginVertical: 24,
  },
  headline: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.4,
    lineHeight: 46,
    marginBottom: 16,
  },
  headlineMuted: {
    fontWeight: '400',
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 48,
    borderRadius: 12,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
