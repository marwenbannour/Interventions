import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';

export function StarInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stars}>
        {Array.from({ length: 5 }, (_, i) => {
          const n = i + 1;
          return (
            <TouchableOpacity key={n} onPress={() => onChange(n)} style={styles.starButton}>
              <Text style={[styles.star, n <= value && styles.starFilled]}>★</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 14, color: colors.text, fontWeight: '600' },
  stars: { flexDirection: 'row', gap: 4 },
  starButton: { padding: 2 },
  star: { fontSize: 28, color: colors.border },
  starFilled: { color: '#F59E0B' },
});
