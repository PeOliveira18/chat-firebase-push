import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { POLICY_LABELS } from '../components/PolicySelector';
import { useCurrentUser } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { RootStackScreenProps } from '../navigation/types';
import { theme } from '../theme';
import { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/errorMessages';
import { formatCapacity } from '../utils/groupValidation';
import { confirmAction } from '../utils/dialogs';

type Props = RootStackScreenProps<'GroupMembers'>;

export function GroupMembersScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const currentUser = useCurrentUser();
  const { group, members, loading, error, isOwner, removeGroupMember } = useGroup(groupId, currentUser.uid);
  const [leaving, setLeaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const openProfile = useCallback(
    (member: PublicProfile) => navigation.navigate('Profile', { uid: member.uid }),
    [navigation],
  );

  const handleLeave = useCallback(() => {
    confirmAction('Sair do grupo', 'Você deixará de ver e receber mensagens deste grupo.', 'Sair', async () => {
      setLeaving(true);

      try {
        await removeGroupMember(currentUser.uid);
        navigation.popToTop();
      } catch (leaveError) {
        setActionError(getErrorMessage(leaveError, 'Não foi possível sair do grupo.'));
        setLeaving(false);
      }
    });
  }, [removeGroupMember, currentUser.uid, navigation]);

  if (loading) {
    return <Loading message="Carregando integrantes..." />;
  }

  if (!group) {
    return <EmptyState title="Grupo indisponível" description={error ?? undefined} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={members}
        keyExtractor={(item) => item.uid}
        ListHeaderComponent={
          <View style={styles.header}>
            <Avatar uri={group.photoUrl} variant="group" size={96} />
            <Text style={styles.name}>{group.name}</Text>
            <Text style={styles.capacity}>{formatCapacity(group.memberIds.length, group.memberLimit)}</Text>
            <Text style={styles.policy}>
              Notificações: {POLICY_LABELS[group.notificationPolicy].title}
            </Text>
            {actionError ? <ErrorMessage message={actionError} /> : null}
            {isOwner ? (
              <Button
                title="Editar grupo"
                variant="secondary"
                style={styles.headerButton}
                onPress={() => navigation.navigate('GroupForm', { groupId })}
              />
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <GroupMemberItem
            member={item}
            isOwner={item.uid === group.ownerId}
            isCurrentUser={item.uid === currentUser.uid}
            canRemove={false}
            onPress={openProfile}
          />
        )}
        ListFooterComponent={
          !isOwner ? (
            <View style={styles.footer}>
              <Button title="Sair do grupo" variant="danger" onPress={handleLeave} loading={leaving} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  name: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  capacity: {
    marginTop: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  policy: {
    marginTop: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  headerButton: {
    marginTop: theme.spacing.md,
    alignSelf: 'stretch',
  },
  footer: {
    padding: theme.spacing.md,
  },
});
