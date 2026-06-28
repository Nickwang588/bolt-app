import { Platform, NativeModules } from 'react-native';

export type InstalledApp = {
  packageName: string;
  appName: string;
  icon?: string;
  isGame: boolean;
  isSystemApp: boolean;
};

const { KidsGuardNative = {} } = NativeModules;

const GAME_KEYWORDS = [
  'game', 'play', '游戏', '王者', '荣耀', '和平', '精英', '世界', '方块',
  '迷你', '我的', '消消', '开心', '欢乐', '斗地主', '麻将', '扑克',
  '棋牌', '射击', '冒险', '角色', '策略', '竞技', '坦克', '赛车',
  '球球', '跑酷', '消除', '益智', '休闲', '模拟', '生存', '建造',
  'tencent.mm', 'com.tencent.tmgp',
];

const SYSTEM_PACKAGE_PREFIXES = [
  'com.android.', 'com.google.android.', 'android.', 'com.miui.',
  'com.huawei.', 'com.samsung.', 'com.vivo.', 'com.oppo.', 'com.coloros.',
  'com.bbk.', 'com.iqoo.',
];

function isGamePackage(packageName: string, appName: string): boolean {
  const lower = `${packageName} ${appName}`.toLowerCase();
  return GAME_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

function isSystemPackage(packageName: string): boolean {
  return SYSTEM_PACKAGE_PREFIXES.some((prefix) => packageName.startsWith(prefix));
}

export async function getInstalledApps(): Promise<InstalledApp[]> {
  if (Platform.OS !== 'android' || !KidsGuardNative.getInstalledApps) {
    return getFallbackApps();
  }

  try {
    const rawApps: Array<{
      packageName: string;
      appName: string;
      icon?: string;
    }> = await KidsGuardNative.getInstalledApps();

    return rawApps
      .filter((app) => !isSystemPackage(app.packageName))
      .map((app) => ({
        packageName: app.packageName,
        appName: app.appName,
        icon: app.icon,
        isGame: isGamePackage(app.packageName, app.appName),
        isSystemApp: false,
      }))
      .sort((a, b) => {
        if (a.isGame && !b.isGame) return -1;
        if (!a.isGame && b.isGame) return 1;
        return a.appName.localeCompare(b.appName, 'zh-CN');
      });
  } catch {
    return getFallbackApps();
  }
}

export async function getInstalledGames(): Promise<InstalledApp[]> {
  const allApps = await getInstalledApps();
  return allApps.filter((app) => app.isGame);
}

function getFallbackApps(): InstalledApp[] {
  return [
    { packageName: 'com.tencent.tmgp.sgame', appName: '王者荣耀', isGame: true, isSystemApp: false },
    { packageName: 'com.tencent.tmgp.pubgmhd', appName: '和平精英', isGame: true, isSystemApp: false },
    { packageName: 'com.mojang.minecraftpe', appName: '我的世界', isGame: true, isSystemApp: false },
    { packageName: 'com.minitech.miniworld', appName: '迷你世界', isGame: true, isSystemApp: false },
    { packageName: 'com.ss.android.ugc.aweme', appName: '抖音', isGame: false, isSystemApp: false },
    { packageName: 'com.tencent.mm', appName: '微信', isGame: false, isSystemApp: false },
    { packageName: 'tv.danmaku.bili', appName: '哔哩哔哩', isGame: false, isSystemApp: false },
    { packageName: 'com.netease.cloudmusic', appName: '网易云音乐', isGame: false, isSystemApp: false },
  ];
}
