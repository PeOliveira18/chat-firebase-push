import { NotificationPolicy } from './notification';

export type ChatGroup = {
  id: string;
  name: string;
  photoUrl: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  createdAt: number;
  updatedAt: number;
};

export type CreateGroupInput = {
  name: string;
  photoUri: string | null;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
};

export type UpdateGroupDetailsInput = {
  name: string;
  photoUri: string | null;
  notificationPolicy: NotificationPolicy;
};
