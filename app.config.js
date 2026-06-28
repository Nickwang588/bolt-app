export default {
  ...config,
  android: {
    ...config.android,
    // 往 AndroidManifest.xml 注入 <queries> 使 QUERY_ALL_PACKAGES 生效（Android 11+）
    intentFilters: [
      {
        action: 'android.intent.action.MAIN',
        category: 'android.intent.category.LAUNCHER',
      },
    ],
  },
};