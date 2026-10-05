import { firestore } from './firebaseAdmin.js';

/**
 * Proteção contra chamadas duplicadas.
 *
 * Cada par conversationId/messageId gera um documento em
 * notificationDispatches. A criação usa `create()`, que falha de forma
 * atômica se o documento já existir: uma requisição reenviada (ou
 * concorrente) não produz notificações repetidas.
 */
const COLLECTION = 'notificationDispatches';
const ALREADY_EXISTS = 6;

function dispatchRef(conversationId: string, messageId: string) {
  return firestore().collection(COLLECTION).doc(`${conversationId}_${messageId}`);
}

function isAlreadyExists(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  const { code } = error;
  return code === ALREADY_EXISTS || code === 'already-exists';
}

export async function claimDispatch(conversationId: string, messageId: string, senderId: string): Promise<boolean> {
  try {
    await dispatchRef(conversationId, messageId).create({
      conversationId,
      messageId,
      senderId,
      status: 'processing',
      createdAt: Date.now(),
    });

    return true;
  } catch (error) {
    if (isAlreadyExists(error)) {
      return false;
    }

    throw error;
  }
}

export async function completeDispatch(
  conversationId: string,
  messageId: string,
  details: Record<string, string | number>,
): Promise<void> {
  await dispatchRef(conversationId, messageId).update({ ...details, completedAt: Date.now() });
}

/** Libera a reserva quando nada foi enviado, permitindo uma nova tentativa. */
export async function releaseDispatch(conversationId: string, messageId: string): Promise<void> {
  await dispatchRef(conversationId, messageId).delete();
}
