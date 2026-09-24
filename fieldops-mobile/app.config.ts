import type { ExpoConfig } from 'expo/config';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000/api/v1';
const socketBaseUrl = process.env.SOCKET_BASE_URL ?? 'http://localhost:3000';

const config: ExpoConfig = {
  name: 'FieldOps',
  slug: 'fieldops-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'fieldops',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'io.fieldops.mobile',
    infoPlist: {
      UIBackgroundModes: ['location', 'fetch', 'remote-notification'],
    },
  },
  android: {
    package: 'io.fieldops.mobile',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-secure-store',
    'expo-splash-screen',
    'expo-image',
    [
      'expo-camera',
      {
        cameraPermission: 'FieldOps a besoin de la caméra pour photographier vos interventions.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'FieldOps a besoin de votre position pour valider votre arrivée sur site.',
        locationAlwaysAndWhenInUsePermission:
          'FieldOps suit votre position pendant votre service pour la coordination des interventions.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
        isIosBackgroundLocationEnabled: true,
      },
    ],
    // disableJsi: true — le hook JSI du plugin injecte dans MainApplication.kt une
    // référence à `JSIModulePackage`, retirée de React Native en RN 0.8x (New Architecture
    // seule). Avec disableJsi, WatermelonDB retombe sur l'adaptateur SQLite par pont (bridge),
    // toujours fonctionnel, juste moins rapide que JSI — voir database.ts (jsi: false assorti).
    ['@morrowdigital/watermelondb-expo-plugin', { disableJsi: true }],
    'expo-notifications',
  ],
  extra: {
    apiBaseUrl,
    socketBaseUrl,
    eas: {
      projectId: '9a2f3b03-582b-49f1-91b2-c87f3e383804',
    },
  },
};

export default config;
