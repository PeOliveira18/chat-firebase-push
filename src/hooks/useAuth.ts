import { useContext } from 'react';

import { AuthContext, AuthContextData } from '../contexts/AuthContext';
import { ChatUser } from '../types/user';

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  }

  return context;
}

export function useCurrentUser(): ChatUser {
  const { user } = useAuth();

  if (!user) {
    throw new Error('useCurrentUser deve ser utilizado apenas em telas autenticadas.');
  }

  return user;
}
