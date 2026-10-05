import { ChatMessage } from './chat';
import { ChatGroup } from './group';
import { DeviceRegistration } from './notification';
import { ChatUser, PublicProfile } from './user';

/**
 * Formatos exatamente como são gravados no Firebase.
 */

// Firestore: users/{uid}
export type UserDocument = ChatUser;

// Firestore: publicProfiles/{uid}
export type PublicProfileDocument = PublicProfile;

// Firestore: groups/{groupId}
export type GroupDocument = Omit<ChatGroup, 'id'>;

// Firestore: directConversations/{uidA_uidB}
export type DirectConversationDocument = {
  participantIds: [string, string];
  createdAt: number;
};

// Firestore: users/{uid}/devices/{deviceId}
export type DeviceDocument = Omit<DeviceRegistration, 'deviceId'>;

// Realtime Database: messages/{conversationId}/{messageId}
// O RTDB não armazena arrays vazios, por isso mentionedUserIds é opcional na leitura.
export type MessageRecord = Omit<ChatMessage, 'id' | 'conversationId' | 'mentionedUserIds' | 'createdAt'> & {
  mentionedUserIds?: string[];
  createdAt: number | object;
};
