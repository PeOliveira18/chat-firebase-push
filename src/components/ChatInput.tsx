import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MAX_MESSAGE_LENGTH } from '../services/chatService';
import { theme } from '../theme';
import { MessageTarget } from '../types/chat';
import { PublicProfile } from '../types/user';
import {
  extractMentionedUserIds,
  getMentionQuery,
  insertMention,
  mergeUniqueIds,
} from '../utils/mentions';

export type ChatInputPayload = {
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
};

type ChatInputProps = {
  currentUid: string;
  isGroup: boolean;
  members: PublicProfile[];
  disabled?: boolean;
  onSend: (payload: ChatInputPayload) => Promise<void>;
};

export function ChatInput({ currentUid, isGroup, members, disabled = false, onSend }: ChatInputProps) {
  const [text, setText] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);

  const otherMembers = useMemo(
    () => members.filter((member) => member.uid !== currentUid),
    [members, currentUid],
  );

  const mentionQuery = useMemo(() => (isGroup ? getMentionQuery(text) : null), [isGroup, text]);

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) {
      return [];
    }

    const term = mentionQuery.toLocaleLowerCase('pt-BR');

    return otherMembers
      .filter((member) => member.name.toLocaleLowerCase('pt-BR').includes(term))
      .slice(0, 5);
  }, [mentionQuery, otherMembers]);

  const handleSelectMention = useCallback((member: PublicProfile) => {
    setText((current) => insertMention(current, member.name));
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    const mentioned = extractMentionedUserIds(trimmed, otherMembers, currentUid);
    const target: MessageTarget = targetId ? { type: 'member', memberId: targetId } : { type: 'conversation' };

    setText('');
    setTargetId(null);

    onSend({
      text: trimmed,
      target,
      mentionedUserIds: mergeUniqueIds(mentioned, targetId ? [targetId] : []),
    }).catch(() => {});
  }, [text, otherMembers, currentUid, targetId, onSend]);

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      {isGroup ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.targets}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.targetsLabel}>Para:</Text>
          <TargetChip label="Todos" selected={targetId === null} onPress={() => setTargetId(null)} />
          {otherMembers.map((member) => (
            <TargetChip
              key={member.uid}
              label={member.name}
              selected={targetId === member.uid}
              onPress={() => setTargetId(member.uid)}
            />
          ))}
        </ScrollView>
      ) : null}

      {mentionSuggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {mentionSuggestions.map((member) => (
            <Pressable
              key={member.uid}
              onPress={() => handleSelectMention(member)}
              style={styles.suggestion}
              accessibilityRole="button"
            >
              <Text style={styles.suggestionText}>@{member.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={isGroup ? 'Mensagem (use @ para mencionar)' : 'Digite uma mensagem'}
          placeholderTextColor={theme.colors.textSecondary}
          style={styles.input}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          editable={!disabled}
          accessibilityLabel="Campo de mensagem"
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
        >
          <Text style={styles.sendText}>Enviar</Text>
        </Pressable>
      </View>
    </View>
  );
}

type TargetChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function TargetChip({ label, selected, onPress }: TargetChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    paddingVertical: theme.spacing.sm,
  },
  targets: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  targetsLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  chip: {
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text,
  },
  chipTextSelected: {
    color: theme.colors.textOnPrimary,
    fontWeight: '700',
  },
  suggestions: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  suggestion: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  suggestionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  sendButton: {
    height: 44,
    minWidth: 72,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: theme.colors.textOnPrimary,
    fontWeight: '700',
  },
});
