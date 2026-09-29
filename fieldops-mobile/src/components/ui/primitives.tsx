import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { toneColors, radius, type Tone } from '../../theme/palette';
import { makeStyles, useTheme } from '../../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const styles = useStyles();
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.75} style={[styles.card, style]} onPress={onPress}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Pastille de statut / priorité : fond doux et texte coloré, ou plein. */
export function Badge({ label, tone, solid }: { label: string; tone: Tone; solid?: boolean }) {
  const { colors } = useTheme();
  const { fg, bg } = toneColors(colors, tone);
  return (
    <View style={[baseStyles.badge, { backgroundColor: solid ? fg : bg }]}>
      <Text style={[baseStyles.badgeText, { color: solid ? colors.onPrimary : fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Icône dans un carré arrondi coloré (type d'intervention, notification…). */
export function IconBubble({ name, tone, size = 40 }: { name: IconName; tone: Tone; size?: number }) {
  const { colors } = useTheme();
  const { fg, bg } = toneColors(colors, tone);
  return (
    <View style={[baseStyles.bubble, { width: size, height: size, borderRadius: size / 3.2, backgroundColor: bg }]}>
      <Icon name={name} size={size * 0.55} color={fg} />
    </View>
  );
}

type ButtonVariant = 'primary' | 'outline' | 'danger' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const fg =
    variant === 'primary' ? colors.onPrimary : variant === 'danger' ? colors.danger : variant === 'ghost' ? colors.textMuted : colors.primary;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        variant === 'primary' && { backgroundColor: colors.primary },
        variant === 'outline' && { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface },
        variant === 'danger' && { backgroundColor: colors.dangerSoft },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={20} color={fg} /> : null}
          <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function SearchBar({ value, onChangeText, placeholder }: { value: string; onChangeText: (t: string) => void; placeholder: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.search}>
      <Icon name="search" size={20} color={colors.textMuted} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        returnKeyType="search"
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={8}>
          <Icon name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected ? { backgroundColor: colors.primary, borderColor: colors.primary } : null]}
    >
      <Text style={[styles.chipText, { color: selected ? colors.onPrimary : colors.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** Tuile de chiffre clé du tableau de bord. */
export function StatTile({ value, label, color, onPress }: { value: number; label: string; color: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [baseStyles.stat, { backgroundColor: color, opacity: pressed ? 0.85 : 1 }]}>
      <Text style={baseStyles.statValue}>{value}</Text>
      <Text style={baseStyles.statLabel}>{label}</Text>
    </Pressable>
  );
}

/** Ligne de menu : icône, libellé, valeur ou interrupteur, chevron. */
export function MenuRow({
  icon,
  label,
  value,
  onPress,
  switchValue,
  onSwitch,
  danger,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  switchValue?: boolean;
  onSwitch?: (v: boolean) => void;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const hasSwitch = onSwitch !== undefined;
  const content = (
    <>
      <Icon name={icon} size={22} color={danger ? colors.danger : colors.text} />
      <View style={styles.menuTexts}>
        <Text style={[styles.menuLabel, danger && { color: colors.danger }]}>{label}</Text>
        {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      </View>
      {hasSwitch ? (
        <Switch
          value={!!switchValue}
          onValueChange={onSwitch}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor="#FFFFFF"
        />
      ) : onPress ? (
        <Icon name="chevron-right" size={22} color={colors.textMuted} />
      ) : null}
    </>
  );
  if (onPress && !hasSwitch) {
    return (
      <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={styles.menuRow}>{content}</View>;
}

export function EmptyState({ icon, title, hint }: { icon: IconName; title: string; hint?: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={44} color={colors.border} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

export function Field({ icon, error, right, ...props }: TextInputProps & { icon?: IconName; error?: string; right?: ReactNode }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={{ gap: 4 }}>
      <View style={[styles.field, error ? { borderColor: colors.danger } : null]}>
        {icon ? <Icon name={icon} size={20} color={colors.textMuted} /> : null}
        <TextInput placeholderTextColor={colors.textMuted} {...props} style={[styles.fieldInput, props.style]} />
        {right}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  bubble: { alignItems: 'center', justifyContent: 'center' },
  stat: { flex: 1, borderRadius: radius.lg, padding: 16, minHeight: 88, justifyContent: 'space-between' },
  statValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
});

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    button: {
      flexDirection: 'row',
      gap: 8,
      borderRadius: radius.md,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: { fontSize: 15, fontWeight: '700' },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    sectionAction: { fontSize: 13, fontWeight: '600', color: c.primary },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      height: 46,
    },
    searchInput: { flex: 1, fontSize: 15, color: c.text, paddingVertical: 0 },
    chip: {
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    chipText: { fontSize: 13, fontWeight: '600' },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
    menuTexts: { flex: 1 },
    menuLabel: { fontSize: 15, color: c.text, fontWeight: '500' },
    menuValue: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 8 },
    emptyTitle: { fontSize: 15, fontWeight: '600', color: c.textMuted },
    emptyHint: { fontSize: 13, color: c.textMuted, textAlign: 'center', paddingHorizontal: 32 },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      minHeight: 50,
    },
    fieldInput: { flex: 1, fontSize: 15, color: c.text, paddingVertical: 10 },
    fieldError: { color: c.danger, fontSize: 12, marginLeft: 4 },
  }),
);
