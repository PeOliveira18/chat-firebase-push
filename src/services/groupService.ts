import {
  collection,
  doc,
  onSnapshot,
  query,
  Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../config/firebase';
import { ChatGroup, CreateGroupInput, UpdateGroupDetailsInput } from '../types/group';
import { AppError } from '../utils/errorMessages';
import {
  validateGroupName,
  validateInitialMembers,
  validateMemberLimit,
} from '../utils/groupValidation';
import { parseGroup } from '../utils/parsers';
import { api } from './api';
import { uploadImage } from './storageService';

const GROUPS_COLLECTION = 'groups';

function ensureValid(message: string | null): void {
  if (message) {
    throw new AppError(message);
  }
}

export function generateGroupId(): string {
  return doc(collection(db, GROUPS_COLLECTION)).id;
}

export async function createGroup(input: CreateGroupInput): Promise<string> {
  ensureValid(validateGroupName(input.name));
  ensureValid(validateMemberLimit(input.memberLimit, input.memberIds.length + 1));
  ensureValid(validateInitialMembers(input.memberIds, input.memberLimit));

  const groupId = generateGroupId();
  const photoUrl = input.photoUri ? await uploadImage(input.photoUri, { type: 'group', groupId }) : '';

  await api.post('/groups', {
    groupId,
    name: input.name.trim(),
    photoUrl,
    memberIds: input.memberIds,
    memberLimit: input.memberLimit,
    notificationPolicy: input.notificationPolicy,
  });

  return groupId;
}

export async function updateGroupDetails(
  group: ChatGroup,
  input: UpdateGroupDetailsInput,
): Promise<void> {
  ensureValid(validateGroupName(input.name));

  const photoUrl = input.photoUri
    ? await uploadImage(input.photoUri, { type: 'group', groupId: group.id })
    : group.photoUrl;

  await updateDoc(doc(db, GROUPS_COLLECTION, group.id), {
    name: input.name.trim(),
    photoUrl,
    notificationPolicy: input.notificationPolicy,
    updatedAt: Date.now(),
  });
}

export async function updateMemberLimit(group: ChatGroup, memberLimit: number): Promise<void> {
  ensureValid(validateMemberLimit(memberLimit, group.memberIds.length));
  await api.patch(`/groups/${group.id}/limit`, { memberLimit });
}

export async function addMembers(groupId: string, memberIds: string[]): Promise<void> {
  if (memberIds.length === 0) {
    return;
  }

  await api.post(`/groups/${groupId}/members`, { memberIds });
}

export async function removeMember(groupId: string, memberId: string): Promise<void> {
  await api.delete(`/groups/${groupId}/members/${memberId}`);
}

export function observeMyGroups(
  uid: string,
  onNext: (groups: ChatGroup[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const groupsQuery = query(
    collection(db, GROUPS_COLLECTION),
    where('memberIds', 'array-contains', uid),
  );

  return onSnapshot(
    groupsQuery,
    (snapshot) => {
      onNext(snapshot.docs.map((document) => parseGroup(document.id, document.data())));
    },
    onError,
  );
}

export function observeGroup(
  groupId: string,
  onNext: (group: ChatGroup | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, GROUPS_COLLECTION, groupId),
    (snapshot) => {
      const data = snapshot.data();
      onNext(data ? parseGroup(snapshot.id, data) : null);
    },
    onError,
  );
}
