import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import { NOTIFICATION_POLICIES, NotificationPolicy } from '../types/notification';

export const POLICY_LABELS: Record<NotificationPolicy, { title: string; description: string }> = {
  all_group_messages: {
    title: 'Todas as mensagens',
    description: 'Todos os integrantes (exceto o remetente) recebem push.',
  },
  mentioned_members: {
    title: 'Somente mencionados',
    description: 'Apenas integrantes mencionados ou selecionados como destinatário recebem push.',
  },
  direct_messages_only: {
    title: 'Somente conversas individuais',
    description: 'Mensagens deste grupo não geram push.',
  },
  disabled: {
    title: 'Desativadas',
    description: 'Nenhuma mensagem deste grupo gera push.',
  },
};

type PolicySelectorProps = {
  value: NotificationPolicy;
  onChange: (policy: NotificationPolicy) => void;
  disabled?: boolean;
};

export function PolicySelector({ value, onChange, disabled = false }: PolicySelectorProps) {
  return (
    <View accessibilityRole="radiogroup">
      {NOTIFICATION_POLICIES.map((policy) => {
        const selected = policy === value;

        return (
          <Pressable
            key={policy}
            onPress={() => onChange(policy)}
            disabled={disabled}
            style={[styles.option, selected && styles.optionSelected, disabled && styles.disabled]}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
          >
            <View style={[styles.radio, selected && styles.radioSelected]} />
            <View style={styles.texts}>
              <Text style={styles.title}>{POLICY_LABELS[policy].title}</Text>
              <Text style={styles.description}>{POLICY_LABELS[policy].description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  optionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  disabled: {
    opacity: 0.6,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.textSecondary,
  },
  radioSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  texts: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  description: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
});
