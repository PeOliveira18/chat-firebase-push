export type ConversationType = 'direct' | 'group';

export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export const NOTIFICATION_POLICIES: readonly NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];

export type MessageTarget =
  | { type: 'conversation' }
  | { type: 'member'; memberId: string };

export type StoredMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

export type GroupData = {
  id: string;
  name: string;
  photoUrl: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  createdAt: number;
  updatedAt: number;
};

export type ConversationContext =
  | { type: 'direct'; id: string; participantIds: string[] }
  | { type: 'group'; id: string; group: GroupData };
