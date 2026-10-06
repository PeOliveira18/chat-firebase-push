import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { ImagePickerField } from '../components/ImagePickerField';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { PolicySelector } from '../components/PolicySelector';
import { useCurrentUser } from '../hooks/useAuth';
import { useCreateGroup, useGroup } from '../hooks/useGroups';
import { usePublicProfiles } from '../hooks/useProfiles';
import { RootStackScreenProps } from '../navigation/types';
import { theme } from '../theme';
import { NotificationPolicy } from '../types/notification';
import { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/errorMessages';
import {
  formatCapacity,
  parseMemberLimit,
  validateGroupName,
  validateInitialMembers,
  validateMemberLimit,
} from '../utils/groupValidation';
import { confirmAction, showAlert } from '../utils/dialogs';

type Props = RootStackScreenProps<'GroupForm'>;

const DEFAULT_LIMIT = '10';

export function GroupFormScreen({ navigation, route }: Props) {
  const groupId = route.params?.groupId;
  const returnedMemberIds = route.params?.selectedMemberIds;
  const isEditing = Boolean(groupId);

  const currentUser = useCurrentUser();
  const groupState = useGroup(groupId, currentUser.uid);
  const { group, members, isOwner, availableSlots } = groupState;
  const { create, creating } = useCreateGroup();

  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [limitText, setLimitText] = useState(DEFAULT_LIMIT);
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingLimit, setUpdatingLimit] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initializedGroupId, setInitializedGroupId] = useState<string | null>(null);
  const [handledSelection, setHandledSelection] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Editar grupo' : 'Novo grupo' });
  }, [navigation, isEditing]);

  if (group && initializedGroupId !== group.id) {
    setInitializedGroupId(group.id);
    setName(group.name);
    setLimitText(String(group.memberLimit));
    setPolicy(group.notificationPolicy);
  }

  if (!isEditing && returnedMemberIds && returnedMemberIds !== handledSelection) {
    setHandledSelection(returnedMemberIds);
    setSelectedIds(returnedMemberIds);
  }

  const { profiles: selectedProfiles } = usePublicProfiles(selectedIds);

  const memberLimit = useMemo(() => parseMemberLimit(limitText), [limitText]);
  const memberCount = isEditing ? (group?.memberIds.length ?? 0) : selectedIds.length + 1;

  const errors = useMemo(() => {
    if (!submitted) {
      return { name: null, limit: null, members: null };
    }

    return {
      name: validateGroupName(name),
      limit: validateMemberLimit(memberLimit, memberCount),
      members: isEditing ? null : validateInitialMembers(selectedIds, memberLimit),
    };
  }, [submitted, name, memberLimit, memberCount, isEditing, selectedIds]);

  const capacityText = memberLimit !== null && memberLimit > 0 ? formatCapacity(memberCount, memberLimit) : null;

  const openMemberSelection = useCallback(() => {
    if (isEditing && group) {
      if (availableSlots === 0) {
        showAlert('Grupo sem vagas', 'Aumente o limite antes de adicionar novos integrantes.');
        return;
      }

      navigation.navigate('Users', {
        mode: 'selectMembers',
        groupId: group.id,
        selectedIds: [],
        excludedIds: group.memberIds,
        maxSelectable: availableSlots,
      });
      return;
    }

    navigation.navigate('Users', {
      mode: 'selectMembers',
      selectedIds,
      excludedIds: [currentUser.uid],
      maxSelectable: memberLimit !== null ? Math.max(memberLimit - 1, 0) : null,
    });
  }, [isEditing, group, availableSlots, navigation, selectedIds, currentUser.uid, memberLimit]);

  async function handleCreate() {
    setSubmitted(true);

    const hasErrors =
      validateGroupName(name) ||
      validateMemberLimit(memberLimit, memberCount) ||
      validateInitialMembers(selectedIds, memberLimit);

    if (hasErrors || memberLimit === null) {
      return;
    }

    setError(null);

    try {
      const newGroupId = await create({
        name,
        photoUri,
        memberIds: selectedIds,
        memberLimit,
        notificationPolicy: policy,
      });

      navigation.replace('Chat', { conversationId: newGroupId, conversationType: 'group' });
    } catch (createError) {
      setError(getErrorMessage(createError, 'Não foi possível criar o grupo.'));
    }
  }

  async function handleSaveDetails() {
    setSubmitted(true);

    if (validateGroupName(name)) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await groupState.saveDetails({ name, photoUri, notificationPolicy: policy });
      setPhotoUri(null);
      showAlert('Grupo atualizado', 'As alterações foram salvas.');
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Não foi possível salvar o grupo.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateLimit() {
    setSubmitted(true);

    if (memberLimit === null || validateMemberLimit(memberLimit, memberCount)) {
      return;
    }

    setUpdatingLimit(true);
    setError(null);

    try {
      await groupState.changeLimit(memberLimit);
      showAlert('Limite atualizado', `O grupo agora aceita até ${memberLimit} integrantes.`);
    } catch (limitError) {
      setError(getErrorMessage(limitError, 'Não foi possível alterar o limite.'));
    } finally {
      setUpdatingLimit(false);
    }
  }

  const handleRemove = useCallback(
    (member: PublicProfile) => {
      confirmAction('Remover integrante', `Remover ${member.name} do grupo?`, 'Remover', async () => {
        setRemovingId(member.uid);

        try {
          await groupState.removeGroupMember(member.uid);
        } catch (removeError) {
          setError(getErrorMessage(removeError, 'Não foi possível remover o integrante.'));
        } finally {
          setRemovingId(null);
        }
      });
    },
    [groupState],
  );

  if (isEditing && groupState.loading) {
    return <Loading message="Carregando grupo..." />;
  }

  if (isEditing && (!group || groupState.error)) {
    return <EmptyState title="Grupo indisponível" description={groupState.error ?? undefined} />;
  }

  if (isEditing && !isOwner) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="Somente o proprietário pode editar o grupo."
        action={<Button title="Ver integrantes" onPress={() => navigation.replace('GroupMembers', { groupId: groupId ?? '' })} />}
      />
    );
  }

  const busy = creating || saving;
  const displayPhoto = photoUri ?? group?.photoUrl ?? '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <ImagePickerField
            label={displayPhoto ? 'Alterar foto do grupo' : 'Escolher foto do grupo'}
            uri={displayPhoto}
            variant="group"
            disabled={busy}
            onChange={setPhotoUri}
          />

          {error ? <ErrorMessage message={error} onDismiss={() => setError(null)} /> : null}

          <Input
            label="Nome do grupo"
            value={name}
            onChangeText={setName}
            error={errors.name}
            placeholder="Ex.: Equipe do projeto"
            maxLength={60}
          />

          <Text style={styles.sectionTitle}>Limite de integrantes</Text>
          <Input
            label="Quantidade máxima (incluindo o proprietário)"
            value={limitText}
            onChangeText={(value) => setLimitText(value.replace(/\D/g, ''))}
            error={errors.limit}
            keyboardType="number-pad"
            maxLength={3}
          />
          {capacityText ? <Text style={styles.capacity}>{capacityText}</Text> : null}
          {isEditing ? (
            <Button
              title="Atualizar limite"
              variant="secondary"
              onPress={handleUpdateLimit}
              loading={updatingLimit}
              disabled={busy}
              style={styles.spaced}
            />
          ) : null}

          <Text style={styles.sectionTitle}>Política de notificações</Text>
          <PolicySelector value={policy} onChange={setPolicy} disabled={busy} />

          <View style={styles.membersHeader}>
            <Text style={styles.sectionTitle}>Integrantes</Text>
            <Button
              title={isEditing ? 'Adicionar' : 'Selecionar'}
              variant="ghost"
              onPress={openMemberSelection}
              disabled={busy}
            />
          </View>
          {errors.members ? <Text style={styles.errorText}>{errors.members}</Text> : null}

          {isEditing && group ? (
            members.map((member) => (
              <GroupMemberItem
                key={member.uid}
                member={member}
                isOwner={member.uid === group.ownerId}
                isCurrentUser={member.uid === currentUser.uid}
                canRemove={member.uid !== group.ownerId}
                removing={removingId === member.uid}
                onPress={(profile) => navigation.navigate('Profile', { uid: profile.uid })}
                onRemove={handleRemove}
              />
            ))
          ) : (
            <>
              <GroupMemberItem
                member={{ uid: currentUser.uid, name: currentUser.name, photoUrl: currentUser.photoUrl }}
                isOwner
                isCurrentUser
                canRemove={false}
                onPress={() => undefined}
              />
              {selectedProfiles.map((member) => (
                <GroupMemberItem
                  key={member.uid}
                  member={member}
                  isOwner={false}
                  isCurrentUser={false}
                  canRemove
                  onPress={() => undefined}
                  onRemove={(profile) => setSelectedIds((ids) => ids.filter((id) => id !== profile.uid))}
                />
              ))}
            </>
          )}

          <Button
            title={isEditing ? 'Salvar alterações' : 'Criar grupo'}
            onPress={isEditing ? handleSaveDetails : handleCreate}
            loading={busy}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  sectionTitle: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
  },
  capacity: {
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  spaced: {
    marginBottom: theme.spacing.sm,
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
  },
  submit: {
    marginTop: theme.spacing.lg,
  },
});
