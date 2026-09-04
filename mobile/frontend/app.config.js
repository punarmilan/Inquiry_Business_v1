require('dotenv').config({ path: __dirname + '/.env' });

module.exports = {
  expo: {
    name: 'InquiryExperts',
    slug: 'kaamsaathi',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'kaamsaathi',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.kaamsaathi.app',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'InquiryExperts uses your location to discover nearby offers and services.',
        NSPhotoLibraryUsageDescription: 'InquiryExperts needs access to your photos so you can set a profile picture.',
        NSCameraUsageDescription: 'InquiryExperts needs camera access so you can take a profile picture.',
        // Lets Linking.canOpenURL('tel:...') work correctly if it's ever used again —
        // without this, it rejects on iOS even for a perfectly callable number.
        LSApplicationQueriesSchemes: ['tel'],
      },
    },
    android: {
      package: 'com.kaamsaathi.app',
      // Built APKs don't reliably auto-resize behind the keyboard the way Expo Go's host
      // activity does (edge-to-edge changes how the window responds to windowSoftInputMode) —
      // being explicit here plus KeyboardAvoidingView's Android "height" behavior (see chat/AI
      // assistant/phone-entry screens) is what actually pushes the input row above the keyboard
      // in a release build, not just in Expo Go.
      softwareKeyboardLayoutMode: 'resize',
      adaptiveIcon: {
        backgroundColor: '#E4622A',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'READ_MEDIA_IMAGES'],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    updates: {
      enabled: false,
      checkAutomatically: 'NEVER',
      fallbackToCacheTimeout: 0,
    },
    extra: {
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || '',
    },
    plugins: [
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'InquiryExperts uses your location to discover nearby offers and services.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'InquiryExperts needs access to your photos so you can set a profile picture.',
        },
      ],
      'expo-font',
      'expo-status-bar',
      '@react-native-community/datetimepicker',
      [
        'react-native-maps',
        {
          androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
          iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS,
        },
      ],
      [
        'expo-notifications',
        {
          color: '#F45B18',
        },
      ],
      [
        '@react-native-google-signin/google-signin',
        {
          // The plugin requires a validly-formatted scheme to run at all, even for an
          // Android-only build (it only ever touches iOS's Info.plist). This placeholder is
          // harmless until real iOS credentials replace GOOGLE_IOS_URL_SCHEME in .env.
          iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME || 'com.googleusercontent.apps.placeholder',
        },
      ],
      // Facebook Login is skipped for now — the fbsdk-next plugin needs a real FACEBOOK_APP_ID
      // to be safe to bake into a native build (an empty/placeholder ID crashes the app on
      // launch since the SDK auto-initializes). Set FACEBOOK_APP_ID + FACEBOOK_CLIENT_TOKEN in
      // .env and this activates itself on the next prebuild — no code change needed.
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
    ].filter(Boolean),
  },
};
