import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const KEY = 'fieldops.preferences';

export interface Preferences {
  darkMode: boolean;
  notifyNewTasks: boolean;
  notifyReminders: boolean;
  notifyMessages: boolean;
}

const DEFAULTS: Preferences = {
  darkMode: false,
  notifyNewTasks: true,
  notifyReminders: true,
  notifyMessages: true,
};

interface PreferencesState extends Preferences {
  loaded: boolean;
  load: () => Promise<void>;
  set: (patch: Partial<Preferences>) => void;
}

/** Préférences locales de l'appareil (apparence, notifications), persistées dans le stockage sécurisé. */
export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...DEFAULTS,
  loaded: false,
  load: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (raw) set({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Preferences>) });
    } catch {
      // Préférences illisibles : on garde les valeurs par défaut.
    }
    set({ loaded: true });
  },
  set: (patch) => {
    set(patch);
    const { darkMode, notifyNewTasks, notifyReminders, notifyMessages } = { ...get(), ...patch };
    SecureStore.setItemAsync(KEY, JSON.stringify({ darkMode, notifyNewTasks, notifyReminders, notifyMessages })).catch(
      () => undefined,
    );
  },
}));
