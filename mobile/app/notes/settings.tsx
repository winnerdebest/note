import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, ThemeMode } from '../../lib/theme';
import { getStoredUser, clearAuthSession } from '../../lib/api';
import { getLocalNotes, getTrashedNotes } from '../../lib/db';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-root-toast';

export default function SettingsScreen() {
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [userProvider, setUserProvider] = useState('Email');
  const [stats, setStats] = useState({ total: 0, trashed: 0 });

  useEffect(() => {
    const loadUser = async () => {
      const user = await getStoredUser();
      if (user) {
        setUserEmail(user.email || '');
      }
    };
    const loadStats = async () => {
      const total = await getLocalNotes();
      const trashed = await getTrashedNotes();
      setStats({ total: total.length, trashed: trashed.length });
    };
    loadUser();
    loadStats();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your local notes will remain on this device.',
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
    { label: 'Light', value: 'light', icon: 'sunny' },
    { label: 'Dark', value: 'dark', icon: 'moon' },
    { label: 'System', value: 'system', icon: 'settings' },
  ];

  const SettingRow = ({
    icon, label, value, onPress, danger, right, noBorder
  }: {
    icon: string;
    label: string;
    value?: string;
    onPress?: () => void;
    danger?: boolean;
    right?: React.ReactNode;
    noBorder?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.settingRow,
        { borderBottomColor: colors.border, borderBottomWidth: noBorder ? 0 : 1 }
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: danger ? colors.dangerSoft : colors.accentSoft }]}>
        <Ionicons name={icon as any} size={20} color={danger ? colors.danger : colors.accent} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
        {value && <Text style={[styles.settingValue, { color: colors.textMuted }]}>{value}</Text>}
      </View>
      {right || (onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />)}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>{userEmail ? userEmail[0].toUpperCase() : '?'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileEmail, { color: colors.text }]} numberOfLines={1}>{userEmail || 'User'}</Text>
            <View style={[styles.providerBadge, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.providerText, { color: colors.accent }]}>{userProvider} Account</Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Notes</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.trashed}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Trashed</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APPEARANCE</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.themeSelector}>
            {themeOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: themeMode === opt.value ? colors.accent : 'transparent',
                    borderColor: themeMode === opt.value ? colors.accent : colors.border,
                  }
                ]}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setThemeMode(opt.value);
                }}
              >
                <Ionicons 
                  name={(themeMode === opt.value ? opt.icon : opt.icon + '-outline') as any} 
                  size={20} 
                  color={themeMode === opt.value ? '#FFF' : colors.textSecondary} 
                />
                <Text style={[
                  styles.themeOptionText,
                  { color: themeMode === opt.value ? '#FFF' : colors.textSecondary }
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>STORAGE & SYNC</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow 
            icon="cloud-done-outline" 
            label="Automatic Sync" 
            right={<Text style={{ color: colors.success, fontSize: 13, fontWeight: '700' }}>ENABLED</Text>}
          />
          <SettingRow 
            icon="trash-bin-outline" 
            label="Empty Trash" 
            onPress={() => router.push('/notes/trash')}
          />
          <SettingRow 
            icon="information-circle-outline" 
            label="Version" 
            value="1.0.0 (Premium)" 
            noBorder
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ACCOUNT</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow 
            icon="log-out-outline" 
            label="Sign Out" 
            danger 
            onPress={handleLogout}
            noBorder
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Mindful Canvas</Text>
          <Text style={[styles.footerSub, { color: colors.textMuted + '80' }]}>Built for your peace of mind</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileEmail: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  providerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  providerText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  section: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: { flex: 1 },
  settingLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  settingValue: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  themeSelector: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    gap: 4,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  footerSub: {
    fontSize: 12,
    fontWeight: '500',
  },
});
