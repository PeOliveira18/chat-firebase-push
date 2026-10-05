import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import { PublicProfile } from '../types/user';
import { Avatar } from './Avatar';

type GroupMemberItemProps = {
  member: PublicProfile;
  isOwner: boolean;
  isCurrentUser: boolean;
  canRemove: boolean;
  removing?: boolean;
  onPress: (member: PublicProfile) => void;
  onRemove?: (member: PublicProfile) => void;
};

function GroupMemberItemComponent({
  member,
  isOwner,
  isCurrentUser,
  canRemove,
  removing = false,
  onPress,
  onRemove,
}: GroupMemberItemProps) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => onPress(member)}
        style={styles.info}
        accessibilityRole="button"
        accessibilityLabel={`Ver perfil de ${member.name}`}
      >
        <Avatar uri={member.photoUrl} size={44} />
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={1}>
            {member.name}
            {isCurrentUser ? ' (você)' : ''}
          </Text>
          {isOwner ? <Text style={styles.owner}>Proprietário</Text> : null}
        </View>
      </Pressable>

      {canRemove && onRemove ? (
        <Pressable
          onPress={() => onRemove(member)}
          disabled={removing}
          accessibilityRole="button"
          accessibilityLabel={`Remover ${member.name}`}
          hitSlop={8}
        >
          <Text style={[styles.remove, removing && styles.removing]}>
            {removing ? 'Removendo...' : isCurrentUser ? 'Sair' : 'Remover'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const GroupMemberItem = memo(GroupMemberItemComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  texts: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  name: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  owner: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.group,
    fontWeight: '700',
  },
  remove: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  removing: {
    color: theme.colors.textSecondary,
  },
});
