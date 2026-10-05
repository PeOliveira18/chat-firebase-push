import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { Input } from '../components/Input';
import { useAuth } from '../hooks/useAuth';
import { RootStackScreenProps } from '../navigation/types';
import { theme } from '../theme';
import { getErrorMessage } from '../utils/errorMessages';
import { isValidEmail } from '../utils/formatters';

type Props = RootStackScreenProps<'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!isValidEmail(email)) {
      setError('Informe um e-mail válido.');
      return;
    }

    if (!password) {
      setError('Informe a senha.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signIn({ email, password });
    } catch (loginError) {
      setError(getErrorMessage(loginError, 'Não foi possível entrar. Tente novamente.'));
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Chat Firebase</Text>
          <Text style={styles.subtitle}>Entre com seu e-mail e senha</Text>

          {error ? <ErrorMessage message={error} /> : null}

          <Input
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="voce@email.com"
          />
          <Input
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="Sua senha"
          />

          <Button title="Entrar" onPress={handleLogin} loading={loading} />
          <Button
            title="Criar conta"
            variant="ghost"
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
            style={styles.secondaryButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  secondaryButton: {
    marginTop: theme.spacing.sm,
  },
});
