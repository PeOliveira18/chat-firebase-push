import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import { DisplayMessage } from '../types/chat';
import { formatTime } from '../utils/formatters';

type ChatMessageProps = {
  message: DisplayMessage;
  isMine: boolean;
  authorName?: string;
  targetName?: string;
  mentionsMe: boolean;
  onRetry?: (messageId: string) => void;
  onDiscard?: (messageId: string) => void;
};

function ChatMessageComponent({
  message,
  isMine,
  authorName,
  targetName,
  mentionsMe,
  onRetry,
  onDiscard,
}: ChatMessageProps) {
  const failed = message.status === 'failed';

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}>
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleOther,
          mentionsMe && !isMine ? styles.bubbleMention : null,
          failed ? styles.bubbleFailed : null,
        ]}
      >
        {authorName && !isMine ? <Text style={styles.author}>{authorName}</Text> : null}
        {targetName ? (
          <Text style={[styles.target, isMine ? styles.textMine : null]}>Para: {targetName}</Text>
        ) : null}
        <Text style={[styles.text, isMine ? styles.textMine : null]}>{message.text}</Text>
        <Text style={[styles.meta, isMine ? styles.metaMine : null]}>
          {message.status === 'sending' ? 'Enviando...' : formatTime(message.createdAt)}
        </Text>
      </View>

      {failed ? (
        <View style={styles.failedActions}>
          <Text style={styles.failedText}>Falha no envio.</Text>
          {onRetry ? (
            <Pressable onPress={() => onRetry(message.id)} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.failedAction}>Reenviar</Text>
            </Pressable>
          ) : null}
          {onDiscard ? (
            <Pressable onPress={() => onDiscard(message.id)} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.failedAction}>Descartar</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const ChatMessage = memo(ChatMessageComponent);

const styles = StyleSheet.create({
  row: {
    marginVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  rowMine: {
    alignItems: 'flex-end',
  },
  rowOther: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  bubbleMine: {
    backgroundColor: theme.colors.myMessage,
    borderBottomRightRadius: theme.spacing.xs,
  },
  bubbleOther: {
    backgroundColor: theme.colors.otherMessage,
    borderBottomLeftRadius: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bubbleMention: {
    borderColor: theme.colors.warning,
    borderWidth: 2,
  },
  bubbleFailed: {
    backgroundColor: theme.colors.danger,
  },
  author: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.group,
    marginBottom: 2,
  },
  target: {
    fontSize: theme.fontSize.xs,
    fontStyle: 'italic',
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  text: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  textMine: {
    color: theme.colors.textOnPrimary,
  },
  meta: {
    marginTop: 2,
    fontSize: 11,
    color: theme.colors.textSecondary,
    alignSelf: 'flex-end',
  },
  metaMine: {
    color: theme.colors.primaryLight,
  },
  failedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  failedText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.danger,
  },
  failedAction: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
