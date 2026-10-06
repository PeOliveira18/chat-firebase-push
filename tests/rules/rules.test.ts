import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { get, ref, serverTimestamp, set } from 'firebase/database';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-chat';
let env: RulesTestEnvironment;

const ana = 'anaUid';
const bia = 'biaUid';
const caio = 'caioUid';
const groupId = 'grupo00000000000001';

function user(uid: string) {
  return {
    uid,
    name: uid,
    email: `${uid.toLowerCase()}@teste.com`,
    phoneNumber: '(11) 99999-9999',
    birthDate: '01/01/2000',
    photoUrl: '',
    createdAt: 1,
  };
}

function authed(uid: string) {
  return env.authenticatedContext(uid, { email: `${uid.toLowerCase()}@teste.com` });
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync('../../firestore.rules', 'utf8') },
    database: { rules: readFileSync('../../database.rules.json', 'utf8') },
  });
});

after(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearDatabase();

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    for (const uid of [ana, bia, caio]) {
      await setDoc(doc(db, 'users', uid), user(uid));
      await setDoc(doc(db, 'publicProfiles', uid), { uid, name: uid, photoUrl: '' });
    }

    await setDoc(doc(db, 'groups', groupId), {
      name: 'Grupo',
      photoUrl: '',
      ownerId: ana,
      memberIds: [ana, bia],
      memberLimit: 3,
      notificationPolicy: 'all_group_messages',
      createdAt: 1,
      updatedAt: 1,
    });

    await set(ref(context.database(), `groupMembers/${groupId}`), { [ana]: true, [bia]: true });
  });
});

describe('Firestore', () => {
  it('bloqueia acesso sem autenticação', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'publicProfiles', ana)));
  });

  it('usuário cria apenas o próprio perfil', async () => {
    const db = authed('novoUid').firestore();
    await assertSucceeds(setDoc(doc(db, 'users', 'novoUid'), user('novoUid')));
    await assertFails(setDoc(doc(db, 'users', 'outroUid'), user('outroUid')));
  });

  it('dados cadastrais não ficam acessíveis sem conversa ou grupo em comum', async () => {
    await assertFails(getDoc(doc(authed(caio).firestore(), 'users', ana)));
  });

  it('conversa individual libera o perfil do outro participante', async () => {
    const db = authed(ana).firestore();
    const conversationId = [ana, caio].sort().join('_');
    const participants = [ana, caio].sort();

    await assertSucceeds(setDoc(doc(db, 'directConversations', conversationId), { participantIds: participants, createdAt: 1 }));
    await assertSucceeds(getDoc(doc(db, 'users', caio)));
  });

  it('impede conversa consigo mesmo ou com ID fora do padrão', async () => {
    const db = authed(ana).firestore();

    await assertFails(setDoc(doc(db, 'directConversations', `${ana}_${ana}`), { participantIds: [ana, ana], createdAt: 1 }));
    await assertFails(
      setDoc(doc(db, 'directConversations', 'qualquer'), { participantIds: [ana, caio].sort(), createdAt: 1 }),
    );
  });

  it('vínculo de grupo (userLinks) libera o perfil', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'userLinks', `${bia}_${ana}`), { groupIds: [groupId] });
    });

    await assertSucceeds(getDoc(doc(authed(bia).firestore(), 'users', ana)));
  });

  it('somente integrantes leem o grupo', async () => {
    await assertSucceeds(getDoc(doc(authed(bia).firestore(), 'groups', groupId)));
    await assertFails(getDoc(doc(authed(caio).firestore(), 'groups', groupId)));
  });

  it('proprietário altera nome e política, mas não integrantes ou limite', async () => {
    const db = authed(ana).firestore();

    await assertSucceeds(
      updateDoc(doc(db, 'groups', groupId), { name: 'Novo nome', notificationPolicy: 'disabled', updatedAt: 2 }),
    );
    await assertFails(updateDoc(doc(db, 'groups', groupId), { memberIds: [ana, bia, caio] }));
    await assertFails(updateDoc(doc(db, 'groups', groupId), { memberLimit: 50 }));
  });

  it('integrante comum não gerencia o grupo', async () => {
    await assertFails(updateDoc(doc(authed(bia).firestore(), 'groups', groupId), { name: 'Hack', updatedAt: 2 }));
  });

  it('tokens de dispositivos não são públicos', async () => {
    const device = { token: 'ExponentPushToken[abc]', platform: 'android', enabled: true, updatedAt: 1 };

    await assertSucceeds(setDoc(doc(authed(ana).firestore(), 'users', ana, 'devices', 'd1'), device));
    await assertFails(getDoc(doc(authed(bia).firestore(), 'users', ana, 'devices', 'd1')));
  });

  it('cliente não acessa coleções exclusivas da API', async () => {
    await assertFails(setDoc(doc(authed(ana).firestore(), 'userLinks', `${ana}_${caio}`), { groupIds: ['x'] }));
    await assertFails(getDoc(doc(authed(ana).firestore(), 'notificationDispatches', 'x')));
  });
});

