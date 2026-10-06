import { ChatGroup } from '../types/group';

export const MIN_GROUP_MEMBERS = 2;
export const MAX_MEMBER_LIMIT = 50;
export const MAX_GROUP_NAME_LENGTH = 60;

export function parseMemberLimit(text: string): number | null {
  const trimmed = text.trim();

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  return Number.parseInt(trimmed, 10);
}

export function validateMemberLimit(limit: number | null, currentMembers: number): string | null {
  if (limit === null || !Number.isInteger(limit)) {
    return 'Informe um número inteiro válido para o limite.';
  }

  if (limit < MIN_GROUP_MEMBERS) {
    return `O limite mínimo é de ${MIN_GROUP_MEMBERS} integrantes.`;
  }

  if (limit > MAX_MEMBER_LIMIT) {
    return `O limite máximo permitido é de ${MAX_MEMBER_LIMIT} integrantes.`;
  }

  if (limit < currentMembers) {
    return `O limite não pode ser menor que a quantidade atual de integrantes (${currentMembers}).`;
  }

  return null;
}

export function validateGroupName(name: string): string | null {
  const trimmed = name.trim();

  if (!trimmed) {
    return 'Informe o nome do grupo.';
  }

  if (trimmed.length > MAX_GROUP_NAME_LENGTH) {
    return `O nome deve ter no máximo ${MAX_GROUP_NAME_LENGTH} caracteres.`;
  }

  return null;
}

export function validateInitialMembers(selectedIds: string[], memberLimit: number | null): string | null {
  const total = selectedIds.length + 1;

  if (total < MIN_GROUP_MEMBERS) {
    return 'Selecione pelo menos um integrante além de você.';
  }

  if (memberLimit !== null && total > memberLimit) {
    return `A seleção (${total} integrantes, incluindo você) ultrapassa o limite de ${memberLimit}.`;
  }

  return null;
}

export function getAvailableSlots(group: Pick<ChatGroup, 'memberIds' | 'memberLimit'>): number {
  return Math.max(group.memberLimit - group.memberIds.length, 0);
}

export function isGroupFull(group: Pick<ChatGroup, 'memberIds' | 'memberLimit'>): boolean {
  return getAvailableSlots(group) === 0;
}

export function formatCapacity(memberCount: number, memberLimit: number): string {
  const available = Math.max(memberLimit - memberCount, 0);
  const slotsLabel = available === 1 ? 'vaga disponível' : 'vagas disponíveis';

  return `${memberCount} de ${memberLimit} integrantes · ${available} ${slotsLabel}`;
}
