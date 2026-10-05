import { PublicProfile } from '../types/user';

/**
 * Retorna os `uid` dos integrantes mencionados no texto com "@Nome".
 * A comparação ignora maiúsculas/minúsculas e o próprio remetente.
 */
export function extractMentionedUserIds(
  text: string,
  members: PublicProfile[],
  senderId: string,
): string[] {
  const normalizedText = text.toLocaleLowerCase('pt-BR');

  return members
    .filter((member) => member.uid !== senderId && member.name.trim().length > 0)
    .filter((member) => normalizedText.includes(`@${member.name.trim().toLocaleLowerCase('pt-BR')}`))
    .map((member) => member.uid);
}

/** Retorna o termo digitado após o último "@", se o usuário estiver mencionando alguém. */
export function getMentionQuery(text: string): string | null {
  const match = /@([^@\n]*)$/.exec(text);

  if (!match) {
    return null;
  }

  const query = match[1];

  // Encerra a sugestão quando o termo fica longo demais (provavelmente texto normal).
  return query.length <= 30 ? query : null;
}

export function insertMention(text: string, memberName: string): string {
  return text.replace(/@([^@\n]*)$/, `@${memberName} `);
}

export function mergeUniqueIds(...lists: string[][]): string[] {
  return Array.from(new Set(lists.flat()));
}
