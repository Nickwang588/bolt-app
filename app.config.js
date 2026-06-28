const expoConfig = require('./app.json');

module.exports = {
  ...expoConfig.expo,
  android: {
    ...expoConfig.expo.android,
    intentFilters: [
      {
        action: 'android.intent.action.MAIN',
        category: 'android.intent.category.LAUNCHER',
      },
    ],
  },
};
