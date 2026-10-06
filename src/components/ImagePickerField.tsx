import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useImagePicker } from '../hooks/useImagePicker';
import { theme } from '../theme';
import { showAlert } from '../utils/dialogs';
import { Avatar } from './Avatar';

type ImagePickerFieldProps = {
  label: string;
  uri: string;
  variant?: 'user' | 'group';
  disabled?: boolean;
  onChange: (uri: string) => void;
};

export function ImagePickerField({ label, uri, variant = 'user', disabled = false, onChange }: ImagePickerFieldProps) {
  const { pickImage, picking } = useImagePicker();

  async function handlePick() {
    try {
      const result = await pickImage();

      if (result.status === 'picked') {
        onChange(result.uri);
      } else if (result.status === 'denied') {
        showAlert(
          'Permissão necessária',
          'Permita o acesso às fotos nas configurações do dispositivo para escolher uma imagem.',
        );
      }
    } catch {
      showAlert('Erro', 'Não foi possível abrir a galeria.');
    }
  }

  return (
    <View style={styles.container}>
      <Avatar uri={uri} size={96} variant={variant} />
      <Pressable
        onPress={handlePick}
        disabled={disabled || picking}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={styles.buttonText}>{picking ? 'Abrindo galeria...' : label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  button: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  buttonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
