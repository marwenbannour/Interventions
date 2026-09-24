import Constants from 'expo-constants';

interface AppExtra {
  apiBaseUrl: string;
  socketBaseUrl: string;
}

function readExtra(): AppExtra {
  const extra = Constants.expoConfig?.extra as Partial<AppExtra> | undefined;
  if (!extra?.apiBaseUrl || !extra?.socketBaseUrl) {
    throw new Error('Configuration manquante : apiBaseUrl/socketBaseUrl (voir app.config.ts / .env.local)');
  }
  return { apiBaseUrl: extra.apiBaseUrl, socketBaseUrl: extra.socketBaseUrl };
}

export const env = readExtra();
