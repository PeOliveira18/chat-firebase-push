import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import { PublicProfile } from '../types/user';
import { Avatar } from './Avatar';

type UserItemProps = {
  user: PublicProfile;
  onPress: (user: PublicProfile) => void;
  selected?: boolean;
  disabled?: boolean;
  hint?: string;
};

function UserItemComponent({ user, onPress, selected = false, disabled = false, hint }: UserItemProps) {
  return (
    <Pressable
      onPress={() => onPress(user)}
      disabled={disabled}
      style={({ pressed }) => [
        styles.container,
        selected && styles.selected,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={user.name}
    >
      <Avatar uri={user.photoUrl} size={44} />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {user.name}
        </Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {selected ? <Text style={styles.check}>✓</Text> : null}
    </Pressable>
  );
}

export const UserItem = memo(UserItemComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selected: {
    backgroundColor: theme.colors.primaryLight,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.45,
  },
  content: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  name: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  hint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  check: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
