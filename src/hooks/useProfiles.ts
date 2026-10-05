import { useEffect, useMemo, useState } from 'react';

import { getPublicProfiles } from '../services/userService';
import { PublicProfile } from '../types/user';

/**
 * Carrega nome/foto (perfil público) de uma lista de usuários, mantendo um
 * cache local para não buscar novamente quem já foi carregado.
 */
export function usePublicProfiles(uids: string[]) {
  const [cache, setCache] = useState<Record<string, PublicProfile>>({});

  const missingKey = useMemo(
    () =>
      Array.from(new Set(uids))
        .filter((uid) => uid && !cache[uid])
        .sort()
        .join(','),
    [uids, cache],
  );

  useEffect(() => {
    if (!missingKey) {
      return undefined;
    }

    let active = true;

    getPublicProfiles(missingKey.split(','))
      .then((profiles) => {
        if (active && profiles.length > 0) {
          setCache((current) => {
            const next = { ...current };
            profiles.forEach((profile) => {
              next[profile.uid] = profile;
            });
            return next;
          });
        }
      })
      .catch(() => {
        // Perfis indisponíveis são exibidos com nome genérico.
      });

    return () => {
      active = false;
    };
  }, [missingKey]);

  const profiles = useMemo(
    () => uids.map((uid) => cache[uid]).filter((profile): profile is PublicProfile => Boolean(profile)),
    [uids, cache],
  );

  return { profiles, profilesById: cache };
}
