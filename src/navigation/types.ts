import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ConversationType } from '../types/chat';

export type UsersScreenParams =
  | { mode: 'direct' }
  | {
      mode: 'selectMembers';
      groupId?: string;
      selectedIds: string[];
      excludedIds: string[];
      maxSelectable: number | null;
    };

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
