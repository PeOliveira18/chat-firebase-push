import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConversationContext, GroupData, NotificationPolicy, StoredMessage } from '../types/domain.js';
import { resolveRecipients } from './recipientResolver.js';

function group(policy: NotificationPolicy, memberIds = ['owner', 'ana', 'bia', 'caio']): ConversationContext {
  const data: GroupData = {
    id: 'grupo1',
    name: 'Grupo',
    photoUrl: '',
    ownerId: 'owner',
    memberIds,
    memberLimit: 5,
    notificationPolicy: policy,
    createdAt: 0,
    updatedAt: 0,
  };

  return { type: 'group', id: data.id, group: data };
}

function message(overrides: Partial<StoredMessage> = {}): StoredMessage {
  return {
    id: 'm1',
    conversationId: 'grupo1',
    conversationType: 'group',
    senderId: 'ana',
    target: { type: 'conversation' },
    mentionedUserIds: [],
    createdAt: 0,
    ...overrides,
  };
}

const uids = (list: { uid: string }[]) => list.map((item) => item.uid).sort();

describe('resolveRecipients', () => {
  it('conversa individual notifica apenas o outro participante', () => {
    const conversation: ConversationContext = { type: 'direct', id: 'ana_bia', participantIds: ['ana', 'bia'] };
    const result = resolveRecipients(conversation, message({ conversationType: 'direct', conversationId: 'ana_bia' }));

    assert.deepEqual(uids(result), ['bia']);
  });

  it('all_group_messages notifica todos exceto o remetente', () => {
    const result = resolveRecipients(group('all_group_messages'), message());

    assert.deepEqual(uids(result), ['bia', 'caio', 'owner']);
  });

  it('mentioned_members notifica somente mencionados e destinatário selecionado', () => {
    const result = resolveRecipients(
      group('mentioned_members'),
      message({ mentionedUserIds: ['bia'], target: { type: 'member', memberId: 'caio' } }),
    );

    assert.deepEqual(uids(result), ['bia', 'caio']);
  });

  it('mentioned_members ignora não integrantes e o próprio remetente', () => {
    const result = resolveRecipients(
      group('mentioned_members'),
      message({ mentionedUserIds: ['intruso', 'ana', 'owner'] }),
    );

    assert.deepEqual(uids(result), ['owner']);
  });

  it('mentioned_members sem menção não notifica ninguém', () => {
    assert.deepEqual(resolveRecipients(group('mentioned_members'), message()), []);
  });

  it('direct_messages_only não gera push para mensagens de grupo', () => {
    assert.deepEqual(resolveRecipients(group('direct_messages_only'), message({ mentionedUserIds: ['bia'] })), []);
  });

  it('disabled não gera push', () => {
    assert.deepEqual(resolveRecipients(group('disabled'), message({ mentionedUserIds: ['bia'] })), []);
  });

  it('integrante removido não recebe push', () => {
    const result = resolveRecipients(group('all_group_messages', ['owner', 'ana']), message());

    assert.deepEqual(uids(result), ['owner']);
  });
});
