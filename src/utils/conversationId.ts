import { ConversationType } from '../types/chat';
import { AppError } from './errorMessages';

/**
 * Conversas individuais usam como ID os dois `uid` ordenados e separados por "_".
 * Assim o mesmo par de usuários sempre gera o mesmo ID e não existem conversas duplicadas.
 *
 * Os `uid` do Firebase Authentication e os IDs automáticos do Firestore não possuem "_",
 * então o separador também diferencia conversas individuais de grupos.
 */
const SEPARATOR = '_';

export function buildDirectConversationId(uidA: string, uidB: string): string {
  if (!uidA || !uidB) {
    throw new AppError('Usuário inválido para iniciar a conversa.');
  }

  if (uidA === uidB) {
    throw new AppError('Você não pode iniciar uma conversa consigo mesmo.');
  }

  return [uidA, uidB].sort().join(SEPARATOR);
}

export function isDirectConversationId(conversationId: string): boolean {
  return conversationId.split(SEPARATOR).length === 2;
}

export function getConversationType(conversationId: string): ConversationType {
  return isDirectConversationId(conversationId) ? 'direct' : 'group';
}

export function getDirectParticipants(conversationId: string): [string, string] | null {
  const parts = conversationId.split(SEPARATOR);

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  return [parts[0], parts[1]];
}

export function getOtherParticipantId(conversationId: string, myUid: string): string | null {
  const participants = getDirectParticipants(conversationId);

  if (!participants || !participants.includes(myUid)) {
    return null;
  }

  return participants[0] === myUid ? participants[1] : participants[0];
}
