import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

/** Avatar à initiales (pas de photo de profil côté API). */
export function Avatar({ firstName, lastName, size = 40, inverted }: { firstName?: string; lastName?: string; size?: number; inverted?: boolean }) {
  const { colors } = useTheme();
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: inverted ? '#FFFFFF' : colors.primarySoft,
          borderColor: inverted ? 'rgba(255,255,255,0.6)' : colors.surface,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38, color: colors.primary }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  text: { fontWeight: '700' },
});
