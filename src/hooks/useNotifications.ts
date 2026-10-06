import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getInitialNotificationData,
  registerDevice,
  subscribeToNotificationTaps,
  subscribeToTokenRefresh,
} from '../services/notificationService';
import { NotificationData, PushRegistrationState } from '../types/notification';
import { getErrorMessage } from '../utils/errorMessages';

type UseNotificationsParams = {
  uid: string | null;
  navigationReadyKey: number;
  onOpenConversation: (data: NotificationData) => boolean;
};

type RegistrationEntry = {
  uid: string;
  state: PushRegistrationState;
};

const IDLE: PushRegistrationState = { status: 'idle' };
const REGISTERING: PushRegistrationState = { status: 'registering' };

function toErrorState(error: unknown): PushRegistrationState {
  return {
    status: 'error',
    message: getErrorMessage(error, 'Não foi possível registrar o dispositivo para notificações.'),
  };
}

export function useNotifications({ uid, navigationReadyKey, onOpenConversation }: UseNotificationsParams) {
  const [registration, setRegistration] = useState<RegistrationEntry | null>(null);

  const pendingRef = useRef<NotificationData | null>(null);
  const openRef = useRef(onOpenConversation);
  const uidRef = useRef(uid);

  useEffect(() => {
    openRef.current = onOpenConversation;
    uidRef.current = uid;
  }, [onOpenConversation, uid]);

  const flushPending = useCallback(() => {
    const pending = pendingRef.current;

    if (pending && uidRef.current && openRef.current(pending)) {
      pendingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!uid) {
      return undefined;
    }

    let active = true;

    registerDevice(uid)
      .then((state) => active && setRegistration({ uid, state }))
      .catch((error: unknown) => active && setRegistration({ uid, state: toErrorState(error) }));

    const subscription = subscribeToTokenRefresh(uid);

    return () => {
      active = false;
      subscription.remove();
    };
  }, [uid]);

  useEffect(() => {
    const initial = getInitialNotificationData();

    if (initial) {
      pendingRef.current = initial;
      flushPending();
    }

    const subscription = subscribeToNotificationTaps((data) => {
      pendingRef.current = data;
      flushPending();
    });

    return () => subscription.remove();
  }, [flushPending]);

  useEffect(() => {
    flushPending();
  }, [uid, navigationReadyKey, flushPending]);

  const retryRegistration = useCallback(async () => {
    if (!uid) {
      return;
    }

    setRegistration({ uid, state: REGISTERING });

    try {
      setRegistration({ uid, state: await registerDevice(uid) });
    } catch (error) {
      setRegistration({ uid, state: toErrorState(error) });
    }
  }, [uid]);

  let currentState: PushRegistrationState = IDLE;

  if (uid) {
    currentState = registration?.uid === uid ? registration.state : REGISTERING;
  }

  return { registration: currentState, retryRegistration };
}
