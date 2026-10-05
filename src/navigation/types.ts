import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ConversationType } from '../types/chat';

export type UsersScreenParams =
  | { mode: 'direct' }
  | {
      mode: 'selectMembers';
      /** Grupo em edição (ausente durante a criação). */
      groupId?: string;
      selectedIds: string[];
      /** Usuários que não podem ser selecionados (já são integrantes). */
      excludedIds: string[];
      /** Quantidade máxima que ainda pode ser selecionada (vagas). */
      maxSelectable: number | null;
    };

/** Definição central das rotas e parâmetros. */
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Conversations: undefined;
  Users: UsersScreenParams;
  GroupForm: { groupId?: string; selectedMemberIds?: string[] } | undefined;
  GroupMembers: { groupId: string };
  Chat: { conversationId: string; conversationType: ConversationType };
  Profile: { uid: string };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
