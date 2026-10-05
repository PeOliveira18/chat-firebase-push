/// <reference types="node" />
import { existsSync } from 'fs';
import type { ExpoConfig } from 'expo/config';

/**
 * Configuração do Expo.
 *
 * O arquivo google-services.json (Android/FCM) só é referenciado quando existe,
 * para que `npx expo start` funcione antes da configuração do Firebase.
 */
const ANDROID_PACKAGE = 'br.com.fiap.chatfirebasepush';
const IOS_BUNDLE_ID = 'br.com.fiap.chatfirebasepush';
// Preencha com o projectId exibido por `npx eas-cli@latest init` (necessário para o token de push).
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID ?? '';

const hasGoogleServices = existsSync('./google-services.json');
const hasGoogleServicesPlist = existsSync('./GoogleService-Info.plist');

const config: ExpoConfig = {
  name: 'Chat Firebase Push',
  slug: 'chat-firebase-push',
  scheme: 'chatfirebasepush',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: IOS_BUNDLE_ID,
    ...(hasGoogleServicesPlist ? { googleServicesFile: './GoogleService-Info.plist' } : {}),
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    package: ANDROID_PACKAGE,
    ...(hasGoogleServices ? { googleServicesFile: './google-services.json' } : {}),
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-notifications',
      {
        color: '#2563EB',
        defaultChannel: 'messages',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'O aplicativo precisa acessar suas fotos para definir a foto de perfil ou do grupo.',
        cameraPermission: 'O aplicativo precisa acessar a câmera para tirar a foto de perfil ou do grupo.',
      },
    ],
  ],
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID || undefined,
    },
  },
};

export default config;
