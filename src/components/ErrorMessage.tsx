import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

type ErrorMessageProps = {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'error' | 'warning';
};

export function ErrorMessage({ message, onRetry, onDismiss, variant = 'error' }: ErrorMessageProps) {
  const isWarning = variant === 'warning';

  return (
    <View
      style={[styles.container, isWarning ? styles.warning : styles.error]}
      accessibilityRole="alert"
    >
      <Text style={[styles.text, { color: isWarning ? theme.colors.warning : theme.colors.danger }]}>
        {message}
      </Text>
      <View style={styles.actions}>
        {onRetry ? (
          <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.action}>Tentar novamente</Text>
          </Pressable>
        ) : null}
        {onDismiss ? (
          <Pressable onPress={onDismiss} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.action}>Fechar</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.sm,
  },
  error: {
    backgroundColor: theme.colors.dangerLight,
  },
  warning: {
    backgroundColor: theme.colors.warningLight,
  },
  text: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  action: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
