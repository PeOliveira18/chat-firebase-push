import { ChatMessage, ConversationType, MessageTarget } from '../types/chat';
import { ChatGroup } from '../types/group';
import { NOTIFICATION_POLICIES, NotificationPolicy } from '../types/notification';
import { ChatUser, PublicProfile } from '../types/user';

/**
 * Conversores de dados lidos do Firebase.
 *
 * O SDK devolve dados sem tipo garantido; aqui cada campo é validado
 * explicitamente, evitando o uso de `any` no restante do app.
 */

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

  // O RTDB pode devolver arrays como objetos { "0": "a", "1": "b" }.
  if (isRecord(value)) {
    return Object.values(value).filter((item): item is string => typeof item === 'string');
  }

  return [];
}

function isNotificationPolicy(value: unknown): value is NotificationPolicy {
  return typeof value === 'string' && NOTIFICATION_POLICIES.some((policy) => policy === value);
}

function isConversationType(value: unknown): value is ConversationType {
  return value === 'direct' || value === 'group';
}

export function parseChatUser(uid: string, data: UnknownRecord): ChatUser {
  return {
    uid,
    name: asString(data.name),
    email: asString(data.email),
    phoneNumber: asString(data.phoneNumber),
    birthDate: asString(data.birthDate),
    photoUrl: asString(data.photoUrl),
    createdAt: asNumber(data.createdAt),
  };
}

export function parsePublicProfile(uid: string, data: UnknownRecord): PublicProfile {
  return {
    uid,
    name: asString(data.name, 'Usuário'),
    photoUrl: asString(data.photoUrl),
  };
}

export function parseGroup(id: string, data: UnknownRecord): ChatGroup {
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

function parseTarget(value: unknown): MessageTarget {
  if (isRecord(value) && value.type === 'member' && typeof value.memberId === 'string') {
    return { type: 'member', memberId: value.memberId };
  }

  return { type: 'conversation' };
}

export function parseMessage(
  conversationId: string,
  messageId: string,
  value: unknown,
): ChatMessage | null {
  if (!isRecord(value) || !isConversationType(value.conversationType)) {
    return null;
  }

  return {
    id: messageId,
    conversationId,
    conversationType: value.conversationType,
    senderId: asString(value.senderId),
    text: asString(value.text),
    target: parseTarget(value.target),
    mentionedUserIds: asStringArray(value.mentionedUserIds),
    createdAt: asNumber(value.createdAt, Date.now()),
  };
}
