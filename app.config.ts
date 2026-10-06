/// <reference types="node" />
import { existsSync } from 'fs';
import type { ExpoConfig } from 'expo/config';

const ANDROID_PACKAGE = 'br.com.fiap.chatfirebasepush';
const IOS_BUNDLE_ID = 'br.com.fiap.chatfirebasepush';
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID ?? '38e49d5c-e52e-4d94-a883-c0ad4d9a7f53';

const hasGoogleServices = existsSync('./google-services.json');
const hasGoogleServicesPlist = existsSync('./GoogleService-Info.plist');

const config: ExpoConfig = {
  name: 'Chat Firebase Push',
  slug: 'chat-firebase-push',
  owner: 'pe.oliveira',
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
