import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { closeAdminApp, firestore, rtdb } from '../../server/src/services/firebaseAdmin.js';
import { addMembers, createGroup, removeMember } from '../../server/src/services/groupMembership.js';
import { notifyMessage } from '../../server/src/services/messageNotifier.js';
import { HttpError } from '../../server/src/utils/httpError.js';

/**
 * Testes de integração da API usando o Firebase Emulator Suite
 * (Firebase Admin SDK apontando para os emuladores).
 */
const users = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7'];

function codeOf(result: PromiseSettledResult<unknown>): string {
  if (result.status === 'fulfilled') {
    return 'OK';
  }

  return result.reason instanceof HttpError ? result.reason.code : String(result.reason);
}

function newGroupId(): string {
  return firestore().collection('groups').doc().id;
}

before(async () => {
  for (const uid of users) {
    await firestore().collection('publicProfiles').doc(uid).set({ uid, name: `Usuário ${uid}`, photoUrl: '' });
  }
});

after(async () => {
  await closeAdminApp();
});

describe('Limite do grupo sob concorrência', () => {
  it('entradas simultâneas não ultrapassam o limite', async () => {
    const groupId = newGroupId();

    await createGroup('u1', {
      groupId,
      name: 'Concorrência',
      photoUrl: '',
      memberIds: ['u2'],
      memberLimit: 3,
      notificationPolicy: 'all_group_messages',
    });

    // 5 requisições concorrentes disputando 1 única vaga.
    const results = await Promise.allSettled(
      ['u3', 'u4', 'u5', 'u6', 'u7'].map((uid) => addMembers('u1', groupId, [uid])),
    );
    const codes = results.map(codeOf);

    assert.equal(codes.filter((code) => code === 'OK').length, 1);
    assert.equal(codes.filter((code) => code === 'GROUP_FULL').length, 4);

    const group = await firestore().collection('groups').doc(groupId).get();
    const memberIds: unknown = group.get('memberIds');
    assert.ok(Array.isArray(memberIds));
    assert.equal(memberIds.length, 3);

    const mirror = await rtdb().ref(`groupMembers/${groupId}`).get();
    assert.equal(Object.keys(mirror.val() ?? {}).length, 3);
  });

  it('não reduz o limite abaixo da quantidade de integrantes e só o dono gerencia', async () => {
    const groupId = newGroupId();

    await createGroup('u1', {
      groupId,
      name: 'Dono',
      photoUrl: '',
      memberIds: ['u2', 'u3'],
      memberLimit: 4,
      notificationPolicy: 'all_group_messages',
    });

    const { updateMemberLimit } = await import('../../server/src/services/groupMembership.js');
    const [below, notOwner] = await Promise.allSettled([
      updateMemberLimit('u1', groupId, 2),
      addMembers('u2', groupId, ['u4']),
    ]);

    assert.equal(codeOf(below), 'LIMIT_BELOW_MEMBERS');
    assert.equal(codeOf(notOwner), 'NOT_GROUP_OWNER');
  });

  it('remover integrante atualiza o espelho do RTDB', async () => {
    const groupId = newGroupId();

    await createGroup('u1', {
      groupId,
      name: 'Remoção',
      photoUrl: '',
      memberIds: ['u2', 'u3'],
      memberLimit: 5,
      notificationPolicy: 'all_group_messages',
    });

    await removeMember('u1', groupId, 'u3');

    const mirror = await rtdb().ref(`groupMembers/${groupId}/u3`).get();
    assert.equal(mirror.exists(), false);

    // O vínculo deixa de citar este grupo (pode existir por outro grupo em comum).
    const link = await firestore().collection('userLinks').doc('u1_u3').get();
    const groupIds: unknown = link.get('groupIds');
    assert.ok(!link.exists || (Array.isArray(groupIds) && !groupIds.includes(groupId)));
  });
});

describe('Notificações', () => {
  it('protege contra chamadas duplicadas da mesma mensagem', async () => {
    const conversationId = 'u1_u2';

    await firestore().collection('directConversations').doc(conversationId).set({
      participantIds: ['u1', 'u2'],
      createdAt: Date.now(),
    });
    await rtdb().ref(`messages/${conversationId}/m-dup`).set({
      conversationType: 'direct',
      senderId: 'u1',
      text: 'Olá',
      target: { type: 'conversation' },
      createdAt: Date.now(),
    });

    const results = await Promise.all([
      notifyMessage('u1', conversationId, 'm-dup'),
      notifyMessage('u1', conversationId, 'm-dup'),
    ]);
    const again = await notifyMessage('u1', conversationId, 'm-dup');

    assert.deepEqual(results.map((result) => result.status).sort(), ['duplicate', 'sent']);
    assert.equal(again.status, 'duplicate');
  });

  it('rejeita pedido de push feito por quem não é o remetente', async () => {
    const [result] = await Promise.allSettled([notifyMessage('u2', 'u1_u2', 'm-dup')]);

    assert.equal(codeOf(result), 'NOT_SENDER');
  });

  it('política disabled não envia push', async () => {
    const groupId = newGroupId();

    await createGroup('u1', {
      groupId,
      name: 'Silencioso',
      photoUrl: '',
      memberIds: ['u2'],
      memberLimit: 5,
      notificationPolicy: 'disabled',
    });
    await rtdb().ref(`messages/${groupId}/m1`).set({
      conversationType: 'group',
      senderId: 'u2',
      text: 'Oi',
      target: { type: 'conversation' },
      createdAt: Date.now(),
    });

    const result = await notifyMessage('u2', groupId, 'm1');
    assert.equal(result.status, 'skipped');
  });
});
