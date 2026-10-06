import { createHash } from 'node:crypto';

import { getCloudinaryEnv } from '../config/env.js';
import { forbidden, HttpError } from '../utils/httpError.js';
import { asString } from '../utils/parsers.js';
import { firestore } from './firebaseAdmin.js';

const ROOT_FOLDER = 'chat-firebase-push';
const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,heic';

export type UploadTarget = { type: 'avatar' } | { type: 'group'; groupId: string };

export type UploadSignature = {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  overwrite: string;
  allowedFormats: string;
};

export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return createHash('sha1').update(payload + apiSecret).digest('hex');
}

async function assertCanUploadGroupPhoto(uid: string, groupId: string): Promise<void> {
  const snapshot = await firestore().collection('groups').doc(groupId).get();

  if (snapshot.exists && asString(snapshot.get('ownerId')) !== uid) {
    throw forbidden('Somente o proprietário pode alterar a foto do grupo.', 'NOT_GROUP_OWNER');
  }
}

export async function createUploadSignature(uid: string, target: UploadTarget): Promise<UploadSignature> {
  const cloudinary = getCloudinaryEnv();

  if (!cloudinary) {
    throw new HttpError(503, 'UPLOAD_NOT_CONFIGURED', 'Armazenamento de imagens não configurado.');
  }

  if (target.type === 'group') {
    await assertCanUploadGroupPhoto(uid, target.groupId);
  }

  const folder = target.type === 'avatar' ? `${ROOT_FOLDER}/avatars` : `${ROOT_FOLDER}/groups`;
  const publicId = target.type === 'avatar' ? uid : target.groupId;
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    allowed_formats: ALLOWED_FORMATS,
    folder,
    overwrite: 'true',
    public_id: publicId,
    timestamp,
  };

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`,
    apiKey: cloudinary.apiKey,
    timestamp,
    signature: signParams(params, cloudinary.apiSecret),
    folder,
    publicId,
    overwrite: 'true',
    allowedFormats: ALLOWED_FORMATS,
  };
}
