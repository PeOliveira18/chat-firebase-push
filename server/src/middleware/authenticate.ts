import { NextFunction, Request, Response } from 'express';

import { adminAuth } from '../services/firebaseAdmin.js';
import { HttpError } from '../utils/httpError.js';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization') ?? '';
  const match = /^Bearer (.+)$/.exec(header);

  if (!match) {
    next(new HttpError(401, 'INVALID_TOKEN', 'Token de autenticação ausente.'));
    return;
  }

  try {
    const decoded = await adminAuth().verifyIdToken(match[1], true);
    res.locals.uid = decoded.uid;
    next();
  } catch (error) {
    const code = getErrorCode(error);

    console.error('[auth] token recusado', code ?? 'sem código', error instanceof Error ? error.message : error);

    if (code && TOKEN_ERROR_CODES.has(code)) {
      next(new HttpError(401, 'INVALID_TOKEN', 'Token de autenticação inválido ou expirado.'));
      return;
    }

    next(new HttpError(503, 'AUTH_UNAVAILABLE', 'Não foi possível validar a sessão no servidor.'));
  }
}

const TOKEN_ERROR_CODES = new Set([
  'auth/argument-error',
  'auth/invalid-id-token',
  'auth/id-token-expired',
  'auth/id-token-revoked',
  'auth/user-disabled',
  'auth/user-not-found',
]);

function getErrorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }

  return null;
}

export function getAuthenticatedUid(res: Response): string {
  const uid: unknown = res.locals.uid;

  if (typeof uid !== 'string' || !uid) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Usuário não autenticado.');
  }

  return uid;
}
