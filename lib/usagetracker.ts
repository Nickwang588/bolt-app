import { Platform, NativeModules } from 'react-native';

export type AppUsageInfo = {
  packageName: string;
  appName: string;
  foregroundMinutes: number;
  lastUsed: number;
};

export type DailyScreenTime = {
  date: string;
  totalMinutes: number;
  appUsages: AppUsageInfo[];
};

const { KidsGuardNative = {} } = NativeModules;

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getTodayScreenTime(): Promise<DailyScreenTime> {
  return getScreenTimeForDate(new Date());
}

export async function getScreenTimeForDate(date: Date): Promise<DailyScreenTime> {
  const dateStr = formatDate(date);

  if (Platform.OS !== 'android' || !KidsGuardNative.getUsageStatsForDate) {
    return { date: dateStr, totalMinutes: 0, appUsages: [] };
  }

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const rawUsages: Array<{
      packageName: string;
      appName: string;
      foregroundMs: number;
      lastUsed: number;
    }> = await KidsGuardNative.getUsageStatsForDate(
      startOfDay.getTime(),
      endOfDay.getTime()
    );

    const appUsages: AppUsageInfo[] = rawUsages
      .map((u) => ({
        packageName: u.packageName,
        appName: u.appName,
        foregroundMinutes: Math.round(u.foregroundMs / 60000),
        lastUsed: u.lastUsed,
      }))
      .filter((u) => u.foregroundMinutes > 0)
      .sort((a, b) => b.foregroundMinutes - a.foregroundMinutes);

    const totalMinutes = appUsages.reduce((sum, u) => sum + u.foregroundMinutes, 0);

    return { date: dateStr, totalMinutes, appUsages };
  } catch {
    return { date: dateStr, totalMinutes: 0, appUsages: [] };
  }
}

export async function getScreenTimeForRange(
  startDate: Date,
  endDate: Date
): Promise<DailyScreenTime[]> {
  const results: DailyScreenTime[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayData = await getScreenTimeForDate(new Date(current));
    results.push(dayData);
    current.setDate(current.getDate() + 1);
  }

  return results;
}

export async function getWeeklyScreenTime(): Promise<DailyScreenTime[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return getScreenTimeForRange(start, end);
}

export async function getAppUsageForPackage(
  packageName: string,
  date: Date
): Promise<number> {
  const dayData = await getScreenTimeForDate(date);
  const usage = dayData.appUsages.find((u) => u.packageName === packageName);
  return usage ? usage.foregroundMinutes : 0;
}
