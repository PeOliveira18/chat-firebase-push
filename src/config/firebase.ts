import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  connectAuthEmulator,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

import projectConfig from '../../firebaseConfig.json';

/**
 * Modo de desenvolvimento local com o Firebase Emulator Suite
 * (EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true). Nenhum dado vai para a nuvem.
 */
export const USE_EMULATORS = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
const EMULATOR_HOST = process.env.EXPO_PUBLIC_EMULATOR_HOST ?? '127.0.0.1';
const EMULATOR_PROJECT_ID = 'demo-chat';

const firebaseConfig = USE_EMULATORS
  ? {
      ...projectConfig,
      projectId: EMULATOR_PROJECT_ID,
      databaseURL: `http://${EMULATOR_HOST}:9000?ns=${EMULATOR_PROJECT_ID}-default-rtdb`,
    }
  : projectConfig;

/**
 * Configuração do Firebase SDK cliente.
 *
 * Os valores vêm de `firebaseConfig.json` (raiz do projeto), que contém apenas a
 * configuração pública do SDK cliente. Nenhuma credencial administrativa fica no app.
 */
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createAuth(): Auth {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }

  try {
    // Persiste a sessão no AsyncStorage para recuperar o login ao reabrir o app.
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Em hot reload o Auth já pode ter sido inicializado.
    return getAuth(app);
  }
}

export const auth = createAuth();

// Cloud Firestore: perfis, grupos, configurações e tokens de dispositivos.
export const db = getFirestore(app);

// Realtime Database: mensagens e sincronização em tempo real.
export const rtdb = getDatabase(app);

if (USE_EMULATORS && !auth.emulatorConfig) {
  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
  connectDatabaseEmulator(rtdb, EMULATOR_HOST, 9000);
}

export default app;
