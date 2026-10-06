import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';

import { db } from '../config/firebase';
import { PublicProfileDocument, UserDocument } from '../types/firebase';
import { ChatUser, PublicProfile } from '../types/user';
import { parseChatUser, parsePublicProfile } from '../utils/parsers';

const USERS_COLLECTION = 'users';
const PUBLIC_PROFILES_COLLECTION = 'publicProfiles';

export async function createUserProfile(user: ChatUser): Promise<void> {
  const batch = writeBatch(db);

  const userDocument: UserDocument = { ...user };
  const publicDocument: PublicProfileDocument = {
    uid: user.uid,
    name: user.name,
    photoUrl: user.photoUrl,
  };

  batch.set(doc(db, USERS_COLLECTION, user.uid), userDocument);
  batch.set(doc(db, PUBLIC_PROFILES_COLLECTION, user.uid), publicDocument);

  await batch.commit();
}

export function observeUserProfile(
  uid: string,
  onNext: (profile: ChatUser | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, USERS_COLLECTION, uid),
    (snapshot) => {
      const data = snapshot.data();
      onNext(data ? parseChatUser(snapshot.id, data) : null);
    },
    onError,
  );
}

export async function getUserProfile(uid: string): Promise<ChatUser | null> {
  const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid));
  const data = snapshot.data();

  return data ? parseChatUser(snapshot.id, data) : null;
}

export function observePublicProfiles(
  onNext: (profiles: PublicProfile[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const profilesQuery = query(collection(db, PUBLIC_PROFILES_COLLECTION), orderBy('name'));

  return onSnapshot(
    profilesQuery,
    (snapshot) => {
      onNext(snapshot.docs.map((document) => parsePublicProfile(document.id, document.data())));
    },
    onError,
  );
}

export async function getPublicProfile(uid: string): Promise<PublicProfile | null> {
  const snapshot = await getDoc(doc(db, PUBLIC_PROFILES_COLLECTION, uid));
  const data = snapshot.data();

  return data ? parsePublicProfile(snapshot.id, data) : null;
}

export async function getPublicProfiles(uids: string[]): Promise<PublicProfile[]> {
  const uniqueIds = Array.from(new Set(uids));
  const profiles = await Promise.all(uniqueIds.map((uid) => getPublicProfile(uid)));

  return profiles.filter((profile): profile is PublicProfile => profile !== null);
}
