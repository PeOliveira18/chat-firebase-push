import { NextFunction, Request, Response } from 'express';

import { HttpError } from '../utils/httpError.js';

/** Respostas de erro padronizadas, sem expor detalhes internos ou credenciais. */
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ code: error.code, message: error.message });
    return;
  }

  if (error instanceof SyntaxError) {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'JSON inválido.' });
    return;
  }

  console.error('[api] erro inesperado', error instanceof Error ? error.message : error);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno. Tente novamente.' });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ code: 'NOT_FOUND', message: 'Rota não encontrada.' });
}
