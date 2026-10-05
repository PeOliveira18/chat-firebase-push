import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';

import { useSubscription } from '../hooks/useSubscription';
import {
  login,
  logout,
  observeAuthState,
  register,
  RegisterResult,
} from '../services/authService';
import { disableCurrentDevice } from '../services/notificationService';
import { observeUserProfile } from '../services/userService';
import { ChatUser, LoginData, RegisterData } from '../types/user';
import { getErrorMessage } from '../utils/errorMessages';

export type ProfileStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'error';

export type AuthContextData = {
  firebaseUser: User | null;
  user: ChatUser | null;
  initializing: boolean;
  profileStatus: ProfileStatus;
  profileError: string | null;
  isRegistering: boolean;
  signIn: (data: LoginData) => Promise<void>;
  signUp: (data: RegisterData) => Promise<RegisterResult>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextData | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  // Recupera a sessão persistida e observa login/logout.
  useEffect(() => {
    const unsubscribe = observeAuthState((currentUser) => {
      setFirebaseUser(currentUser);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  // Escuta o perfil do usuário autenticado no Firestore (removido no logout).
  const profile = useSubscription<ChatUser | null>(firebaseUser?.uid ?? null, observeUserProfile, null);
  const user = firebaseUser ? profile.data : null;

  let profileStatus: ProfileStatus = 'idle';

  if (firebaseUser) {
    if (profile.loading) {
      profileStatus = 'loading';
    } else if (profile.error) {
      profileStatus = 'error';
    } else {
      profileStatus = profile.data ? 'ready' : 'missing';
    }
  }

  const profileError = profile.error ? getErrorMessage(profile.error, 'Não foi possível carregar seu perfil.') : null;

  const signIn = useCallback(async (data: LoginData) => {
    await login(data);
  }, []);

  const signUp = useCallback(async (data: RegisterData) => {
    setIsRegistering(true);

    try {
      return await register(data);
    } finally {
      setIsRegistering(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (firebaseUser) {
      // Para de receber push neste aparelho antes de encerrar a sessão.
      await disableCurrentDevice(firebaseUser.uid);
    }

    // Ao encerrar a sessão, o navegador desmonta as telas protegidas e
    // todos os listeners (Firestore e RTDB) são removidos nos cleanups.
    await logout();
  }, [firebaseUser]);

  const value = useMemo<AuthContextData>(
    () => ({
      firebaseUser,
      user,
      initializing,
      profileStatus,
      profileError,
      isRegistering,
      signIn,
      signUp,
      signOut,
    }),
    [firebaseUser, user, initializing, profileStatus, profileError, isRegistering, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
