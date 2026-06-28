import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield, ShieldOff, Clock, AlertTriangle, ChevronRight, ShieldCheck, ShieldAlert } from 'lucide-react-native';
import { theme } from '@/lib/theme';
import { fetchGuardSettings, updateGuardSettings, fetchControlledApps, fetchTodayUsage } from '@/lib/data';
import { checkAllPermissions, areAllPermissionsGranted, type PermissionState } from '@/lib/permissions';
import { formatMinutes } from '@/lib/utils';
import type { GuardSettings, ControlledApp, UsageRecord } from '@/types';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [settings, setSettings] = useState<GuardSettings | null>(null);
  const [apps, setApps] = useState<ControlledApp[]>([]);
  const [todayUsage, setTodayUsage] = useState<UsageRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [s, a, u, p] = await Promise.all([
        fetchGuardSettings(),
        fetchControlledApps(),
        fetchTodayUsage(),
        checkAllPermissions(),
      ]);
      setSettings(s);
      setApps(a);
      setTodayUsage(u);
      setPermissions(p);
    } catch (e) {
      setError('数据加载失败,请检查网络后下拉刷新');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleGuard = async () => {
    if (!settings || toggling) return;
    setToggling(true);
    try {
      const updated = await updateGuardSettings(
        !settings.is_guard_enabled,
        settings.reminder_before_minutes
      );
      setSettings(updated);
    } catch {
      setError('切换失败,请重试');
    } finally {
      setToggling(false);
    }
  };

  const controlledCount = apps.filter((a) => a.is_controlled).length;
  const todayTotalMinutes = todayUsage.reduce((sum, r) => sum + r.used_minutes, 0);
  const totalLimit = apps
    .filter((a) => a.is_controlled)
    .reduce((sum, a) => sum + a.daily_limit_minutes, 0);
  const remainingMinutes = Math.max(0, totalLimit - todayTotalMinutes);
  const isOverLimit = todayTotalMinutes >= totalLimit && totalLimit > 0;
  const allPermissionsGranted = permissions ? areAllPermissionsGranted(permissions) : true;
  const isAndroid = Platform.OS === 'android';

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[theme.colors.primary]} />}>
      <View style={styles.headerSection}>
        <Text style={styles.greeting}>亲子守护</Text>
        <Text style={styles.greetingSub}>守护孩子健康游戏</Text>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {isAndroid && !allPermissionsGranted ? (
        <Pressable
          style={({ pressed }) => [styles.permissionCard, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/(tabs)/profile')}>
          <View style={styles.permissionLeft}>
            <View style={styles.permissionIconWrap}>
              <ShieldAlert size={24} color={theme.colors.error} strokeWidth={2} />
            </View>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionTitle}>需要开启权限</Text>
              <Text style={styles.permissionDesc}>
                点击前往设置,开启使用时长统计和悬浮窗权限
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={theme.colors.error} strokeWidth={2} />
        </Pressable>
      ) : null}

      <View style={styles.guardCard}>
        <View style={styles.guardCardTop}>
          <View style={styles.guardIconWrap}>
            {settings?.is_guard_enabled ? (
              <Shield size={36} color={theme.colors.surface} strokeWidth={2} />
            ) : (
              <ShieldOff size={36} color={theme.colors.surface} strokeWidth={2} />
            )}
          </View>
          <View style={styles.guardInfo}>
            <Text style={styles.guardStatus}>
              {settings?.is_guard_enabled ? '管控已开启' : '管控已关闭'}
            </Text>
            <Text style={styles.guardDesc}>
              {settings?.is_guard_enabled
                ? `正在守护 ${controlledCount} 个应用`
                : '点击下方按钮开启守护'}
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.toggleButton,
            settings?.is_guard_enabled ? styles.toggleOn : styles.toggleOff,
            pressed && { opacity: 0.85 },
          ]}
          onPress={handleToggleGuard}
          disabled={toggling}>
          {toggling ? (
            <ActivityIndicator color={theme.colors.surface} />
          ) : (
            <Text style={styles.toggleText}>
              {settings?.is_guard_enabled ? '一键关闭管控' : '一键开启管控'}
            </Text>
          )}
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Clock size={22} color={theme.colors.primary} strokeWidth={2} />
          <Text style={styles.statValue}>{formatMinutes(todayTotalMinutes)}</Text>
          <Text style={styles.statLabel}>今日已用</Text>
        </View>
        <View style={styles.statCard}>
          <Clock size={22} color={theme.colors.secondary} strokeWidth={2} />
          <Text style={styles.statValue}>{formatMinutes(remainingMinutes)}</Text>
          <Text style={styles.statLabel}>今日剩余</Text>
        </View>
      </View>

      {isOverLimit ? (
        <View style={styles.alertBanner}>
          <AlertTriangle size={20} color={theme.colors.error} strokeWidth={2} />
          <Text style={styles.alertText}>今日游戏时长已达上限,建议提醒孩子休息</Text>
        </View>
      ) : null}

      {isAndroid && allPermissionsGranted ? (
        <View style={styles.protectedBanner}>
          <ShieldCheck size={18} color={theme.colors.success} strokeWidth={2} />
          <Text style={styles.protectedText}>所有权限已开启,孩子正在被守护中</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.navCard, pressed && { opacity: 0.7 }]}
        onPress={() => router.push('/(tabs)/apps')}>
        <View style={styles.navCardLeft}>
          <View style={[styles.navIconWrap, { backgroundColor: theme.colors.primarySoft }]}>
            <Shield size={20} color={theme.colors.primary} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.navTitle}>应用管控</Text>
            <Text style={styles.navSub}>{controlledCount} 个应用受控中</Text>
          </View>
        </View>
        <ChevronRight size={20} color={theme.colors.textLight} strokeWidth={2} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.navCard, pressed && { opacity: 0.7 }]}
        onPress={() => router.push('/(tabs)/stats')}>
        <View style={styles.navCardLeft}>
          <View style={[styles.navIconWrap, { backgroundColor: theme.colors.secondaryLight }]}>
            <Clock size={20} color={theme.colors.secondary} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.navTitle}>时长统计</Text>
            <Text style={styles.navSub}>查看每日每周使用情况</Text>
          </View>
        </View>
        <ChevronRight size={20} color={theme.colors.textLight} strokeWidth={2} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    gap: 12,
  },
  loadingText: {
    fontSize: theme.fontSizes.body,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
  },
  headerSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  greeting: {
    fontSize: theme.fontSizes.largeHeading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },
  greetingSub: {
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  errorBanner: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: '#FDEDE9',
    borderRadius: theme.radius.md,
  },
  errorText: {
    fontSize: theme.fontSizes.body,
    color: theme.colors.error,
    fontFamily: theme.fonts.regular,
  },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: '#FDEDE9',
    borderRadius: theme.radius.lg,
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  permissionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: theme.fontSizes.subtitle,
    fontFamily: theme.fonts.bold,
    color: theme.colors.error,
  },
  permissionDesc: {
    fontSize: theme.fontSizes.caption,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  guardCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  guardCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  guardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guardInfo: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  guardStatus: {
    fontSize: theme.fontSizes.title,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },
  guardDesc: {
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  toggleButton: {
    paddingVertical: 16,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: theme.colors.primary,
  },
  toggleOff: {
    backgroundColor: theme.colors.textLight,
  },
  toggleText: {
    fontSize: theme.fontSizes.subtitle,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textOnPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    gap: 6,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: theme.fontSizes.title,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: theme.fontSizes.caption,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: '#FDEDE9',
    borderRadius: theme.radius.md,
    gap: theme.spacing.sm,
  },
  alertText: {
    flex: 1,
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.regular,
    color: theme.colors.error,
  },
  protectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: '#E8F6E8',
    borderRadius: theme.radius.md,
    gap: theme.spacing.sm,
  },
  protectedText: {
    flex: 1,
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.regular,
    color: theme.colors.success,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  navCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  navIconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: theme.fontSizes.subtitle,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },
  navSub: {
    fontSize: theme.fontSizes.caption,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
