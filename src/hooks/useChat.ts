import { useCallback, useMemo, useState } from 'react';

import {
  createMessageId,
  observeMessages,
  sendMessage as persistMessage,
} from '../services/chatService';
import { requestMessagePush } from '../services/notificationService';
import { ChatMessage, ConversationType, DisplayMessage, MessageTarget } from '../types/chat';
import { getErrorMessage } from '../utils/errorMessages';
import { useSubscription } from './useSubscription';

type UseChatParams = {
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
};

export type SendMessageParams = {
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
};

const NO_MESSAGES: ChatMessage[] = [];

export function useChat({ conversationId, conversationType, senderId }: UseChatParams) {
  const {
    data: messages,
    loading,
    error: listenerError,
  } = useSubscription(conversationId, observeMessages, NO_MESSAGES);
  const [pending, setPending] = useState<DisplayMessage[]>([]);
  const [pushWarning, setPushWarning] = useState<string | null>(null);

  const error = listenerError ? getErrorMessage(listenerError, 'Não foi possível carregar as mensagens.') : null;

  const deliver = useCallback(
    async (message: DisplayMessage) => {
      setPending((current) => [
        ...current.filter((item) => item.id !== message.id),
        { ...message, status: 'sending' },
      ]);

      try {
        await persistMessage(
          {
            conversationId,
            conversationType,
            senderId,
            text: message.text,
            target: message.target,
            mentionedUserIds: message.mentionedUserIds,
          },
          message.id,
        );

        setPending((current) => current.filter((item) => item.id !== message.id));
      } catch (sendError) {
        setPending((current) =>
          current.map((item) => (item.id === message.id ? { ...item, status: 'failed' } : item)),
        );
        throw sendError;
      }

      setPushWarning(null);
      requestMessagePush(conversationId, message.id).catch((pushError: unknown) => {
        setPushWarning(
          getErrorMessage(pushError, 'Mensagem enviada, mas a notificação não pôde ser disparada.'),
        );
      });
    },
    [conversationId, conversationType, senderId],
  );

  const sendMessage = useCallback(
    async ({ text, target, mentionedUserIds }: SendMessageParams) => {
      const message: DisplayMessage = {
        id: createMessageId(conversationId),
        conversationId,
        conversationType,
        senderId,
        text: text.trim(),
        target,
        mentionedUserIds,
        createdAt: Date.now(),
        status: 'sending',
      };

      await deliver(message);
    },
    [conversationId, conversationType, senderId, deliver],
  );

  const retryMessage = useCallback(
    async (messageId: string) => {
      const failed = pending.find((item) => item.id === messageId);

      if (failed) {
        await deliver(failed);
      }
    },
    [pending, deliver],
  );

  const discardMessage = useCallback((messageId: string) => {
    setPending((current) => current.filter((item) => item.id !== messageId));
  }, []);

  const displayMessages = useMemo<DisplayMessage[]>(() => {
    const persistedIds = new Set(messages.map((message) => message.id));
    const persisted: DisplayMessage[] = messages.map((message) => ({ ...message, status: 'sent' }));
    const localOnly = pending.filter(
      (message) => message.conversationId === conversationId && !persistedIds.has(message.id),
    );

    return [...persisted, ...localOnly];
  }, [messages, pending, conversationId]);

  return {
    messages: displayMessages,
    loading,
    error,
    pushWarning,
    sendMessage,
    retryMessage,
    discardMessage,
    dismissPushWarning: () => setPushWarning(null),
  };
}
