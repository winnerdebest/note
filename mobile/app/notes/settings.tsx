import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, ThemeMode } from '../../lib/theme';
import { getStoredUser, clearAuthSession } from '../../lib/api';
import { getLocalNotes, getTrashedNotes } from '../../lib/db';
import { runSync } from '../../lib/sync';
import * as Haptics from 'expo-haptics';
import { Feather, Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';

export default function SettingsScreen() {
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [stats, setStats] = useState({ total: 0, trashed: 0 });
  const [syncingNow, setSyncingNow] = useState(false);

  useEffect(() => {
    const loadUserAndStats = async () => {
      const user = await getStoredUser();
      if (user) {
        setUserEmail(user.email || '');
        setUserId(user.id || '');
      }
      const total = await getLocalNotes();
      const trashed = await getTrashedNotes();
      setStats({ total: total.length, trashed: trashed.length });
    };
    loadUserAndStats();
  }, []);

  const handleManualSync = async () => {
    setSyncingNow(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await runSync();
    const total = await getLocalNotes();
    const trashed = await getTrashedNotes();
    setStats({ total: total.length, trashed: trashed.length });
    setSyncingNow(false);
    Toast.show('Workspace synced', {
      duration: Toast.durations.SHORT,
      position: Toast.positions.BOTTOM,
      backgroundColor: colors.text,
      textColor: colors.background,
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Sign out of Notes by Winner on this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await clearAuthSession();
            router.replace('/auth');
          },
        },
      ]
    );
  };

  const themeOptions: { label: string; value: ThemeMode; icon: string }[] = [
    { label: 'Light (Paper)', value: 'light', icon: 'sun' },
    { label: 'Dark (Ink)', value: 'dark', icon: 'moon' },
    { label: 'System', value: 'system', icon: 'smartphone' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Studio Top Bar */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Feather name="arrow-left" size={15} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Workspace Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* 01 / Account */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>01 / ACCOUNT</Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.profileRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Feather name="user" size={18} color={colors.text} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileEmail, { color: colors.text }]} numberOfLines={1}>
                {userEmail || 'Personal Workspace'}
              </Text>
              <View style={styles.syncBadgeRow}>
                <View style={[styles.syncDot, { backgroundColor: colors.text }]} />
                <Text style={[styles.syncBadgeText, { color: colors.textMuted }]}>
                  Google Account · Synced across Web & Android
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Active Notes</Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>{stats.total}</Text>
          </View>
          <View style={[styles.metaRow, { marginTop: 6 }]}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>In Trash</Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>{stats.trashed}</Text>
          </View>
          {userId ? (
            <View style={[styles.metaRow, { marginTop: 6 }]}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Account ID</Text>
              <Text
                style={[styles.metaValue, { color: colors.textMuted, maxWidth: 180 }]}
                numberOfLines={1}
              >
                {userId}
              </Text>
            </View>
          ) : null}
        </View>

        {/* 02 / Appearance */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>02 / APPEARANCE</Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.themeGrid}>
            {themeOptions.map((opt) => {
              const active = themeMode === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.themeCard,
                    {
                      backgroundColor: active ? colors.accent : colors.surface,
                      borderColor: active ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setThemeMode(opt.value);
                  }}
                >
                  <Feather
                    name={opt.icon as any}
                    size={16}
                    color={active ? colors.accentText : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: active ? colors.accentText : colors.textSecondary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 03 / Sync & Storage */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>03 / SYNC & STORAGE</Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 6 },
          ]}
        >
          <TouchableOpacity style={styles.rowItem} onPress={handleManualSync}>
            <View style={styles.rowLeft}>
              <Feather name="refresh-cw" size={15} color={colors.text} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                {syncingNow ? 'Syncing now…' : 'Sync Workspace Now'}
              </Text>
            </View>
            <Text style={[styles.rowRightLabel, { color: colors.textMuted }]}>Tap to sync</Text>
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.rowItem}
            onPress={() => router.push('/notes/trash')}
          >
            <View style={styles.rowLeft}>
              <Feather name="trash-2" size={15} color={colors.text} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Manage Trash</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={[
            styles.signOutBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={15} color={colors.text} />
          <Text style={[styles.signOutText, { color: colors.text }]}>
            Sign Out of Workspace
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerBrand, { color: colors.text }]}>
            Notes <Text style={{ color: colors.textMuted, fontWeight: '400' }}>by Winner</Text>
          </Text>
          <Text style={[styles.footerSub, { color: colors.textMuted }]}>
            Version 1.0.0 · Web & Android
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 22,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileEmail: {
    fontSize: 15,
    fontWeight: '600',
  },
  syncBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncBadgeText: {
    fontSize: 11,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  themeCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 7,
  },
  themeLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  rowRightLabel: {
    fontSize: 11,
  },
  rowDivider: {
    height: 1,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 28,
    gap: 4,
  },
  footerBrand: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerSub: {
    fontSize: 11,
  },
});
