import { ConversationContext, StoredMessage } from '../types/domain.js';

export type RecipientReason = 'direct' | 'group' | 'mentioned';

export type Recipient = {
  uid: string;
  reason: RecipientReason;
};

export function resolveRecipients(conversation: ConversationContext, message: StoredMessage): Recipient[] {
  const senderId = message.senderId;

  if (conversation.type === 'direct') {
    return conversation.participantIds
      .filter((uid) => uid !== senderId)
      .map((uid) => ({ uid, reason: 'direct' }));
  }

  const { group } = conversation;
  const members = new Set(group.memberIds);
  const explicitTargets = new Set(message.mentionedUserIds);

  if (message.target.type === 'member') {
    explicitTargets.add(message.target.memberId);
  }

  switch (group.notificationPolicy) {
    case 'all_group_messages':
      return group.memberIds
        .filter((uid) => uid !== senderId)
        .map((uid) => ({ uid, reason: explicitTargets.has(uid) ? 'mentioned' : 'group' }));

    case 'mentioned_members':
      return Array.from(explicitTargets)
        .filter((uid) => uid !== senderId && members.has(uid))
        .map((uid) => ({ uid, reason: 'mentioned' }));

    case 'direct_messages_only':
    case 'disabled':
      return [];

    default: {
      const exhaustive: never = group.notificationPolicy;
      return exhaustive;
    }
  }
}
