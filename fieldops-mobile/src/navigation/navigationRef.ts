import { createNavigationContainerRef } from '@react-navigation/native';
import type { AppTabsParamList } from './types';

/**
 * Réf de navigation module-level : utilisée par le deep-link des notifications push (M6).
 * Isolée dans son propre module (plutôt que RootNavigator.tsx) pour éviter le cycle
 * d'import RootNavigator -> usePushNotifications -> RootNavigator, qui exposait des
 * valeurs non initialisées au démarrage à froid — précisément le chemin de code du
 * deep-link depuis une notification tapée app tuée.
 */
export const navigationRef = createNavigationContainerRef<AppTabsParamList>();
