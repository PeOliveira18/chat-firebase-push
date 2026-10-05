import { ConversationType } from './chat';

export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export const NOTIFICATION_POLICIES: readonly NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];

export type NotificationSettings = {
  conversationId: string;
  policy: NotificationPolicy;
  updatedBy: string;
  updatedAt: number;
};

export type DevicePlatform = 'android' | 'ios' | 'web';

export type DeviceRegistration = {
  deviceId: string;
  token: string;
  platform: DevicePlatform;
  enabled: boolean;
  updatedAt: number;
};

/** Dados enviados no payload do push pela API. */
export type NotificationData = {
  conversationId: string;
  conversationType: ConversationType;
};

export type PushRegistrationState =
  | { status: 'idle' }
  | { status: 'registering' }
  | { status: 'registered'; token: string }
  | { status: 'denied' }
  | { status: 'unavailable'; reason: string }
  | { status: 'error'; message: string };

export type PushRequestResult = {
  status: 'sent' | 'duplicate' | 'skipped';
  recipients: number;
};
