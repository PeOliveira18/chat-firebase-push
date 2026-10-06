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

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createAuth(): Auth {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }

  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();

export const db = getFirestore(app);

export const rtdb = getDatabase(app);

if (USE_EMULATORS && !auth.emulatorConfig) {
  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
  connectDatabaseEmulator(rtdb, EMULATOR_HOST, 9000);
}

export default app;
