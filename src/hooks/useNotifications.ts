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
  /** Usuário autenticado (null = sem sessão, nada é registrado). */
  uid: string | null;
  /** Muda sempre que o NavigationContainer fica pronto. */
  navigationReadyKey: number;
  /** Abre a conversa; retorna false se a navegação ainda não puder ser feita. */
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

/**
 * Registra o dispositivo para push, mantém o token atualizado e abre a
 * conversa correta quando o usuário toca em uma notificação
 * (inclusive com o app fechado ou em segundo plano).
 */
export function useNotifications({ uid, navigationReadyKey, onOpenConversation }: UseNotificationsParams) {
  const [registration, setRegistration] = useState<RegistrationEntry | null>(null);

  // Conversa aguardando navegação (login concluído + navegação pronta).
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

  // Registro ao fazer login + atualização automática do token.
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

  // Toque na notificação: app iniciado pela notificação, em segundo plano ou aberto.
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

  // Tenta novamente quando o usuário loga ou a navegação fica pronta.
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
    // Enquanto não há resultado para este usuário, o registro está em andamento.
    currentState = registration?.uid === uid ? registration.state : REGISTERING;
  }

  return { registration: currentState, retryRegistration };
}
