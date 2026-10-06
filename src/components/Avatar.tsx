import { useState } from 'react';
import { Image, ImageSourcePropType, Pressable, StyleSheet } from 'react-native';

import { theme } from '../theme';

const DEFAULT_AVATAR: ImageSourcePropType = require('../../assets/default-avatar.png');
const DEFAULT_GROUP: ImageSourcePropType = require('../../assets/default-group.png');

type AvatarProps = {
  uri: string;
  size?: number;
  variant?: 'user' | 'group';
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function Avatar({ uri, size = 48, variant = 'user', onPress, accessibilityLabel }: AvatarProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const failed = failedUri === uri;

  const fallback = variant === 'group' ? DEFAULT_GROUP : DEFAULT_AVATAR;
  const source = uri && !failed ? { uri } : fallback;
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  const image = (
    <Image
      source={source}
      style={[styles.image, dimensions]}
      onError={() => setFailedUri(uri)}
      accessibilityIgnoresInvertColors
    />
  );

  if (!onPress) {
    return image;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'Abrir detalhes'}
      hitSlop={8}
    >
      {image}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: theme.colors.border,
  },
});
