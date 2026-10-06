import { ChatMessage } from './chat';
import { ChatGroup } from './group';
import { DeviceRegistration } from './notification';
import { ChatUser, PublicProfile } from './user';

export type UserDocument = ChatUser;

export type PublicProfileDocument = PublicProfile;

export type GroupDocument = Omit<ChatGroup, 'id'>;

export type DirectConversationDocument = {
  participantIds: [string, string];
  createdAt: number;
};

export type DeviceDocument = Omit<DeviceRegistration, 'deviceId'>;

export type MessageRecord = Omit<ChatMessage, 'id' | 'conversationId' | 'mentionedUserIds' | 'createdAt'> & {
  mentionedUserIds?: string[];
  createdAt: number | object;
};
