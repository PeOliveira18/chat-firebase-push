import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  Unsubscribe,
  User,
} from 'firebase/auth';

import { auth } from '../config/firebase';
import { ChatUser, LoginData, RegisterData } from '../types/user';
import { uploadImage } from './storageService';
import { createUserProfile } from './userService';

export type RegisterResult = {
  user: ChatUser;
  photoUploadFailed: boolean;
};

export async function register(data: RegisterData): Promise<RegisterResult> {
  const credential = await createUserWithEmailAndPassword(
    auth,
    data.email.trim(),
    data.password,
  );

  const { uid, email } = credential.user;
  let photoUrl = '';
  let photoUploadFailed = false;

  if (data.photoUri) {
    try {
      photoUrl = await uploadImage(data.photoUri, { type: 'avatar' });
    } catch {
      photoUploadFailed = true;
    }
  }

  const user: ChatUser = {
    uid,
    name: data.name.trim(),
    email: email ?? data.email.trim(),
    phoneNumber: data.phoneNumber,
    birthDate: data.birthDate,
    photoUrl,
    createdAt: Date.now(),
  };

  await createUserProfile(user);

  return { user, photoUploadFailed };
}

export async function login({ email, password }: LoginData): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function observeAuthState(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}
