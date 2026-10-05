import { useMemo, useState } from 'react';

import { observePublicProfiles } from '../services/userService';
import { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/errorMessages';
import { useSubscription } from './useSubscription';

const NO_USERS: PublicProfile[] = [];
const ALL_USERS_KEY = 'publicProfiles';

function subscribeToAllUsers(
  _key: string,
  onNext: (profiles: PublicProfile[]) => void,
  onError: (error: Error) => void,
) {
  return observePublicProfiles(onNext, onError);
}

/**
 * Lista de usuários cadastrados com busca por nome.
 * O próprio usuário é removido da lista (não pode conversar consigo mesmo).
 */
export function useUsers(currentUid: string) {
  const [search, setSearch] = useState('');
  const { data: users, loading, error } = useSubscription(ALL_USERS_KEY, subscribeToAllUsers, NO_USERS);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');

    return users
      .filter((user) => user.uid !== currentUid)
      .filter((user) => !term || user.name.toLocaleLowerCase('pt-BR').includes(term));
  }, [users, search, currentUid]);

  return {
    users: filteredUsers,
    search,
    setSearch,
    loading,
    error: error ? getErrorMessage(error, 'Não foi possível carregar os usuários.') : null,
  };
}
