import { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { ConversationItem } from '../components/ConversationItem';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { useNotificationStatus } from '../contexts/NotificationContext';
import { useAuth, useCurrentUser } from '../hooks/useAuth';
import { useConversations } from '../hooks/useConversations';
import { RootStackScreenProps } from '../navigation/types';
import { theme } from '../theme';
import { ConversationSummary } from '../types/chat';
import { PushRegistrationState } from '../types/notification';
import { confirmAction, showAlert } from '../utils/dialogs';

type Props = RootStackScreenProps<'Conversations'>;

function getPushWarning(registration: PushRegistrationState): string | null {
  switch (registration.status) {
    case 'denied':
      return 'Permissão de notificações negada. Ative nas configurações para receber avisos de novas mensagens.';
    case 'unavailable':
      return registration.reason;
    case 'error':
      return registration.message;
    default:
      return null;
  }
}

export function ConversationsScreen({ navigation }: Props) {
  const user = useCurrentUser();
  const { signOut } = useAuth();
  const { registration, retryRegistration } = useNotificationStatus();
  const { conversations, loading, error } = useConversations(user.uid);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = useCallback(() => {
    confirmAction('Sair', 'Deseja encerrar a sessão?', 'Sair', async () => {
      setSigningOut(true);

      try {
        await signOut();
      } catch {
        setSigningOut(false);
        showAlert('Erro', 'Não foi possível sair. Tente novamente.');
      }
    });
  }, [signOut]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleSignOut} disabled={signingOut} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.headerAction}>{signingOut ? 'Saindo...' : 'Sair'}</Text>
        </Pressable>
      ),
    });
  }, [navigation, handleSignOut, signingOut]);

  const handleOpen = useCallback(
    (conversation: ConversationSummary) => {
      navigation.navigate('Chat', {
        conversationId: conversation.id,
        conversationType: conversation.type,
      });
    },
    [navigation],
  );

  const pushWarning = getPushWarning(registration);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.navigate('Profile', { uid: user.uid })}
          accessibilityRole="button"
        >
          <Text style={styles.greeting}>Olá, {user.name.split(' ')[0]}</Text>
          <Text style={styles.headerHint}>Toque para ver seu perfil</Text>
        </Pressable>
        <View style={styles.actions}>
          <Button
            title="Nova conversa"
            variant="secondary"
            style={styles.actionButton}
            onPress={() => navigation.navigate('Users', { mode: 'direct' })}
          />
          <Button title="Novo grupo" style={styles.actionButton} onPress={() => navigation.navigate('GroupForm')} />
        </View>
        {pushWarning ? (
          <ErrorMessage message={pushWarning} variant="warning" onRetry={retryRegistration} />
        ) : null}
        {error ? <ErrorMessage message={error} /> : null}
      </View>

      {loading ? (
        <Loading message="Carregando conversas..." />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={({ item }) => <ConversationItem conversation={item} onPress={handleOpen} />}
          contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            <EmptyState
              title="Nenhuma conversa ainda"
              description="Inicie uma conversa individual ou crie um grupo."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  greeting: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  headerAction: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  emptyContainer: {
    flexGrow: 1,
  },
});
