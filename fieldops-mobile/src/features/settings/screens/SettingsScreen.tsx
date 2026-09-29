import * as Application from 'expo-application';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Card, MenuRow } from '../../../components/ui/primitives';
import { makeStyles, useTheme } from '../../../theme/ThemeProvider';
import { useSessionStore } from '../../auth/store/session.store';
import { usePreferencesStore } from '../store/preferences.store';
import type { ProfileStackScreenProps } from '../../../navigation/types';

export function SettingsScreen({ navigation }: ProfileStackScreenProps<'Settings'>) {
  const styles = useStyles();
  const { isDark, setDark } = useTheme();
  const user = useSessionStore((s) => s.user);
  const prefs = usePreferencesStore();
  const version = `${Application.nativeApplicationVersion ?? '1.0.0'} (${Application.nativeBuildVersion ?? '1'})`;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Paramètres" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Compte</Text>
        <Card style={styles.group}>
          <MenuRow icon="mail-outline" label="Email" value={user?.email} />
          <View style={styles.separator} />
          <MenuRow icon="lock-outline" label="Mot de passe" value="••••••••" onPress={() => navigation.navigate('ChangePassword')} />
        </Card>

        <Text style={styles.section}>Notifications</Text>
        <Card style={styles.group}>
          <MenuRow
            icon="notifications-none"
            label="Nouvelles interventions"
            switchValue={prefs.notifyNewTasks}
            onSwitch={(v) => prefs.set({ notifyNewTasks: v })}
          />
          <View style={styles.separator} />
          <MenuRow icon="alarm" label="Rappels SLA" switchValue={prefs.notifyReminders} onSwitch={(v) => prefs.set({ notifyReminders: v })} />
          <View style={styles.separator} />
          <MenuRow icon="chat-bubble-outline" label="Messages" switchValue={prefs.notifyMessages} onSwitch={(v) => prefs.set({ notifyMessages: v })} />
        </Card>
        <Text style={styles.hint}>Les notifications désactivées restent consultables dans l&apos;onglet Notifications, sans alerte sur l&apos;appareil.</Text>

        <Text style={styles.section}>Apparence</Text>
        <Card style={styles.group}>
          <MenuRow icon="dark-mode" label="Mode sombre" switchValue={isDark} onSwitch={setDark} />
        </Card>

        <Text style={styles.section}>À propos</Text>
        <Card style={styles.group}>
          <MenuRow icon="info-outline" label="Version" value={version} />
        </Card>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 16, paddingBottom: 32 },
    section: { fontSize: 13, fontWeight: '700', color: c.textMuted, marginTop: 18, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' },
    group: { padding: 0 },
    separator: { height: 1, backgroundColor: c.border, marginLeft: 52 },
    hint: { fontSize: 12, color: c.textMuted, marginTop: 8, marginHorizontal: 4 },
  }),
);
