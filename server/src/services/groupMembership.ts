import { FieldValue, WriteBatch } from 'firebase-admin/firestore';

import { GroupData, NotificationPolicy } from '../types/domain.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/httpError.js';
import { isNotificationPolicy, isValidId, parseGroup } from '../utils/parsers.js';
import { firestore, rtdb } from './firebaseAdmin.js';
import {
  assertLimitCoversMembers,
  assertValidGroupName,
  assertValidLimit,
  computeMembersAfterAdd,
  MIN_GROUP_MEMBERS,
} from './groupRules.js';

const GROUPS = 'groups';
const PUBLIC_PROFILES = 'publicProfiles';
const USER_LINKS = 'userLinks';
const BATCH_LIMIT = 400;

const GROUP_ID_REGEX = /^[A-Za-z0-9]{20}$/;
const PHOTO_URL_PREFIX = 'https://res.cloudinary.com/';

export type CreateGroupInput = {
  groupId: unknown;
  name: unknown;
  photoUrl: unknown;
  memberIds: unknown;
  memberLimit: unknown;
  notificationPolicy: unknown;
};

function groupRef(groupId: string) {
  return firestore().collection(GROUPS).doc(groupId);
}

function parseMemberIds(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every(isValidId)) {
    throw badRequest('Lista de integrantes inválida.');
  }

  return Array.from(new Set(value));
}

function parsePhotoUrl(value: unknown): string {
  if (value === undefined || value === '') {
    return '';
  }

  if (typeof value !== 'string' || !value.startsWith(PHOTO_URL_PREFIX)) {
    throw badRequest('URL da foto inválida.');
  }

  return value;
}

async function assertUsersExist(uids: string[]): Promise<void> {
  if (uids.length === 0) {
    return;
  }

  const refs = uids.map((uid) => firestore().collection(PUBLIC_PROFILES).doc(uid));
  const snapshots = await firestore().getAll(...refs);

  if (snapshots.some((snapshot) => !snapshot.exists)) {
    throw notFound('Um dos usuários selecionados não existe.', 'USER_NOT_FOUND');
  }
}

async function syncMembersMirror(groupId: string, memberIds: string[]): Promise<void> {
  const members = Object.fromEntries(memberIds.map((uid) => [uid, true]));

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await rtdb().ref(`groupMembers/${groupId}`).set(members);
      return;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
    }
  }
}

function pairs(a: string[], b: string[]): [string, string][] {
  const result: [string, string][] = [];

  for (const viewer of a) {
    for (const target of b) {
      if (viewer !== target) {
        result.push([viewer, target]);
        result.push([target, viewer]);
      }
    }
  }

  return result;
}

async function commitInChunks(operations: ((batch: WriteBatch) => void)[]): Promise<void> {
  for (let index = 0; index < operations.length; index += BATCH_LIMIT) {
    const batch = firestore().batch();
    operations.slice(index, index + BATCH_LIMIT).forEach((operation) => operation(batch));
    await batch.commit();
  }
}

async function addUserLinks(groupId: string, newMembers: string[], allMembers: string[]): Promise<void> {
  const operations = pairs(newMembers, allMembers).map(([viewerId, targetId]) => (batch: WriteBatch) => {
    batch.set(
      firestore().collection(USER_LINKS).doc(`${viewerId}_${targetId}`),
      { viewerId, targetId, groupIds: FieldValue.arrayUnion(groupId), updatedAt: Date.now() },
      { merge: true },
    );
  });

  await commitInChunks(operations);
}

async function removeUserLinks(groupId: string, removedId: string, remaining: string[]): Promise<void> {
  const refs = pairs([removedId], remaining).map(([viewerId, targetId]) =>
    firestore().collection(USER_LINKS).doc(`${viewerId}_${targetId}`),
  );

  if (refs.length === 0) {
    return;
  }

  const snapshots = await firestore().getAll(...refs);
  const operations = snapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => (batch: WriteBatch) => {
      const groupIds: unknown = snapshot.get('groupIds');
      const others = Array.isArray(groupIds) ? groupIds.filter((id) => id !== groupId) : [];

      if (others.length === 0) {
        batch.delete(snapshot.ref);
      } else {
        batch.update(snapshot.ref, { groupIds: FieldValue.arrayRemove(groupId), updatedAt: Date.now() });
      }
    });

  await commitInChunks(operations);
}

