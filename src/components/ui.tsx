import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

export const colors = {
  bg: '#FFF8F3',
  card: '#FFFFFF',
  text: '#2B2420',
  subtext: '#7A6E66',
  border: '#EFE4DA',
  primary: '#F2735B',
  primarySoft: '#FDE7E1',
  danger: '#D64545',
  today: '#E8493A',
};

const FAMILY_COLORS = ['#F2735B', '#4E9F8C', '#5B7FD6', '#D69B2E', '#9A6BCF', '#D45F95', '#5A9BC4', '#7C9A3C'];

export function familyColor(index: number): string {
  return FAMILY_COLORS[((index % FAMILY_COLORS.length) + FAMILY_COLORS.length) % FAMILY_COLORS.length];
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, style }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && { backgroundColor: colors.primary },
        variant === 'outline' && { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.card },
        variant === 'danger' && { borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.card },
        variant === 'ghost' && { backgroundColor: 'transparent' },
        (pressed || isDisabled) && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.primary} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'primary' && { color: '#fff' },
            variant === 'outline' && { color: colors.primary },
            variant === 'danger' && { color: colors.danger },
            variant === 'ghost' && { color: colors.subtext },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor="#B5A99F" {...props} style={[styles.input, props.style]} />;
}

export function Chip({
  label,
  selected,
  color = colors.primary,
  onPress,
}: {
  label: string;
  selected?: boolean;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: color }, selected && { backgroundColor: color }]}
    >
      <Text style={[styles.chipText, { color: selected ? '#fff' : color }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

export function EmptyText({ children }: { children: ReactNode }) {
  return <Text style={styles.empty}>{children}</Text>;
}

export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}>
      <Text style={styles.fabText}>＋ {label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  field: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: colors.subtext, marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  empty: { color: colors.subtext, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 22,
    height: 54,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
