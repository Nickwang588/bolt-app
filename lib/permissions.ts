import { Platform, NativeModules, Linking } from 'react-native';

export type PermissionType = 'usage_stats' | 'overlay' | 'battery' | 'notifications';

export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'not_determined';

export type PermissionState = {
  usage_stats: PermissionStatus;
  overlay: PermissionStatus;
  battery: PermissionStatus;
  notifications: PermissionStatus;
};

const { KidsGuardNative = {} } = NativeModules;

export function isNativeModuleAvailable(): boolean {
  return Platform.OS === 'android' && !!KidsGuardNative.checkUsageStatsPermission;
}

export async function checkPermission(type: PermissionType): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') return 'granted';

  try {
    if (type === 'usage_stats' && KidsGuardNative.checkUsageStatsPermission) {
      return (await KidsGuardNative.checkUsageStatsPermission()) ? 'granted' : 'denied';
    }
    if (type === 'overlay' && KidsGuardNative.checkOverlayPermission) {
      return (await KidsGuardNative.checkOverlayPermission()) ? 'granted' : 'denied';
    }
    if (type === 'battery' && KidsGuardNative.checkBatteryOptimization) {
      return (await KidsGuardNative.checkBatteryOptimization()) ? 'granted' : 'denied';
    }
    if (type === 'notifications' && KidsGuardNative.checkNotificationPermission) {
      return (await KidsGuardNative.checkNotificationPermission()) ? 'granted' : 'denied';
    }
  } catch {
    return 'denied';
  }
  return 'not_determined';
}

export async function requestPermission(type: PermissionType): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') return 'granted';

  try {
    if (type === 'usage_stats') {
      if (KidsGuardNative.requestUsageStatsPermission) {
        await KidsGuardNative.requestUsageStatsPermission();
      } else {
        await Linking.openSettings();
      }
      return await checkPermission('usage_stats');
    }
    if (type === 'overlay') {
      if (KidsGuardNative.requestOverlayPermission) {
        await KidsGuardNative.requestOverlayPermission();
      } else {
        await Linking.openSettings();
      }
      return await checkPermission('overlay');
    }
    if (type === 'battery') {
      if (KidsGuardNative.requestIgnoreBatteryOptimization) {
        await KidsGuardNative.requestIgnoreBatteryOptimization();
      } else {
        await Linking.openSettings();
      }
      return await checkPermission('battery');
    }
    if (type === 'notifications') {
      if (KidsGuardNative.requestNotificationPermission) {
        await KidsGuardNative.requestNotificationPermission();
      } else {
        await Linking.openSettings();
      }
      return await checkPermission('notifications');
    }
  } catch {
    return 'denied';
  }
  return 'not_determined';
}

export async function checkAllPermissions(): Promise<PermissionState> {
  const [usageStats, overlay, battery, notifications] = await Promise.all([
    checkPermission('usage_stats'),
    checkPermission('overlay'),
    checkPermission('battery'),
    checkPermission('notifications'),
  ]);
  return {
    usage_stats: usageStats,
    overlay,
    battery,
    notifications,
  };
}

export function areAllPermissionsGranted(state: PermissionState): boolean {
  return (
    state.usage_stats === 'granted' &&
    state.overlay === 'granted' &&
    state.battery === 'granted' &&
    state.notifications === 'granted'
  );
}

export function getPermissionLabel(type: PermissionType): string {
  const labels: Record<PermissionType, string> = {
    usage_stats: '使用情况访问权限',
    overlay: '悬浮窗权限',
    battery: '电池优化白名单',
    notifications: '通知权限',
  };
  return labels[type];
}

export function getPermissionDesc(type: PermissionType): string {
  const descs: Record<PermissionType, string> = {
    usage_stats: '用于统计孩子各应用使用时长,这是管控的核心功能',
    overlay: '用于在应用超时时弹出锁屏界面,阻止继续使用',
    battery: '防止系统在后台杀掉守护服务,确保管控不中断',
    notifications: '用于发送超时提醒通知,让家长及时了解情况',
  };
  return descs[type];
}
