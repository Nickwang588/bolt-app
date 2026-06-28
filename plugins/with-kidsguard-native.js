const { withAppBuildGradle, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NATIVE_MODULE_JAVA = `
package com.kidsguard.app;

import android.app.Activity;
import android.app.AppOpsManager;
import android.app.NotificationManager;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class KidsGuardNativeModule extends ReactContextBaseJavaModule {
    private static final String TAG = "KidsGuardNative";
    private final ReactApplicationContext context;
    private final List<String> lockedPackages = new ArrayList<>();

    public KidsGuardNativeModule(ReactApplicationContext context) {
        super(context);
        this.context = context;
    }

    @Override
    public String getName() {
        return "KidsGuardNative";
    }

    @ReactMethod
    public void checkUsageStatsPermission(Promise promise) {
        try {
            AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
            int mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.getPackageName());
            boolean granted = mode == AppOpsManager.MODE_ALLOWED;
            promise.resolve(granted);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void requestUsageStatsPermission(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void checkOverlayPermission(Promise promise) {
        try {
            boolean granted = Settings.canDrawOverlays(context);
            promise.resolve(granted);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void requestOverlayPermission(Promise promise) {
        try {
            if (!Settings.canDrawOverlays(context)) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void checkBatteryOptimization(Promise promise) {
        try {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            boolean ignored = pm.isIgnoringBatteryOptimizations(context.getPackageName());
            promise.resolve(ignored);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void requestIgnoreBatteryOptimization(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void checkNotificationPermission(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                promise.resolve(nm.areNotificationsEnabled());
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void requestNotificationPermission(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void getInstalledApps(Promise promise) {
        try {
            PackageManager pm = context.getPackageManager();
            List<ApplicationInfo> packages = pm.getInstalledApplications(PackageManager.GET_META_DATA);
            WritableArray result = new WritableNativeArray();

            for (ApplicationInfo info : packages) {
                if ((info.flags & ApplicationInfo.FLAG_SYSTEM) != 0) continue;
                String appName = pm.getApplicationLabel(info).toString();
                WritableMap appMap = new WritableNativeMap();
                appMap.putString("packageName", info.packageName);
                appMap.putString("appName", appName);
                result.pushMap(appMap);
            }
            promise.resolve(result);
        } catch (Exception e) {
            promise.resolve(new WritableNativeArray());
        }
    }

    @ReactMethod
    public void getUsageStatsForDate(double startTs, double endTs, Promise promise) {
        try {
            if (!hasUsageStatsPermission()) {
                promise.resolve(new WritableNativeArray());
                return;
            }
            UsageStatsManager usm = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
            long start = (long) startTs;
            long end = (long) endTs;
            List<android.app.usage.UsageStats> stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end);

            Map<String, android.app.usage.UsageStats> merged = new HashMap<>();
            for (android.app.usage.UsageStats s : stats) {
                String pkg = s.getPackageName();
                android.app.usage.UsageStats existing = merged.get(pkg);
                if (existing == null || s.getLastTimeUsed() > existing.getLastTimeUsed()) {
                    merged.put(pkg, s);
                }
            }

            PackageManager pm = context.getPackageManager();
            WritableArray result = new WritableNativeArray();

            for (Map.Entry<String, android.app.usage.UsageStats> entry : merged.entrySet()) {
                String pkg = entry.getKey();
                android.app.usage.UsageStats s = entry.getValue();
                long fgMs = s.getTotalTimeInForeground();
                if (fgMs <= 0) continue;

                String appName = pkg;
                try {
                    appName = pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString();
                } catch (PackageManager.NameNotFoundException ignored) {}

                WritableMap map = new WritableNativeMap();
                map.putString("packageName", pkg);
                map.putString("appName", appName);
                map.putDouble("foregroundMs", (double) fgMs);
                map.putDouble("lastUsed", (double) s.getLastTimeUsed());
                result.pushMap(map);
            }
            promise.resolve(result);
        } catch (Exception e) {
            promise.resolve(new WritableNativeArray());
        }
    }

    @ReactMethod
    public void lockApp(String packageName, String appName, double usedMinutes, double limitMinutes, double reminderMinutes, Promise promise) {
        try {
            if (!lockedPackages.contains(packageName)) {
                lockedPackages.add(packageName);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void unlockApp(String packageName, Promise promise) {
        try {
            lockedPackages.remove(packageName);
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void startGuardService(Promise promise) {
        try {
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void stopGuardService(Promise promise) {
        try {
            lockedPackages.clear();
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void updateGuardConfig(String packagesJson, String limitsJson, Promise promise) {
        try {
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void isGuardServiceRunning(Promise promise) {
        try {
            promise.resolve(!lockedPackages.isEmpty());
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    private boolean hasUsageStatsPermission() {
        try {
            AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
            int mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.getPackageName());
            return mode == AppOpsManager.MODE_ALLOWED;
        } catch (Exception e) {
            return false;
        }
    }
}
`;

const NATIVE_PACKAGE_JAVA = `
package com.kidsguard.app;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class KidsGuardNativePackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new KidsGuardNativeModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;

const MAIN_APPLICATION_JAVA_PATCH = `
    @Override
    protected List<ReactPackage> getPackages() {
        @SuppressWarnings("UnnecessaryLocalVariable")
        List<ReactPackage> packages = new PackageList(this).getPackages();
        // Add custom native modules
        packages.add(new KidsGuardNativePackage());
        return packages;
    }
`;

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function withKidsGuardNativeModule(config) {
  return withDangerousMod(config, 'android', (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const javaDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', 'com', 'kidsguard', 'app');
    ensureDir(javaDir);

    fs.writeFileSync(path.join(javaDir, 'KidsGuardNativeModule.java'), NATIVE_MODULE_JAVA.trim() + '\n');
    fs.writeFileSync(path.join(javaDir, 'KidsGuardNativePackage.java'), NATIVE_PACKAGE_JAVA.trim() + '\n');

    const mainAppPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', 'com', 'kidsguard', 'app', 'MainApplication.java');
    if (fs.existsSync(mainAppPath)) {
      let content = fs.readFileSync(mainAppPath, 'utf8');
      if (!content.includes('KidsGuardNativePackage')) {
        content = content.replace(
          'return packages;',
          '        packages.add(new KidsGuardNativePackage());\n        return packages;'
        );
      }
      fs.writeFileSync(mainAppPath, content);
    }

    return config;
  });
}

module.exports = function (config) {
  config = withKidsGuardNativeModule(config);
  return config;
};
