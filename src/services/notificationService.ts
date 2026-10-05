import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
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

/**
 * Responsabilidades do app em relação ao push:
 * - solicitar permissão;
 * - registrar/atualizar o token do dispositivo no Firestore;
 * - tratar recebimento e toque nas notificações;
 * - pedir à API online que envie o push de uma mensagem.
 *
 * O envio efetivo do push acontece SOMENTE na API (nunca no app).
 */

/** Push só existe em Android/iOS; na web as funções abaixo não fazem nada. */
const PUSH_SUPPORTED = Platform.OS === 'android' || Platform.OS === 'ios';

export function configureNotificationHandler(): void {
  if (!PUSH_SUPPORTED) {
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
  if (Platform.OS !== 'android') {
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

/** ID estável deste aparelho (um usuário pode ter vários dispositivos). */
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

/**
 * Solicita permissão, obtém o token e o grava em users/{uid}/devices/{deviceId}.
 */
export async function registerDevice(uid: string): Promise<PushRegistrationState> {
  if (!PUSH_SUPPORTED) {
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

/** Atualiza o token salvo quando o sistema o renova. */
export function subscribeToTokenRefresh(uid: string): Notifications.EventSubscription {
  if (!PUSH_SUPPORTED) {
    return { remove: () => undefined };
  }

  return Notifications.addPushTokenListener(() => {
    registerDevice(uid).catch(() => {
      // Falha silenciosa: o próximo login tentará registrar novamente.
    });
  });
}

/** Desativa o token deste aparelho (logout): o usuário deixa de receber push aqui. */
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
  } catch {
    // Documento pode não existir (permissão negada ou nunca registrado).
  }
}

function isConversationType(value: unknown): value is ConversationType {
  return value === 'direct' || value === 'group';
}

/** Tocar em uma notificação: só existe em Android/iOS. */
export function getInitialNotificationData(): NotificationData | null {
  if (!PUSH_SUPPORTED) {
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
): Notifications.EventSubscription {
  if (!PUSH_SUPPORTED) {
    return { remove: () => undefined };
  }

  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = parseNotificationData(response.notification.request.content.data);

    if (data) {
      onTap(data);
    }
  });
}

/** Lê com segurança o payload { conversationId, conversationType } do push. */
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

/**
 * Pede à API que calcule os destinatários e envie o push da mensagem.
 * A API não recebe destinatários: ela os calcula no servidor.
 */
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
