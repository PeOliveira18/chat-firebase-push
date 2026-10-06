import { isAxiosError } from 'axios';
import { FirebaseError } from 'firebase/app';

import { isRecord } from './parsers';

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha inválidos.',
  'auth/wrong-password': 'E-mail ou senha inválidos.',
  'auth/user-not-found': 'E-mail ou senha inválidos.',
  'auth/invalid-email': 'O e-mail informado é inválido.',
  'auth/email-already-in-use': 'Já existe uma conta com este e-mail.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
  'auth/user-token-expired': 'Sua sessão expirou. Faça login novamente.',
  'auth/requires-recent-login': 'Sua sessão expirou. Faça login novamente.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'permission-denied': 'Você não tem permissão para realizar esta ação.',
  unavailable: 'Serviço indisponível. Verifique sua conexão.',
  'deadline-exceeded': 'A operação demorou demais. Tente novamente.',
  'not-found': 'O registro solicitado não foi encontrado.',
  unauthenticated: 'Sua sessão expirou. Faça login novamente.',
};

const API_MESSAGES: Record<string, string> = {
  GROUP_FULL: 'O grupo atingiu o limite de integrantes.',
  LIMIT_BELOW_MEMBERS: 'O limite não pode ser menor que a quantidade atual de integrantes.',
  INVALID_LIMIT: 'Limite de integrantes inválido.',
  NOT_GROUP_OWNER: 'Somente o proprietário pode realizar esta ação.',
  NOT_A_MEMBER: 'Você não participa desta conversa.',
  GROUP_NOT_FOUND: 'Grupo não encontrado.',
  USER_NOT_FOUND: 'Um dos usuários selecionados não existe.',
  MESSAGE_NOT_FOUND: 'Mensagem não encontrada.',
  INVALID_TOKEN: 'Sua sessão expirou. Faça login novamente.',
  VALIDATION_ERROR: 'Dados inválidos.',
  RATE_LIMITED: 'Muitas requisições. Aguarde um instante.',
  UPLOAD_NOT_CONFIGURED: 'O envio de fotos ainda não está configurado.',
};

function getApiErrorCode(data: unknown): string | null {
  if (isRecord(data) && typeof data.code === 'string') {
    return data.code;
  }

  return null;
}

export function getErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof FirebaseError) {
    return FIREBASE_MESSAGES[error.code] ?? fallback;
  }

  if (isAxiosError(error)) {
    if (!error.response) {
      return 'Não foi possível conectar ao servidor. Verifique sua internet.';
    }

    const code = getApiErrorCode(error.response.data);

    if (code && API_MESSAGES[code]) {
      return API_MESSAGES[code];
    }

    if (error.response.status === 401) {
      return 'Sua sessão expirou. Faça login novamente.';
    }

    if (error.response.status === 403) {
      return 'Você não tem permissão para realizar esta ação.';
    }

    return fallback;
  }

  if (error instanceof Error && error.message.includes('PERMISSION_DENIED')) {
    return 'Você não tem permissão para acessar esta conversa.';
  }

  return fallback;
}

export function isPermissionError(error: unknown): boolean {
  if (error instanceof FirebaseError) {
    return error.code === 'permission-denied';
  }

  return error instanceof Error && error.message.includes('PERMISSION_DENIED');
}
