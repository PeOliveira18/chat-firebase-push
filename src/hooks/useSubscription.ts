import { useEffect, useState } from 'react';

type Unsubscribe = () => void;

export type SubscribeFn<T> = (
  key: string,
  onNext: (data: T) => void,
  onError: (error: Error) => void,
) => Unsubscribe;

type SubscriptionState<T> = {
  key: string | null;
  data: T;
  loaded: boolean;
  error: Error | null;
};

/**
 * Hook genérico para listeners em tempo real do Firebase (Firestore/RTDB).
 *
 * - Abre o listener quando `key` existe e o remove no cleanup (desmontagem,
 *   troca de conversa ou logout).
 * - O estado é associado à chave: ao trocar de chave, dados antigos não são
 *   exibidos (sem precisar "resetar" estado dentro do efeito).
 *
 * `subscribe` e `initialData` devem ser estáveis (funções de service e constantes).
 */
export function useSubscription<T>(key: string | null, subscribe: SubscribeFn<T>, initialData: T) {
  const [state, setState] = useState<SubscriptionState<T>>({
    key: null,
    data: initialData,
    loaded: false,
    error: null,
  });

  useEffect(() => {
    if (!key) {
      return undefined;
    }

    return subscribe(
      key,
      (data) => setState({ key, data, loaded: true, error: null }),
      (error) => setState({ key, data: initialData, loaded: true, error }),
    );
  }, [key, subscribe, initialData]);

  const isCurrent = key !== null && state.key === key;

  return {
    data: isCurrent ? state.data : initialData,
    loading: key !== null && !(isCurrent && state.loaded),
    error: isCurrent ? state.error : null,
  };
}
