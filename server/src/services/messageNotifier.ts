import { ConversationContext, StoredMessage } from '../types/domain.js';
import { forbidden, notFound } from '../utils/httpError.js';
import { asString, isDirectConversationId, parseGroup, parseStoredMessage } from '../utils/parsers.js';
import { claimDispatch, completeDispatch, releaseDispatch } from './dispatchRegistry.js';
import { firestore, rtdb } from './firebaseAdmin.js';
import { PushContent, sendPush } from './notificationSender.js';
import { Recipient, resolveRecipients } from './recipientResolver.js';

export type NotifyResult = {
  status: 'sent' | 'duplicate' | 'skipped';
  recipients: number;
  devices: number;
};

/** Confirma no Realtime Database que a mensagem existe. */
async function loadMessage(conversationId: string, messageId: string): Promise<StoredMessage> {
  const snapshot = await rtdb().ref(`messages/${conversationId}/${messageId}`).get();
  const value: unknown = snapshot.val();
  const message = parseStoredMessage(conversationId, messageId, value);

  if (!message) {
    throw notFound('Mensagem não encontrada.', 'MESSAGE_NOT_FOUND');
  }

  return message;
}

/** Consulta no Firestore os participantes e a política da conversa. */
async function loadConversation(conversationId: string): Promise<ConversationContext> {
  if (isDirectConversationId(conversationId)) {
    const snapshot = await firestore().collection('directConversations').doc(conversationId).get();

    if (!snapshot.exists) {
      throw notFound('Conversa não encontrada.', 'CONVERSATION_NOT_FOUND');
    }

    return {
      type: 'direct',
      id: conversationId,
      participantIds: conversationId.split('_'),
    };
  }

  const snapshot = await firestore().collection('groups').doc(conversationId).get();
  const data = snapshot.data();

  if (!data) {
    throw notFound('Grupo não encontrado.', 'GROUP_NOT_FOUND');
  }

  return { type: 'group', id: conversationId, group: parseGroup(snapshot.id, data) };
}

function isParticipant(conversation: ConversationContext, uid: string): boolean {
  return conversation.type === 'direct'
    ? conversation.participantIds.includes(uid)
    : conversation.group.memberIds.includes(uid);
}

async function getSenderName(uid: string): Promise<string> {
  const snapshot = await firestore().collection('publicProfiles').doc(uid).get();
  const name = asString(snapshot.get('name')).trim();

  return name || 'Alguém';
}

/**
 * Texto da notificação sem expor o conteúdo da mensagem
 * (evita informações sensíveis na tela de bloqueio).
 */
function buildContent(conversation: ConversationContext, senderName: string, recipient: Recipient): PushContent {
  if (conversation.type === 'direct') {
    return { uid: recipient.uid, title: senderName, body: 'Enviou uma nova mensagem.' };
  }

  return {
    uid: recipient.uid,
    title: conversation.group.name,
    body: recipient.reason === 'mentioned' ? `${senderName} mencionou você.` : `${senderName} enviou uma mensagem.`,
  };
}

export async function notifyMessage(uid: string, conversationId: string, messageId: string): Promise<NotifyResult> {
  const message = await loadMessage(conversationId, messageId);

  if (message.senderId !== uid) {
    throw forbidden('Somente o remetente pode solicitar o push da mensagem.', 'NOT_SENDER');
  }

  const conversation = await loadConversation(conversationId);

  if (message.conversationType !== conversation.type || !isParticipant(conversation, uid)) {
    throw forbidden('Você não participa desta conversa.', 'NOT_A_MEMBER');
  }

  const claimed = await claimDispatch(conversationId, messageId, uid);

  if (!claimed) {
    return { status: 'duplicate', recipients: 0, devices: 0 };
  }

  let pushed = false;

  try {
    const recipients = resolveRecipients(conversation, message);

    if (recipients.length === 0) {
      await completeDispatch(conversationId, messageId, { status: 'skipped', recipients: 0 });
      return { status: 'skipped', recipients: 0, devices: 0 };
    }

    const senderName = await getSenderName(uid);
    const contents = recipients.map((recipient) => buildContent(conversation, senderName, recipient));
    const result = await sendPush(contents, {
      conversationId,
      conversationType: conversation.type,
      messageId,
    });
    pushed = true;

    await completeDispatch(conversationId, messageId, {
      status: 'sent',
      recipients: recipients.length,
      devices: result.devices,
      sent: result.sent,
      failed: result.failed,
    });

    return { status: 'sent', recipients: recipients.length, devices: result.devices };
  } catch (error) {
    // Se nada foi enviado, libera a reserva para que o app possa tentar de novo.
    if (!pushed) {
      await releaseDispatch(conversationId, messageId).catch(() => undefined);
      throw error;
    }

    return { status: 'sent', recipients: 0, devices: 0 };
  }
}
