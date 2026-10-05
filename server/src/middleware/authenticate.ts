import { NextFunction, Request, Response } from 'express';

import { adminAuth } from '../services/firebaseAdmin.js';
import { HttpError } from '../utils/httpError.js';

/**
 * Valida o Firebase ID Token enviado em "Authorization: Bearer <token>"
 * com o Firebase Admin SDK e disponibiliza o uid em res.locals.uid.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization') ?? '';
  const match = /^Bearer (.+)$/.exec(header);

  if (!match) {
    next(new HttpError(401, 'INVALID_TOKEN', 'Token de autenticação ausente.'));
    return;
  }

  try {
    // checkRevoked = true: sessões encerradas/revogadas não são aceitas.
    const decoded = await adminAuth().verifyIdToken(match[1], true);
    res.locals.uid = decoded.uid;
    next();
  } catch {
    next(new HttpError(401, 'INVALID_TOKEN', 'Token de autenticação inválido ou expirado.'));
  }
}

/** Lê o uid autenticado definido pelo middleware. */
export function getAuthenticatedUid(res: Response): string {
  const uid: unknown = res.locals.uid;

  if (typeof uid !== 'string' || !uid) {
    throw new HttpError(401, 'INVALID_TOKEN', 'Usuário não autenticado.');
  }

  return uid;
}
