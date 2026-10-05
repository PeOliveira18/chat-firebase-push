import {
  limitToLast,
  onValue,
  orderByChild,
  push,
  query as rtdbQuery,
  ref,
  serverTimestamp,
  set,
} from 'firebase/database';
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  Unsubscribe,
  where,
} from 'firebase/firestore';

import { db, rtdb } from '../config/firebase';
import { ChatMessage, DirectConversation, SendMessageInput } from '../types/chat';
import { DirectConversationDocument, MessageRecord } from '../types/firebase';
import { buildDirectConversationId } from '../utils/conversationId';
import { AppError } from '../utils/errorMessages';
import { asNumber, asStringArray, parseMessage } from '../utils/parsers';

const DIRECT_CONVERSATIONS_COLLECTION = 'directConversations';
const MESSAGES_PATH = 'messages';
const MESSAGES_PAGE_SIZE = 100;
export const MAX_MESSAGE_LENGTH = 2000;

function toDirectConversation(id: string, data: Record<string, unknown>): DirectConversation | null {
  const participants = asStringArray(data.participantIds);

  if (participants.length !== 2) {
    return null;
  }

  return {
    id,
    type: 'direct',
    participants: [participants[0], participants[1]],
    createdAt: asNumber(data.createdAt),
  };
}

/**
 * Cria ou localiza a conversa individual entre dois usuários.
 * O ID determinístico + transação garantem que nunca existam duas conversas
 * para o mesmo par, mesmo que ambos iniciem a conversa ao mesmo tempo.
 */
export async function findOrCreateDirectConversation(
  myUid: string,
  otherUid: string,
): Promise<DirectConversation> {
  const conversationId = buildDirectConversationId(myUid, otherUid);
  const conversationRef = doc(db, DIRECT_CONVERSATIONS_COLLECTION, conversationId);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(conversationRef);
    const existing = snapshot.data();

    if (existing) {
      const conversation = toDirectConversation(conversationId, existing);

      if (!conversation) {
        throw new AppError('Conversa inválida.');
      }

      return conversation;
    }

    const participants = [myUid, otherUid].sort();
    const document: DirectConversationDocument = {
      participantIds: [participants[0], participants[1]],
      createdAt: Date.now(),
    };

    transaction.set(conversationRef, document);

    return {
      id: conversationId,
      type: 'direct',
      participants: document.participantIds,
      createdAt: document.createdAt,
    };
  });
}

export function observeDirectConversations(
  uid: string,
  onNext: (conversations: DirectConversation[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const conversationsQuery = query(
    collection(db, DIRECT_CONVERSATIONS_COLLECTION),
    where('participantIds', 'array-contains', uid),
  );

  return onSnapshot(
    conversationsQuery,
    (snapshot) => {
      const conversations = snapshot.docs
        .map((document) => toDirectConversation(document.id, document.data()))
        .filter((conversation): conversation is DirectConversation => conversation !== null);

      onNext(conversations);
    },
    onError,
  );
}

/**
 * Persiste a mensagem no Realtime Database e devolve o ID gerado.
 */
export async function sendMessage(input: SendMessageInput, messageId?: string): Promise<string> {
  const text = input.text.trim();

  if (!text) {
    throw new AppError('Digite uma mensagem.');
  }

  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(`A mensagem deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`);
  }

  const conversationRef = ref(rtdb, `${MESSAGES_PATH}/${input.conversationId}`);
  const messageRef = messageId
    ? ref(rtdb, `${MESSAGES_PATH}/${input.conversationId}/${messageId}`)
    : push(conversationRef);

  if (!messageRef.key) {
    throw new AppError('Não foi possível gerar o identificador da mensagem.');
  }

  const record: MessageRecord = {
    conversationType: input.conversationType,
    senderId: input.senderId,
    text,
    target: input.target,
    mentionedUserIds: input.mentionedUserIds,
    createdAt: serverTimestamp(),
  };

  await set(messageRef, record);

  return messageRef.key;
}

/** Gera um ID de mensagem antes do envio (usado para reenvio sem duplicar). */
export function createMessageId(conversationId: string): string {
  const key = push(ref(rtdb, `${MESSAGES_PATH}/${conversationId}`)).key;

  if (!key) {
    throw new AppError('Não foi possível gerar o identificador da mensagem.');
  }

  return key;
}

/**
 * Escuta as últimas mensagens da conversa em tempo real (Realtime Database).
 * Retorna a função que remove o listener (chamada no cleanup do useEffect).
 */
export function observeMessages(
  conversationId: string,
  onNext: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const messagesQuery = rtdbQuery(
    ref(rtdb, `${MESSAGES_PATH}/${conversationId}`),
    orderByChild('createdAt'),
    limitToLast(MESSAGES_PAGE_SIZE),
  );

  return onValue(
    messagesQuery,
    (snapshot) => {
      const messages: ChatMessage[] = [];

      // forEach percorre os filhos na ordem da query (createdAt crescente).
      snapshot.forEach((child) => {
        const value: unknown = child.val();
        const message = child.key ? parseMessage(conversationId, child.key, value) : null;

        if (message) {
          messages.push(message);
        }
      });

      onNext(messages);
    },
    onError,
  );
}