describe('Realtime Database', () => {
  const directId = [ana, bia].sort().join('_');

  function message(senderId: string, type: 'direct' | 'group', extra: Record<string, unknown> = {}) {
    return {
      conversationType: type,
      senderId,
      text: 'Olá',
      target: { type: 'conversation' },
      createdAt: serverTimestamp(),
      ...extra,
    };
  }

  it('participante envia e lê mensagens da conversa individual', async () => {
    const db = authed(ana).database();

    await assertSucceeds(set(ref(db, `messages/${directId}/m1`), message(ana, 'direct')));
    await assertSucceeds(get(ref(authed(bia).database(), `messages/${directId}`)));
  });

  it('não participante não lê nem escreve na conversa individual', async () => {
    await assertFails(get(ref(authed(caio).database(), `messages/${directId}`)));
    await assertFails(set(ref(authed(caio).database(), `messages/${directId}/m1`), message(caio, 'direct')));
  });

  it('senderId deve ser o usuário autenticado', async () => {
    await assertFails(set(ref(authed(ana).database(), `messages/${directId}/m1`), message(bia, 'direct')));
  });

  it('mensagem não pode ser sobrescrita', async () => {
    const db = authed(ana).database();

    await assertSucceeds(set(ref(db, `messages/${directId}/m1`), message(ana, 'direct')));
    await assertFails(set(ref(db, `messages/${directId}/m1`), message(ana, 'direct', { text: 'editado' })));
  });

  it('somente integrantes ativos leem e enviam mensagens do grupo', async () => {
    await assertSucceeds(set(ref(authed(bia).database(), `messages/${groupId}/m1`), message(bia, 'group')));
    await assertSucceeds(get(ref(authed(ana).database(), `messages/${groupId}`)));
    await assertFails(get(ref(authed(caio).database(), `messages/${groupId}`)));
    await assertFails(set(ref(authed(caio).database(), `messages/${groupId}/m2`), message(caio, 'group')));
  });

  it('integrante removido perde acesso às novas mensagens', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await set(ref(context.database(), `groupMembers/${groupId}/${bia}`), null);
    });

    await assertFails(get(ref(authed(bia).database(), `messages/${groupId}`)));
    await assertFails(set(ref(authed(bia).database(), `messages/${groupId}/m3`), message(bia, 'group')));
  });

  it('destinatário direcionado precisa ser integrante do grupo', async () => {
    const db = authed(ana).database();

    await assertSucceeds(
      set(ref(db, `messages/${groupId}/m1`), message(ana, 'group', { target: { type: 'member', memberId: bia } })),
    );
    await assertFails(
      set(ref(db, `messages/${groupId}/m2`), message(ana, 'group', { target: { type: 'member', memberId: caio } })),
    );
  });

  it('cliente não altera o espelho de integrantes', async () => {
    await assertFails(set(ref(authed(caio).database(), `groupMembers/${groupId}/${caio}`), true));
  });
});
