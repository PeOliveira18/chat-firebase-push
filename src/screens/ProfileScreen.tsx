import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { InfoRow } from '../components/InfoRow';
import { Loading } from '../components/Loading';
import { useCurrentUser } from '../hooks/useAuth';
import { RootStackScreenProps } from '../navigation/types';
import { getUserProfile } from '../services/userService';
import { theme } from '../theme';
import { ChatUser } from '../types/user';
import { getErrorMessage, isPermissionError } from '../utils/errorMessages';

type Props = RootStackScreenProps<'Profile'>;

type ProfileResult = {
  uid: string;
  profile: ChatUser | null;
  error: string | null;
};

/**
 * Dados cadastrais completos. As regras do Firestore só liberam a leitura
 * para o próprio usuário ou para quem compartilha uma conversa/grupo.
 */
export function ProfileScreen({ navigation, route }: Props) {
  const { uid } = route.params;
  const currentUser = useCurrentUser();
  const isMe = uid === currentUser.uid;

  const [result, setResult] = useState<ProfileResult | null>(null);

  // Busca os dados de outro usuário; o resultado fica associado ao uid consultado.
  useEffect(() => {
    if (isMe) {
      return undefined;
    }

    let active = true;

    getUserProfile(uid)
      .then((data) => {
        if (active) {
          setResult({ uid, profile: data, error: data ? null : 'Perfil não encontrado.' });
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setResult({
            uid,
            profile: null,
            error: isPermissionError(loadError)
              ? 'Você só pode ver o perfil de pessoas com quem compartilha uma conversa ou grupo.'
              : getErrorMessage(loadError, 'Não foi possível carregar o perfil.'),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [isMe, uid]);

  const currentResult = result?.uid === uid ? result : null;
  const loading = !isMe && !currentResult;
  const error = currentResult?.error ?? null;

  // O próprio perfil já está disponível no contexto de autenticação.
  const profile = isMe ? currentUser : (currentResult?.profile ?? null);

  useEffect(() => {
    navigation.setOptions({ title: isMe ? 'Meu perfil' : 'Perfil' });
  }, [navigation, isMe]);

  if (loading) {
    return <Loading message="Carregando perfil..." />;
  }

  if (!profile) {
    return <EmptyState title="Perfil indisponível" description={error ?? undefined} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar uri={profile.photoUrl} size={120} />
          <Text style={styles.name}>{profile.name || 'Nome não informado'}</Text>
        </View>

        <View style={styles.card}>
          <InfoRow label="E-mail" value={profile.email} />
          <InfoRow label="Celular" value={profile.phoneNumber} />
          <InfoRow label="Data de nascimento" value={profile.birthDate} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  name: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
