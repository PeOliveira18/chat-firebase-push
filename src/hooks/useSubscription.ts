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
