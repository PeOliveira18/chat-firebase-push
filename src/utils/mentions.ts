import { PublicProfile } from '../types/user';

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

export function getMentionQuery(text: string): string | null {
  const match = /@([^@\n]*)$/.exec(text);

  if (!match) {
    return null;
  }

  const query = match[1];

  return query.length <= 30 ? query : null;
}

export function insertMention(text: string, memberName: string): string {
  return text.replace(/@([^@\n]*)$/, `@${memberName} `);
}

export function mergeUniqueIds(...lists: string[][]): string[] {
  return Array.from(new Set(lists.flat()));
}
