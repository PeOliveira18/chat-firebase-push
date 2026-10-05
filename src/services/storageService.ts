import { Platform } from 'react-native';

import { AppError } from '../utils/errorMessages';
import { asNumber, asString, isRecord } from '../utils/parsers';
import { api } from './api';

/**
 * Armazenamento das fotos de perfil e de grupo no Cloudinary (plano gratuito).
 *
 * 1. O app pede à API uma assinatura de upload (autenticada com o Firebase ID Token);
 * 2. envia a imagem direto ao Cloudinary com essa assinatura;
 * 3. salva no Firestore apenas a URL final (nunca a imagem em Base64).
 *
 * O segredo do Cloudinary fica somente nas variáveis da API hospedada.
 */
export type UploadTarget = { type: 'avatar' } | { type: 'group'; groupId: string };

type UploadSignature = {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  overwrite: string;
  allowedFormats: string;
};

function parseSignature(data: unknown): UploadSignature {
  if (!isRecord(data) || typeof data.uploadUrl !== 'string' || typeof data.signature !== 'string') {
    throw new AppError('Resposta inválida do servidor de imagens.');
  }

  return {
    uploadUrl: data.uploadUrl,
    apiKey: asString(data.apiKey),
    timestamp: asNumber(data.timestamp),
    signature: data.signature,
    folder: asString(data.folder),
    publicId: asString(data.publicId),
    overwrite: asString(data.overwrite, 'true'),
    allowedFormats: asString(data.allowedFormats),
  };
}

async function appendFile(form: FormData, uri: string): Promise<void> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    form.append('file', await response.blob());
    return;
  }

  // No React Native o FormData aceita a referência ao arquivo local.
  const file = { uri, name: 'photo.jpg', type: 'image/jpeg' };
  form.append('file', file as unknown as Blob);
}

export async function uploadImage(uri: string, target: UploadTarget): Promise<string> {
  const body = target.type === 'avatar' ? { target: 'avatar' } : { target: 'group', groupId: target.groupId };
  const { data } = await api.post<unknown>('/uploads/signature', body);
  const signature = parseSignature(data);

  const form = new FormData();
  await appendFile(form, uri);
  form.append('api_key', signature.apiKey);
  form.append('timestamp', String(signature.timestamp));
  form.append('signature', signature.signature);
  form.append('folder', signature.folder);
  form.append('public_id', signature.publicId);
  form.append('overwrite', signature.overwrite);
  form.append('allowed_formats', signature.allowedFormats);

  const response = await fetch(signature.uploadUrl, { method: 'POST', body: form });
  const result: unknown = await response.json();

  if (!response.ok || !isRecord(result) || typeof result.secure_url !== 'string') {
    throw new AppError('Não foi possível enviar a imagem.');
  }

  return result.secure_url;
}
