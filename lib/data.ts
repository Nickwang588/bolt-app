import { supabase } from './supabase';
import { getTodayScreenTime, getScreenTimeForDate, getWeeklyScreenTime } from './usagetracker';
import { isNativeModuleAvailable } from './permissions';
import type { ControlledApp, UsageRecord, GuardSettings, DailyUsageSummary } from '@/types';

const DEFAULT_APPS = [
  { app_name: '王者荣耀', app_icon: '🎮', daily_limit_minutes: 30, is_controlled: true, package_name: 'com.tencent.tmgp.sgame' },
  { app_name: '和平精英', app_icon: '🔫', daily_limit_minutes: 30, is_controlled: true, package_name: 'com.tencent.tmgp.pubgmhd' },
  { app_name: '我的世界', app_icon: '🧱', daily_limit_minutes: 45, is_controlled: true, package_name: 'com.mojang.minecraftpe' },
  { app_name: '抖音', app_icon: '🎵', daily_limit_minutes: 20, is_controlled: false, package_name: 'com.ss.android.ugc.aweme' },
  { app_name: '迷你世界', app_icon: '🌍', daily_limit_minutes: 30, is_controlled: true, package_name: 'com.minitech.miniworld' },
];

export async function fetchGuardSettings(): Promise<GuardSettings> {
  const { data, error } = await supabase
    .from('guard_settings')
    .select('*')
    .limit(1)
    .single();
  if (error) throw error;
  return data;
}

export async function updateGuardSettings(
  isGuardEnabled: boolean,
  reminderBeforeMinutes: number
): Promise<GuardSettings> {
  const { data: existing } = await supabase
    .from('guard_settings')
    .select('id')
    .limit(1)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('guard_settings')
      .update({
        is_guard_enabled: isGuardEnabled,
        reminder_before_minutes: reminderBeforeMinutes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('guard_settings')
    .insert({
      is_guard_enabled: isGuardEnabled,
      reminder_before_minutes: reminderBeforeMinutes,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchControlledApps(): Promise<ControlledApp[]> {
  const { data, error } = await supabase
    .from('controlled_apps')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;

  if (!data || data.length === 0) {
    const inserted = await seedDefaultApps();
    return inserted;
  }
  return data;
}

async function seedDefaultApps(): Promise<ControlledApp[]> {
  const { data, error } = await supabase
    .from('controlled_apps')
    .insert(DEFAULT_APPS)
    .select('*');
  if (error) throw error;
  return data;
}

export async function addControlledApp(
  appName: string,
  appIcon: string,
  dailyLimitMinutes: number,
  packageName?: string
): Promise<ControlledApp> {
  const { data, error } = await supabase
    .from('controlled_apps')
    .insert({
      app_name: appName,
      app_icon: appIcon,
      daily_limit_minutes: dailyLimitMinutes,
      is_controlled: true,
      package_name: packageName || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateControlledApp(
  id: string,
  updates: Partial<Pick<ControlledApp, 'daily_limit_minutes' | 'is_controlled' | 'app_name' | 'app_icon' | 'package_name'>>
): Promise<ControlledApp> {
  const { data, error } = await supabase
    .from('controlled_apps')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteControlledApp(id: string): Promise<void> {
  const { error } = await supabase.from('controlled_apps').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchTodayUsage(): Promise<UsageRecord[]> {
  if (isNativeModuleAvailable()) {
    return fetchRealTodayUsage();
  }

  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('usage_records')
    .select('*')
    .eq('usage_date', today);
  if (error) throw error;
  return data || [];
}

async function fetchRealTodayUsage(): Promise<UsageRecord[]> {
  const screenTime = await getTodayScreenTime();
  const apps = await fetchControlledApps();

  const records: UsageRecord[] = [];
  for (const app of apps) {
    if (!app.package_name) continue;
    const usage = screenTime.appUsages.find((u) => u.packageName === app.package_name);
    if (usage && usage.foregroundMinutes > 0) {
      records.push({
        id: `${app.id}_${screenTime.date}`,
        app_id: app.id,
        app_name: app.app_name,
        usage_date: screenTime.date,
        used_minutes: usage.foregroundMinutes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  return records;
}

export async function fetchUsageByDateRange(
  startDate: string,
  endDate: string
): Promise<UsageRecord[]> {
  if (isNativeModuleAvailable()) {
    return fetchRealUsageByDateRange(startDate, endDate);
  }

  const { data, error } = await supabase
    .from('usage_records')
    .select('*')
    .gte('usage_date', startDate)
    .lte('usage_date', endDate)
    .order('usage_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchRealUsageByDateRange(
  startDate: string,
  endDate: string
): Promise<UsageRecord[]> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const apps = await fetchControlledApps();
  const records: UsageRecord[] = [];

  const current = new Date(start);
  while (current <= end) {
    const screenTime = await getScreenTimeForDate(new Date(current));
    for (const app of apps) {
      if (!app.package_name) continue;
      const usage = screenTime.appUsages.find((u) => u.packageName === app.package_name);
      if (usage && usage.foregroundMinutes > 0) {
        records.push({
          id: `${app.id}_${screenTime.date}`,
          app_id: app.id,
          app_name: app.app_name,
          usage_date: screenTime.date,
          used_minutes: usage.foregroundMinutes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return records;
}

export async function addUsageMinutes(
  appId: string,
  appName: string,
  minutes: number
): Promise<UsageRecord> {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabase
    .from('usage_records')
    .select('*')
    .eq('app_id', appId)
    .eq('usage_date', today)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('usage_records')
      .update({
        used_minutes: existing.used_minutes + minutes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('usage_records')
    .insert({
      app_id: appId,
      app_name: appName,
      usage_date: today,
      used_minutes: minutes,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchDailyUsageSummary(days: number): Promise<DailyUsageSummary[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);

  const startDate = start.toISOString().split('T')[0];
  const endDate = end.toISOString().split('T')[0];

  const records = await fetchUsageByDateRange(startDate, endDate);

  const summaryMap = new Map<string, DailyUsageSummary>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    summaryMap.set(dateStr, { date: dateStr, total_minutes: 0, app_breakdown: [] });
  }

  for (const record of records) {
    const summary = summaryMap.get(record.usage_date);
    if (summary) {
      summary.total_minutes += record.used_minutes;
      const existing = summary.app_breakdown.find((b) => b.app_name === record.app_name);
      if (existing) {
        existing.minutes += record.used_minutes;
      } else {
        summary.app_breakdown.push({ app_name: record.app_name, minutes: record.used_minutes });
      }
    }
  }

  return Array.from(summaryMap.values());
}

export async function fetchWeeklyScreenTimeSummary(): Promise<DailyUsageSummary[]> {
  if (!isNativeModuleAvailable()) {
    return fetchDailyUsageSummary(7);
  }

  const weeklyData = await getWeeklyScreenTime();
  const apps = await fetchControlledApps();

  return weeklyData.map((day) => {
    const app_breakdown: { app_name: string; minutes: number }[] = [];
    let total_minutes = 0;

    for (const app of apps) {
      if (!app.package_name) continue;
      const usage = day.appUsages.find((u) => u.packageName === app.package_name);
      if (usage && usage.foregroundMinutes > 0) {
        app_breakdown.push({ app_name: app.app_name, minutes: usage.foregroundMinutes });
        total_minutes += usage.foregroundMinutes;
      }
    }

    return {
      date: day.date,
      total_minutes,
      app_breakdown,
    };
  });
}
