import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { ImagePickerField } from '../components/ImagePickerField';
import { Input } from '../components/Input';
import { useAuth } from '../hooks/useAuth';
import { RootStackScreenProps } from '../navigation/types';
import { theme } from '../theme';
import { getErrorMessage } from '../utils/errorMessages';
import {
  isValidBirthDate,
  isValidEmail,
  isValidPhone,
  maskBirthDate,
  maskPhone,
} from '../utils/formatters';
import { showAlert } from '../utils/dialogs';

type Props = RootStackScreenProps<'Register'>;

type RegisterForm = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  birthDate: string;
};

type FormErrors = Partial<Record<keyof RegisterForm, string>>;

const INITIAL_FORM: RegisterForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phoneNumber: '',
  birthDate: '',
};

function validate(form: RegisterForm): FormErrors {
  const errors: FormErrors = {};

  if (form.name.trim().length < 2) {
    errors.name = 'Informe seu nome.';
  }

  if (!isValidEmail(form.email)) {
    errors.email = 'Informe um e-mail válido.';
  }

  if (form.password.length < 6) {
    errors.password = 'A senha deve ter pelo menos 6 caracteres.';
  }

  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'As senhas não conferem.';
  }

  if (!isValidPhone(form.phoneNumber)) {
    errors.phoneNumber = 'Informe um celular válido com DDD.';
  }

  if (!isValidBirthDate(form.birthDate)) {
    errors.birthDate = 'Informe uma data válida (DD/MM/AAAA).';
  }

  return errors;
}

export function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [form, setForm] = useState<RegisterForm>(INITIAL_FORM);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = useMemo(() => (submitted ? validate(form) : {}), [form, submitted]);

  function updateField(field: keyof RegisterForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleRegister() {
    setSubmitted(true);

    if (Object.keys(validate(form)).length > 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await signUp({
        name: form.name,
        email: form.email,
        password: form.password,
        phoneNumber: form.phoneNumber,
        birthDate: form.birthDate,
        photoUri,
      });

      if (result.photoUploadFailed) {
        showAlert('Conta criada', 'Não foi possível enviar a foto. Uma imagem padrão será exibida.');
      }
    } catch (registerError) {
      setError(getErrorMessage(registerError, 'Não foi possível criar a conta.'));
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Criar conta</Text>

          <ImagePickerField
            label={photoUri ? 'Trocar foto de perfil' : 'Escolher foto de perfil'}
            uri={photoUri ?? ''}
            disabled={loading}
            onChange={setPhotoUri}
          />

          {error ? <ErrorMessage message={error} /> : null}

          <Input
            label="Nome"
            value={form.name}
            onChangeText={(value) => updateField('name', value)}
            error={errors.name}
            autoComplete="name"
            placeholder="Seu nome completo"
          />
          <Input
            label="E-mail"
            value={form.email}
            onChangeText={(value) => updateField('email', value)}
            error={errors.email}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="voce@email.com"
          />
          <Input
            label="Celular"
            value={form.phoneNumber}
            onChangeText={(value) => updateField('phoneNumber', maskPhone(value))}
            error={errors.phoneNumber}
            keyboardType="phone-pad"
            placeholder="(11) 98765-4321"
          />
          <Input
            label="Data de nascimento"
            value={form.birthDate}
            onChangeText={(value) => updateField('birthDate', maskBirthDate(value))}
            error={errors.birthDate}
            keyboardType="number-pad"
            placeholder="DD/MM/AAAA"
          />
          <Input
            label="Senha"
            value={form.password}
            onChangeText={(value) => updateField('password', value)}
            error={errors.password}
            secureTextEntry
            autoComplete="new-password"
            placeholder="Mínimo de 6 caracteres"
          />
          <Input
            label="Confirmar senha"
            value={form.confirmPassword}
            onChangeText={(value) => updateField('confirmPassword', value)}
            error={errors.confirmPassword}
            secureTextEntry
            placeholder="Repita a senha"
          />

          <Button title="Cadastrar" onPress={handleRegister} loading={loading} />
          <Button
            title="Já tenho conta"
            variant="ghost"
            onPress={() => navigation.goBack()}
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
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  secondaryButton: {
    marginTop: theme.spacing.sm,
  },
});
