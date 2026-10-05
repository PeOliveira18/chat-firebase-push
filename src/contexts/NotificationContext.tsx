import { createContext, ReactNode, useContext } from 'react';

import { useNotifications } from '../hooks/useNotifications';
import { NotificationData, PushRegistrationState } from '../types/notification';

type NotificationContextData = {
  registration: PushRegistrationState;
  retryRegistration: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextData | null>(null);

type NotificationProviderProps = {
  uid: string | null;
  navigationReadyKey: number;
  onOpenConversation: (data: NotificationData) => boolean;
  children: ReactNode;
};

export function NotificationProvider({
  uid,
  navigationReadyKey,
  onOpenConversation,
  children,
}: NotificationProviderProps) {
  const value = useNotifications({ uid, navigationReadyKey, onOpenConversation });

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationStatus(): NotificationContextData {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotificationStatus deve ser utilizado dentro de NotificationProvider.');
  }

  return context;
}
