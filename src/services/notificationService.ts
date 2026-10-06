import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

import { db } from '../config/firebase';
import { ConversationType } from '../types/chat';
import { DeviceDocument } from '../types/firebase';
import {
  DevicePlatform,
  NotificationData,
  PushRegistrationState,
  PushRequestResult,
} from '../types/notification';
import { asNumber, asString, isRecord } from '../utils/parsers';
import { api } from './api';

const DEVICE_ID_KEY = '@chat-firebase-push:deviceId';
export const ANDROID_CHANNEL_ID = 'messages';

type NotificationsModule = typeof import('expo-notifications');

type Subscription = { remove: () => void };

const NO_SUBSCRIPTION: Subscription = { remove: () => undefined };

const IS_EXPO_GO_ANDROID =
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const PUSH_SUPPORTED = (Platform.OS === 'android' || Platform.OS === 'ios') && !IS_EXPO_GO_ANDROID;

const Notifications: NotificationsModule | null = PUSH_SUPPORTED
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('expo-notifications')
  : null;

export function configureNotificationHandler(): void {
  if (!Notifications) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android' || !Notifications) {
    return;
  }

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Mensagens',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563EB',
  });
}

function getPlatform(): DevicePlatform {
  if (Platform.OS === 'ios') {
    return 'ios';
  }

  return Platform.OS === 'android' ? 'android' : 'web';
}

function getProjectId(): string | null {
  const fromExtra: unknown = Constants.expoConfig?.extra?.eas;
  const extraProjectId = isRecord(fromExtra) ? asString(fromExtra.projectId) : '';
  const easProjectId = Constants.easConfig?.projectId ?? '';

  return extraProjectId || easProjectId || null;
}

export async function getDeviceId(): Promise<string> {
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);

  if (stored) {
    return stored;
  }

  const generated = `${getPlatform()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);

  return generated;
}

async function saveDeviceToken(uid: string, token: string): Promise<void> {
  const deviceId = await getDeviceId();
  const document: DeviceDocument = {
    token,
    platform: getPlatform(),
    enabled: true,
    updatedAt: Date.now(),
  };

  await setDoc(doc(db, 'users', uid, 'devices', deviceId), document);
}

export async function registerDevice(uid: string): Promise<PushRegistrationState> {
  if (IS_EXPO_GO_ANDROID) {
    return {
      status: 'unavailable',
      reason: 'O Expo Go no Android não recebe notificações push. Instale o APK para testar o push.',
    };
  }

  if (!Notifications) {
    return { status: 'unavailable', reason: 'Notificações push estão disponíveis apenas no Android e iOS.' };
  }

  if (!Device.isDevice) {
    return {
      status: 'unavailable',
      reason: 'Notificações push exigem um dispositivo físico.',
    };
  }

  await ensureAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;

  if (!granted && current.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }

  if (!granted) {
    return { status: 'denied' };
  }

  const projectId = getProjectId();

  if (!projectId) {
    return {
      status: 'unavailable',
      reason: 'Projeto EAS não configurado (projectId ausente).',
    };
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  if (!token) {
    return { status: 'unavailable', reason: 'Dispositivo sem token disponível.' };
  }

  await saveDeviceToken(uid, token);

  return { status: 'registered', token };
}

export function subscribeToTokenRefresh(uid: string): Subscription {
  if (!Notifications) {
    return NO_SUBSCRIPTION;
  }

  return Notifications.addPushTokenListener(() => {
    registerDevice(uid).catch(() => {});
  });
}

export async function disableCurrentDevice(uid: string): Promise<void> {
  const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    return;
  }

  try {
    await updateDoc(doc(db, 'users', uid, 'devices', deviceId), {
      enabled: false,
      updatedAt: Date.now(),
    });
  } catch {}
}

function isConversationType(value: unknown): value is ConversationType {
  return value === 'direct' || value === 'group';
}

export function getInitialNotificationData(): NotificationData | null {
  if (!Notifications) {
    return null;
  }

  const response = Notifications.getLastNotificationResponse();

  if (!response) {
    return null;
  }

  Notifications.clearLastNotificationResponse();
  return parseNotificationData(response.notification.request.content.data);
}

export function subscribeToNotificationTaps(
  onTap: (data: NotificationData) => void,
): Subscription {
  if (!Notifications) {
    return NO_SUBSCRIPTION;
  }

  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = parseNotificationData(response.notification.request.content.data);

    if (data) {
      onTap(data);
    }
  });
}

export function parseNotificationData(data: unknown): NotificationData | null {
  if (!isRecord(data)) {
    return null;
  }

  const conversationId = asString(data.conversationId);

  if (!conversationId || !isConversationType(data.conversationType)) {
    return null;
  }

  return { conversationId, conversationType: data.conversationType };
}

export async function requestMessagePush(
  conversationId: string,
  messageId: string,
): Promise<PushRequestResult> {
  const response = await api.post<unknown>('/notifications/messages', {
    conversationId,
    messageId,
  });

  const body = response.data;
  const status = isRecord(body) ? body.status : undefined;

  return {
    status: status === 'duplicate' || status === 'skipped' ? status : 'sent',
    recipients: isRecord(body) ? asNumber(body.recipients) : 0,
  };
}
