import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import { displayValue } from '../utils/formatters';

type InfoRowProps = {
  label: string;
  value: string;
};

export function InfoRow({ label, value }: InfoRowProps) {
  const isEmpty = !value.trim();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, isEmpty && styles.empty]}>{displayValue(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  label: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    marginTop: 2,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  empty: {
    fontStyle: 'italic',
    color: theme.colors.textSecondary,
  },
});
