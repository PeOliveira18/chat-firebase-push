import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { NotificationProvider } from '../contexts/NotificationContext';
import { useAuth } from '../hooks/useAuth';
import { ChatScreen } from '../screens/ChatScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { GroupFormScreen } from '../screens/GroupFormScreen';
import { GroupMembersScreen } from '../screens/GroupMembersScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { UsersScreen } from '../screens/UsersScreen';
import { theme } from '../theme';
import { NotificationData } from '../types/notification';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

function ProfileProblem({ message, onSignOut }: { message: string; onSignOut: () => void }) {
  return (
    <View style={styles.problem}>
      <Text style={styles.problemTitle}>Não foi possível abrir sua conta</Text>
      <Text style={styles.problemText}>{message}</Text>
      <Button title="Sair" onPress={onSignOut} />
    </View>
  );
}

export function Routes() {
  const { firebaseUser, user, initializing, profileStatus, profileError, isRegistering, signOut } = useAuth();
  const [navigationReadyKey, setNavigationReadyKey] = useState(0);

  const handleOpenConversation = useCallback((data: NotificationData) => {
    if (!navigationRef.isReady()) {
      return false;
    }

    navigationRef.navigate('Chat', {
      conversationId: data.conversationId,
      conversationType: data.conversationType,
    });

    return true;
  }, []);

  const handleSignOut = useCallback(() => {
    signOut().catch(() => undefined);
  }, [signOut]);

  let content;

  if (initializing) {
    content = <Loading message="Recuperando sessão..." />;
  } else if (firebaseUser && !user) {
    const showProblem = !isRegistering && (profileStatus === 'missing' || profileStatus === 'error');

    content = showProblem ? (
      <ProfileProblem
        message={profileError ?? 'Seu perfil não foi encontrado. Saia e cadastre-se novamente.'}
        onSignOut={handleSignOut}
      />
    ) : (
      <Loading message="Carregando perfil..." />
    );
  } else {
    content = (
      <NavigationContainer ref={navigationRef} onReady={() => setNavigationReadyKey((key) => key + 1)}>
        <Stack.Navigator
          screenOptions={{
            headerTintColor: theme.colors.primary,
            headerTitleStyle: { color: theme.colors.text },
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          {user ? (
            <Stack.Group>
              <Stack.Screen name="Conversations" component={ConversationsScreen} options={{ title: 'Conversas' }} />
              <Stack.Screen name="Users" component={UsersScreen} options={{ title: 'Usuários' }} />
              <Stack.Screen name="GroupForm" component={GroupFormScreen} options={{ title: 'Grupo' }} />
              <Stack.Screen name="GroupMembers" component={GroupMembersScreen} options={{ title: 'Integrantes' }} />
              <Stack.Screen name="Chat" component={ChatScreen} options={{ title: '' }} />
              <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
            </Stack.Group>
          ) : (
            <Stack.Group screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NotificationProvider
      uid={user?.uid ?? null}
      navigationReadyKey={navigationReadyKey}
      onOpenConversation={handleOpenConversation}
    >
      {content}
    </NotificationProvider>
  );
}

const styles = StyleSheet.create({
  problem: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  problemTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  problemText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
});
