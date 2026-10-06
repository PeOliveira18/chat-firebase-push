import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

export type ImagePickResult =
  | { status: 'picked'; uri: string }
  | { status: 'canceled' }
  | { status: 'denied' };

export function useImagePicker() {
  const [picking, setPicking] = useState(false);

  const pickImage = useCallback(async (): Promise<ImagePickResult> => {
    setPicking(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        return { status: 'denied' };
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });

      if (result.canceled || result.assets.length === 0) {
        return { status: 'canceled' };
      }

      return { status: 'picked', uri: result.assets[0].uri };
    } finally {
      setPicking(false);
    }
  }, []);

  return { pickImage, picking };
}
