import { ConversationContext, StoredMessage } from '../types/domain.js';

export type RecipientReason = 'direct' | 'group' | 'mentioned';

export type Recipient = {
  uid: string;
  reason: RecipientReason;
};

/**
 * Calcula NO SERVIDOR quem deve receber o push de uma mensagem.
 * A API nunca confia em uma lista de destinatários enviada pelo app.
 *
 * Regras gerais:
 * - o remetente nunca recebe push da própria mensagem;
 * - somente participantes/integrantes ativos podem ser destinatários.
 *
 * Políticas de grupo:
 * - all_group_messages: todos os integrantes, exceto o remetente;
 * - mentioned_members: apenas mencionados (@) ou o destinatário selecionado;
 * - direct_messages_only: mensagens de grupo não geram push;
 * - disabled: nenhuma mensagem do grupo gera push.
 */
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
