import { Platform, NativeModules } from 'react-native';

const { KidsGuardNative = {} } = NativeModules;

export type LockState = {
  isLocked: boolean;
  lockedPackages: string[];
};

export type LockScreenConfig = {
  packageName: string;
  appName: string;
  usedMinutes: number;
  limitMinutes: number;
  reminderMinutes: number;
};

export async function lockApp(config: LockScreenConfig): Promise<boolean> {
  if (Platform.OS !== 'android' || !KidsGuardNative.lockApp) {
    return false;
  }

  try {
    await KidsGuardNative.lockApp(
      config.packageName,
      config.appName,
      config.usedMinutes,
      config.limitMinutes,
      config.reminderMinutes
    );
    return true;
  } catch {
    return false;
  }
}

export async function unlockApp(packageName: string): Promise<boolean> {
  if (Platform.OS !== 'android' || !KidsGuardNative.unlockApp) {
    return false;
  }

  try {
    await KidsGuardNative.unlockApp(packageName);
    return true;
  } catch {
    return false;
  }
}

export async function startGuardService(): Promise<boolean> {
  if (Platform.OS !== 'android' || !KidsGuardNative.startGuardService) {
    return false;
  }

  try {
    await KidsGuardNative.startGuardService();
    return true;
  } catch {
    return false;
  }
}

export async function stopGuardService(): Promise<boolean> {
  if (Platform.OS !== 'android' || !KidsGuardNative.stopGuardService) {
    return false;
  }

  try {
    await KidsGuardNative.stopGuardService();
    return true;
  } catch {
    return false;
  }
}

export async function updateGuardConfig(
  controlledPackages: string[],
  limits: Record<string, number>
): Promise<boolean> {
  if (Platform.OS !== 'android' || !KidsGuardNative.updateGuardConfig) {
    return false;
  }

  try {
    await KidsGuardNative.updateGuardConfig(
      controlledPackages,
      JSON.stringify(limits)
    );
    return true;
  } catch {
    return false;
  }
}

export async function isGuardServiceRunning(): Promise<boolean> {
  if (Platform.OS !== 'android' || !KidsGuardNative.isGuardServiceRunning) {
    return false;
  }

  try {
    return await KidsGuardNative.isGuardServiceRunning();
  } catch {
    return false;
  }
}
