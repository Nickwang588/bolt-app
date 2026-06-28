import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, TrendingUp, Clock } from 'lucide-react-native';
import { theme } from '@/lib/theme';
import { fetchDailyUsageSummary, fetchWeeklyScreenTimeSummary } from '@/lib/data';
import { isNativeModuleAvailable } from '@/lib/permissions';
import { formatMinutes, formatDate, getWeekday } from '@/lib/utils';
import type { DailyUsageSummary } from '@/types';

type TabKey = 'week' | 'day';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>('week');
  const [summaries, setSummaries] = useState<DailyUsageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const days = activeTab === 'week' ? 7 : 1;
      const data = isNativeModuleAvailable() && days === 7
        ? await fetchWeeklyScreenTimeSummary()
        : await fetchDailyUsageSummary(days);
      setSummaries(data);
    } catch {
      setError('数据加载失败,请下拉刷新');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const totalMinutes = summaries.reduce((sum, s) => sum + s.total_minutes, 0);
  const avgMinutes = summaries.length > 0 ? Math.round(totalMinutes / summaries.length) : 0;
  const maxMinutes = Math.max(...summaries.map((s) => s.total_minutes), 1);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>时长统计</Text>
        <Text style={styles.subtitle}>查看孩子游戏使用情况</Text>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={({ pressed }) => [
            styles.tabBtn,
            activeTab === 'week' && styles.tabBtnActive,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => setActiveTab('week')}>
          <Text style={[styles.tabText, activeTab === 'week' && styles.tabTextActive]}>本周</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.tabBtn,
            activeTab === 'day' && styles.tabBtnActive,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => setActiveTab('day')}>
          <Text style={[styles.tabText, activeTab === 'day' && styles.tabTextActive]}>今日</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[theme.colors.primary]} />}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Clock size={20} color={theme.colors.primary} strokeWidth={2} />
            <Text style={styles.summaryValue}>{formatMinutes(totalMinutes)}</Text>
            <Text style={styles.summaryLabel}>{activeTab === 'week' ? '本周总时长' : '今日总时长'}</Text>
          </View>
          {activeTab === 'week' ? (
            <View style={styles.summaryCard}>
              <TrendingUp size={20} color={theme.colors.secondary} strokeWidth={2} />
              <Text style={styles.summaryValue}>{formatMinutes(avgMinutes)}</Text>
              <Text style={styles.summaryLabel}>日均时长</Text>
            </View>
          ) : null}
        </View>

        {activeTab === 'week' ? (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Calendar size={18} color={theme.colors.textSecondary} strokeWidth={2} />
              <Text style={styles.chartTitle}>每日使用时长</Text>
            </View>
            <View style={styles.chartBody}>
              {summaries.map((s) => {
                const barHeight = Math.max(4, (s.total_minutes / maxMinutes) * 120);
                return (
                  <View key={s.date} style={styles.barCol}>
                    <Text style={styles.barValue}>{s.total_minutes}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: barHeight }]} />
                    </View>
                    <Text style={styles.barWeekday}>{getWeekday(s.date)}</Text>
                    <Text style={styles.barDate}>{formatDate(s.date).replace('月', '/').replace('日', '')}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>
            {activeTab === 'week' ? '本周明细' : '今日明细'}
          </Text>
          {summaries.length === 0 || totalMinutes === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>暂无使用记录</Text>
            </View>
          ) : (
            summaries
              .filter((s) => s.total_minutes > 0)
              .flatMap((s) =>
                s.app_breakdown.map((b, idx) => (
                  <View key={`${s.date}-${b.app_name}-${idx}`} style={styles.detailRow}>
                    <View style={styles.detailLeft}>
                      <Text style={styles.detailIcon}>{'🎮'}</Text>
                      <View>
                        <Text style={styles.detailAppName}>{b.app_name}</Text>
                        <Text style={styles.detailDate}>
                          {formatDate(s.date)} {getWeekday(s.date)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.detailMinutes}>{formatMinutes(b.minutes)}</Text>
                  </View>
                ))
              )
          )}
        </View>
      </ScrollView>
    </View>
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
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: theme.fontSizes.heading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  tabBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.textOnPrimary,
    fontFamily: theme.fonts.bold,
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
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  summaryCard: {
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
  summaryValue: {
    fontSize: theme.fontSizes.title,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },
  summaryLabel: {
    fontSize: theme.fontSizes.caption,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
  chartCard: {
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
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  chartTitle: {
    fontSize: theme.fontSizes.subtitle,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },
  chartBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 180,
    paddingTop: theme.spacing.sm,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barValue: {
    fontSize: 10,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  barTrack: {
    flex: 1,
    width: 24,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
  },
  barWeekday: {
    fontSize: 10,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  barDate: {
    fontSize: 9,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textLight,
  },
  detailCard: {
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  detailTitle: {
    fontSize: theme.fontSizes.subtitle,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  emptyState: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textLight,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  detailIcon: {
    fontSize: 24,
  },
  detailAppName: {
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textPrimary,
  },
  detailDate: {
    fontSize: theme.fontSizes.caption,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  detailMinutes: {
    fontSize: theme.fontSizes.subtitle,
    fontFamily: theme.fonts.bold,
    color: theme.colors.primary,
  },
});
