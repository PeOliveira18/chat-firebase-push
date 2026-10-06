import { useMemo } from 'react';

import { observeDirectConversations } from '../services/chatService';
import { ConversationSummary, DirectConversation } from '../types/chat';
import { getErrorMessage } from '../utils/errorMessages';
import { formatCapacity } from '../utils/groupValidation';
import { useMyGroups } from './useGroups';
import { usePublicProfiles } from './useProfiles';
import { useSubscription } from './useSubscription';

const NO_DIRECTS: DirectConversation[] = [];

export function useConversations(uid: string) {
  const { groups, loading: groupsLoading, error: groupsError } = useMyGroups(uid);
  const {
    data: directs,
    loading: directsLoading,
    error: directsError,
  } = useSubscription(uid, observeDirectConversations, NO_DIRECTS);

  const otherIds = useMemo(
    () => directs.map((conversation) => conversation.participants.find((id) => id !== uid) ?? ''),
    [directs, uid],
  );

  const { profilesById } = usePublicProfiles(otherIds);

  const conversations = useMemo<ConversationSummary[]>(() => {
    const directItems: ConversationSummary[] = directs.map((conversation, index) => {
      const profile = profilesById[otherIds[index]];

      return {
        id: conversation.id,
        type: 'direct',
        title: profile?.name ?? 'Usuário',
        photoUrl: profile?.photoUrl ?? '',
        subtitle: 'Conversa individual',
        updatedAt: conversation.createdAt,
      };
    });

    const groupItems: ConversationSummary[] = groups.map((group) => ({
      id: group.id,
      type: 'group',
      title: group.name,
      photoUrl: group.photoUrl,
      subtitle: formatCapacity(group.memberIds.length, group.memberLimit),
      updatedAt: group.updatedAt,
    }));

    return [...directItems, ...groupItems].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [directs, groups, profilesById, otherIds]);

  return {
    conversations,
    loading: groupsLoading || directsLoading,
    error:
      groupsError ??
      (directsError ? getErrorMessage(directsError, 'Não foi possível carregar as conversas.') : null),
  };
}
