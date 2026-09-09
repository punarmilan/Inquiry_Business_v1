require('dotenv').config({ path: __dirname + '/.env' });

const appJson = require('./app.json');

const dynamicPlugins = [
  [
    'react-native-maps',
    {
      androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
      iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS,
    },
  ],
  [
    '@react-native-google-signin/google-signin',
    {
      // Android uses GOOGLE_WEB_CLIENT_ID. The plugin still requires an iOS
      // URL scheme while evaluating an Android-only release configuration.
      iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME || 'com.googleusercontent.apps.placeholder',
    },
  ],
  process.env.FACEBOOK_APP_ID && [
    'react-native-fbsdk-next',
    {
      appID: process.env.FACEBOOK_APP_ID,
      clientToken: process.env.FACEBOOK_CLIENT_TOKEN || '',
      displayName: 'InquiryExperts',
      scheme: `fb${process.env.FACEBOOK_APP_ID}`,
      isAutoInitEnabled: true,
      advertiserIDCollectionEnabled: false,
      autoLogAppEventsEnabled: false,
    },
  ],
].filter(Boolean);

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || '',
      ...(process.env.EXPO_PUBLIC_API_BASE_URL
        ? { apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL }
        : {}),
      ...(process.env.EAS_PROJECT_ID
        ? { eas: { projectId: process.env.EAS_PROJECT_ID } }
        : {}),
    },
    plugins: [...appJson.expo.plugins, ...dynamicPlugins],
  },
};
