/** Erro com status HTTP e código estável (o app traduz o código para o usuário). */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message: string, code = 'VALIDATION_ERROR') => new HttpError(400, code, message);
export const forbidden = (message: string, code = 'FORBIDDEN') => new HttpError(403, code, message);
export const notFound = (message: string, code = 'NOT_FOUND') => new HttpError(404, code, message);
export const conflict = (message: string, code = 'CONFLICT') => new HttpError(409, code, message);
