import { badRequest, conflict } from '../utils/httpError.js';

export const MIN_GROUP_MEMBERS = 2;
export const MAX_MEMBER_LIMIT = 50;
export const MAX_GROUP_NAME_LENGTH = 60;

export function assertValidLimit(limit: unknown): asserts limit is number {
  if (typeof limit !== 'number' || !Number.isInteger(limit)) {
    throw badRequest('O limite deve ser um número inteiro.', 'INVALID_LIMIT');
  }

  if (limit < MIN_GROUP_MEMBERS || limit > MAX_MEMBER_LIMIT) {
    throw badRequest(
      `O limite deve estar entre ${MIN_GROUP_MEMBERS} e ${MAX_MEMBER_LIMIT}.`,
      'INVALID_LIMIT',
    );
  }
}

export function assertLimitCoversMembers(limit: number, memberCount: number): void {
  if (limit < memberCount) {
    throw conflict(
      `O limite não pode ser menor que a quantidade atual de integrantes (${memberCount}).`,
      'LIMIT_BELOW_MEMBERS',
    );
  }
}

export function computeMembersAfterAdd(currentIds: string[], requestedIds: string[], limit: number): string[] {
  const current = new Set(currentIds);
  const toAdd = Array.from(new Set(requestedIds)).filter((id) => !current.has(id));

  if (toAdd.length === 0) {
    return currentIds;
  }

  if (currentIds.length + toAdd.length > limit) {
    const available = Math.max(limit - currentIds.length, 0);
    throw conflict(`O grupo possui apenas ${available} vaga(s) disponível(is).`, 'GROUP_FULL');
  }

  return [...currentIds, ...toAdd];
}

export function assertValidGroupName(name: unknown): asserts name is string {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > MAX_GROUP_NAME_LENGTH) {
    throw badRequest(`O nome do grupo deve ter entre 1 e ${MAX_GROUP_NAME_LENGTH} caracteres.`);
  }
}
