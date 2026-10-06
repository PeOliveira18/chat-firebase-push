import { useCallback, useMemo, useState } from 'react';

import {
  addMembers,
  createGroup,
  observeGroup,
  observeMyGroups,
  removeMember,
  updateGroupDetails,
  updateMemberLimit,
} from '../services/groupService';
import { ChatGroup, CreateGroupInput, UpdateGroupDetailsInput } from '../types/group';
import { getErrorMessage, isPermissionError } from '../utils/errorMessages';
import { getAvailableSlots } from '../utils/groupValidation';
import { usePublicProfiles } from './useProfiles';
import { useSubscription } from './useSubscription';

const NO_GROUPS: ChatGroup[] = [];
const NO_MEMBER_IDS: string[] = [];

export function useMyGroups(uid: string) {
  const { data, loading, error } = useSubscription(uid, observeMyGroups, NO_GROUPS);

  return {
    groups: data,
    loading,
    error: error ? getErrorMessage(error, 'Não foi possível carregar os grupos.') : null,
  };
}

export function useGroup(groupId: string | undefined, currentUid: string) {
  const { data: group, loading, error: listenerError } = useSubscription<ChatGroup | null>(
    groupId ?? null,
    observeGroup,
    null,
  );

  const accessRevoked = listenerError !== null && isPermissionError(listenerError);

  let error: string | null = null;

  if (accessRevoked) {
    error = 'Você não faz mais parte deste grupo.';
  } else if (listenerError) {
    error = getErrorMessage(listenerError, 'Não foi possível carregar o grupo.');
  } else if (groupId && !loading && !group) {
    error = 'Grupo não encontrado.';
  }

  const { profiles: members } = usePublicProfiles(group?.memberIds ?? NO_MEMBER_IDS);

  const isOwner = useMemo(() => group?.ownerId === currentUid, [group, currentUid]);
  const availableSlots = useMemo(() => (group ? getAvailableSlots(group) : 0), [group]);

  const saveDetails = useCallback(
    async (input: UpdateGroupDetailsInput) => {
      if (group) {
        await updateGroupDetails(group, input);
      }
    },
    [group],
  );

  const changeLimit = useCallback(
    async (limit: number) => {
      if (group) {
        await updateMemberLimit(group, limit);
      }
    },
    [group],
  );

  const addGroupMembers = useCallback(
    async (memberIds: string[]) => {
      if (groupId) {
        await addMembers(groupId, memberIds);
      }
    },
    [groupId],
  );

  const removeGroupMember = useCallback(
    async (memberId: string) => {
      if (groupId) {
        await removeMember(groupId, memberId);
      }
    },
    [groupId],
  );

  return {
    group,
    members,
    loading,
    error,
    accessRevoked,
    isOwner,
    availableSlots,
    saveDetails,
    changeLimit,
    addGroupMembers,
    removeGroupMember,
  };
}

export function useCreateGroup() {
  const [creating, setCreating] = useState(false);

  const create = useCallback(async (input: CreateGroupInput) => {
    setCreating(true);

    try {
      return await createGroup(input);
    } finally {
      setCreating(false);
    }
  }, []);

  return { create, creating };
}
