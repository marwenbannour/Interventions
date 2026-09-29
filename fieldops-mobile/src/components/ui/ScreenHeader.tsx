import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '../../theme/ThemeProvider';
import { Icon } from './Icon';

/** En-tête d'écran : retour éventuel, titre, actions à droite (remplace l'en-tête natif). */
export function ScreenHeader({
  title,
  onBack,
  right,
  large,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  large?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} hitSlop={10} style={styles.back}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      ) : null}
      <Text style={[styles.title, large && styles.titleLarge]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

export function HeaderIconButton({ icon, onPress, badge }: { icon: Parameters<typeof Icon>[0]['name']; onPress: () => void; badge?: number }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <TouchableOpacity onPress={onPress} hitSlop={8} style={styles.iconButton}>
      <Icon name={icon} size={24} color={colors.text} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: c.background,
    },
    back: { padding: 2 },
    title: { flex: 1, fontSize: 18, fontWeight: '700', color: c.text },
    titleLarge: { fontSize: 24 },
    right: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconButton: { padding: 2 },
    badge: {
      position: 'absolute',
      top: -4,
      right: -6,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.danger,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  }),
);
