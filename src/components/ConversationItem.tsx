import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import { ConversationSummary } from '../types/chat';
import { Avatar } from './Avatar';

type ConversationItemProps = {
  conversation: ConversationSummary;
  onPress: (conversation: ConversationSummary) => void;
};

function ConversationItemComponent({ conversation, onPress }: ConversationItemProps) {
  const isGroup = conversation.type === 'group';

  return (
    <Pressable
      onPress={() => onPress(conversation)}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${isGroup ? 'Grupo' : 'Conversa com'} ${conversation.title}`}
    >
      <Avatar uri={conversation.photoUrl} variant={isGroup ? 'group' : 'user'} size={52} />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {conversation.title}
          </Text>
          <View style={[styles.badge, isGroup ? styles.badgeGroup : styles.badgeDirect]}>
            <Text style={[styles.badgeText, { color: isGroup ? theme.colors.group : theme.colors.direct }]}>
              {isGroup ? 'Grupo' : 'Individual'}
            </Text>
          </View>
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          {conversation.subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

export const ConversationItem = memo(ConversationItemComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pressed: {
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    flexShrink: 1,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
  },
  badge: {
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  badgeGroup: {
    backgroundColor: theme.colors.groupLight,
  },
  badgeDirect: {
    backgroundColor: theme.colors.directLight,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 2,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});
