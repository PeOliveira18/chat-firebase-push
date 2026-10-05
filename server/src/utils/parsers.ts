import {
  ConversationType,
  GroupData,
  MessageTarget,
  NOTIFICATION_POLICIES,
  NotificationPolicy,
  StoredMessage,
} from '../types/domain.js';

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (isRecord(value)) {
    return Object.values(value).filter((item): item is string => typeof item === 'string');
  }

  return [];
}

export function isNotificationPolicy(value: unknown): value is NotificationPolicy {
  return typeof value === 'string' && NOTIFICATION_POLICIES.some((policy) => policy === value);
}

function isConversationType(value: unknown): value is ConversationType {
  return value === 'direct' || value === 'group';
}

function parseTarget(value: unknown): MessageTarget {
  if (isRecord(value) && value.type === 'member' && typeof value.memberId === 'string') {
    return { type: 'member', memberId: value.memberId };
  }

  return { type: 'conversation' };
}

export function parseStoredMessage(
  conversationId: string,
  messageId: string,
  value: unknown,
): StoredMessage | null {
  if (!isRecord(value) || !isConversationType(value.conversationType) || typeof value.senderId !== 'string') {
    return null;
  }

  return {
    id: messageId,
    conversationId,
    conversationType: value.conversationType,
    senderId: value.senderId,
    target: parseTarget(value.target),
    mentionedUserIds: asStringArray(value.mentionedUserIds),
    createdAt: asNumber(value.createdAt),
  };
}

export function parseGroup(id: string, data: UnknownRecord): GroupData {
  return {
    id,
    name: asString(data.name, 'Grupo'),
    photoUrl: asString(data.photoUrl),
    ownerId: asString(data.ownerId),
    memberIds: asStringArray(data.memberIds),
    memberLimit: asNumber(data.memberLimit),
    notificationPolicy: isNotificationPolicy(data.notificationPolicy)
      ? data.notificationPolicy
      : 'all_group_messages',
    createdAt: asNumber(data.createdAt),
    updatedAt: asNumber(data.updatedAt),
  };
}

/** IDs do Firebase (uid, push id, auto id): letras, números, "-" e "_". */
const ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_REGEX.test(value);
}

export function isDirectConversationId(conversationId: string): boolean {
  return conversationId.split('_').length === 2;
}