export async function createGroup(ownerId: string, input: CreateGroupInput): Promise<GroupData> {
  if (typeof input.groupId !== 'string' || !GROUP_ID_REGEX.test(input.groupId)) {
    throw badRequest('Identificador do grupo inválido.');
  }

  assertValidGroupName(input.name);
  assertValidLimit(input.memberLimit);

  if (!isNotificationPolicy(input.notificationPolicy)) {
    throw badRequest('Política de notificação inválida.');
  }

  const groupId = input.groupId;
  const name = input.name.trim();
  const memberLimit = input.memberLimit;
  const notificationPolicy: NotificationPolicy = input.notificationPolicy;
  const photoUrl = parsePhotoUrl(input.photoUrl);
  const invited = parseMemberIds(input.memberIds).filter((uid) => uid !== ownerId);
  const memberIds = [ownerId, ...invited];

  if (memberIds.length < MIN_GROUP_MEMBERS) {
    throw badRequest('O grupo precisa de pelo menos dois integrantes.');
  }

  assertLimitCoversMembers(memberLimit, memberIds.length);
  await assertUsersExist(memberIds);

  const now = Date.now();
  const group: GroupData = {
    id: groupId,
    name,
    photoUrl,
    ownerId,
    memberIds,
    memberLimit,
    notificationPolicy,
    createdAt: now,
    updatedAt: now,
  };

  await firestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(groupRef(groupId));

    if (snapshot.exists) {
      throw conflict('Grupo já existe.', 'GROUP_EXISTS');
    }

    transaction.create(groupRef(groupId), {
      name,
      photoUrl,
      ownerId,
      memberIds,
      memberLimit,
      notificationPolicy,
      createdAt: now,
      updatedAt: now,
    });
  });

  await syncMembersMirror(groupId, memberIds);
  await addUserLinks(groupId, memberIds, memberIds);

  return group;
}

export async function updateMemberLimit(uid: string, groupId: string, memberLimit: unknown): Promise<GroupData> {
  assertValidLimit(memberLimit);

  return firestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(groupRef(groupId));
    const data = snapshot.data();

    if (!data) {
      throw notFound('Grupo não encontrado.', 'GROUP_NOT_FOUND');
    }

    const group = parseGroup(groupId, data);

    if (group.ownerId !== uid) {
      throw forbidden('Somente o proprietário pode alterar o limite.', 'NOT_GROUP_OWNER');
    }

    assertLimitCoversMembers(memberLimit, group.memberIds.length);

    const updatedAt = Date.now();
    transaction.update(groupRef(groupId), { memberLimit, updatedAt });

    return { ...group, memberLimit, updatedAt };
  });
}

export async function addMembers(uid: string, groupId: string, requested: unknown): Promise<GroupData> {
  const requestedIds = parseMemberIds(requested);

  if (requestedIds.length === 0) {
    throw badRequest('Selecione ao menos um integrante.');
  }

  await assertUsersExist(requestedIds);

  let previousIds: string[] = [];

  const updated = await firestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(groupRef(groupId));
    const data = snapshot.data();

    if (!data) {
      throw notFound('Grupo não encontrado.', 'GROUP_NOT_FOUND');
    }

    const group = parseGroup(groupId, data);

    if (group.ownerId !== uid) {
      throw forbidden('Somente o proprietário pode adicionar integrantes.', 'NOT_GROUP_OWNER');
    }

    const memberIds = computeMembersAfterAdd(group.memberIds, requestedIds, group.memberLimit);
    const updatedAt = Date.now();

    previousIds = group.memberIds;
    transaction.update(groupRef(groupId), { memberIds, updatedAt });

    return { ...group, memberIds, updatedAt };
  });

  const added = updated.memberIds.filter((id) => !previousIds.includes(id));

  await syncMembersMirror(groupId, updated.memberIds);

  if (added.length > 0) {
    await addUserLinks(groupId, added, updated.memberIds);
  }

  return updated;
}

export async function removeMember(uid: string, groupId: string, memberId: string): Promise<GroupData> {
  if (!isValidId(memberId)) {
    throw badRequest('Integrante inválido.');
  }

  const updated = await firestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(groupRef(groupId));
    const data = snapshot.data();

    if (!data) {
      throw notFound('Grupo não encontrado.', 'GROUP_NOT_FOUND');
    }

    const group = parseGroup(groupId, data);

    if (group.ownerId !== uid && memberId !== uid) {
      throw forbidden('Somente o proprietário pode remover integrantes.', 'NOT_GROUP_OWNER');
    }

    if (memberId === group.ownerId) {
      throw badRequest('O proprietário não pode ser removido do grupo.', 'OWNER_CANNOT_LEAVE');
    }

    if (!group.memberIds.includes(memberId)) {
      throw notFound('Usuário não é integrante do grupo.', 'NOT_A_MEMBER');
    }

    const memberIds = group.memberIds.filter((id) => id !== memberId);
    const updatedAt = Date.now();

    transaction.update(groupRef(groupId), { memberIds, updatedAt });

    return { ...group, memberIds, updatedAt };
  });

  await syncMembersMirror(groupId, updated.memberIds);
  await removeUserLinks(groupId, memberId, updated.memberIds);

  return updated;
}
