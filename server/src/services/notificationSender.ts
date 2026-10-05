import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { DocumentReference } from 'firebase-admin/firestore';

import { EXPO_ACCESS_TOKEN } from '../config/env.js';
import { asString } from '../utils/parsers.js';
import { firestore } from './firebaseAdmin.js';

/**
 * Envio pelo Expo Push Service. No Android a entrega é feita pelo
 * Firebase Cloud Messaging (credencial FCM V1 configurada no EAS) e,
 * no iOS, pelo APNs.
 */
const expo = new Expo({ accessToken: EXPO_ACCESS_TOKEN });

const RECEIPT_CHECK_DELAY_MS = 15000;

export type PushContent = {
  uid: string;
  title: string;
  body: string;
};

export type PushData = {
  conversationId: string;
  conversationType: 'direct' | 'group';
  messageId: string;
};

export type SendResult = {
  devices: number;
  sent: number;
  failed: number;
  disabledTokens: number;
};

type DeviceTarget = {
  ref: DocumentReference;
  token: string;
};

async function disableDevice(ref: DocumentReference, reason: string): Promise<void> {
  await ref.update({ enabled: false, disabledReason: reason, updatedAt: Date.now() }).catch(() => undefined);
}

async function loadEnabledDevices(uid: string): Promise<DeviceTarget[]> {
  const snapshot = await firestore()
    .collection('users')
    .doc(uid)
    .collection('devices')
    .where('enabled', '==', true)
    .get();

  const devices: DeviceTarget[] = [];

  for (const document of snapshot.docs) {
    const token = asString(document.get('token'));

    if (Expo.isExpoPushToken(token)) {
      devices.push({ ref: document.ref, token });
    } else {
      // Token inválido: desativado para não ser usado novamente.
      await disableDevice(document.ref, 'InvalidToken');
    }
  }

  return devices;
}

function isDeviceNotRegistered(ticket: ExpoPushTicket): boolean {
  return ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered';
}

/** Os recibos confirmam a entrega; tokens não registrados são desativados. */
function scheduleReceiptCheck(receipts: Map<string, DocumentReference>): void {
  if (receipts.size === 0) {
    return;
  }

  const timer = setTimeout(async () => {
    try {
      for (const chunk of expo.chunkPushNotificationReceiptIds(Array.from(receipts.keys()))) {
        const results = await expo.getPushNotificationReceiptsAsync(chunk);

        for (const [receiptId, receipt] of Object.entries(results)) {
          const ref = receipts.get(receiptId);

          if (ref && receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
            await disableDevice(ref, 'DeviceNotRegistered');
          }
        }
      }
    } catch (error) {
      console.error('[push] falha ao consultar recibos', error instanceof Error ? error.message : error);
    }
  }, RECEIPT_CHECK_DELAY_MS);

  timer.unref();
}

export async function sendPush(contents: PushContent[], data: PushData): Promise<SendResult> {
  const messages: ExpoPushMessage[] = [];
  const targets: DeviceTarget[] = [];

  for (const content of contents) {
    const devices = await loadEnabledDevices(content.uid);

    for (const device of devices) {
      messages.push({
        to: device.token,
        title: content.title,
        body: content.body,
        data,
        sound: 'default',
        priority: 'high',
        channelId: 'messages',
      });
      targets.push(device);
    }
  }

  const result: SendResult = { devices: targets.length, sent: 0, failed: 0, disabledTokens: 0 };
  const receipts = new Map<string, DocumentReference>();
  let offset = 0;

  for (const chunk of expo.chunkPushNotifications(messages)) {
    const tickets = await expo.sendPushNotificationsAsync(chunk);

    for (const [index, ticket] of tickets.entries()) {
      const target = targets[offset + index];

      if (ticket.status === 'ok') {
        result.sent += 1;
        receipts.set(ticket.id, target.ref);
      } else {
        result.failed += 1;

        if (isDeviceNotRegistered(ticket)) {
          result.disabledTokens += 1;
          await disableDevice(target.ref, 'DeviceNotRegistered');
        }
      }
    }

    offset += chunk.length;
  }

  scheduleReceiptCheck(receipts);

  return result;
}
