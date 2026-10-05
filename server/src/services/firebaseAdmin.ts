import { App, cert, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Database, getDatabase } from 'firebase-admin/database';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

import { getFirebaseEnv } from '../config/env.js';

/**
 * Firebase Admin SDK inicializado com a conta de serviço lida das variáveis
 * de ambiente da hospedagem. A inicialização é preguiçosa para permitir
 * testes unitários sem credenciais.
 */
let app: App | null = null;

function getAdminApp(): App {
  if (app) {
    return app;
  }

  const existing = getApps();

  if (existing.length > 0) {
    app = existing[0];
    return app;
  }

  // Testes locais com o Firebase Emulator Suite (sem credenciais reais).
  if (process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    const projectId = process.env.FIREBASE_PROJECT_ID ?? 'demo-chat';
    app = initializeApp({
      projectId,
      databaseURL: `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}?ns=${projectId}-default-rtdb`,
    });
    return app;
  }

  const env = getFirebaseEnv();

  app = initializeApp({
    credential: cert({
      projectId: env.projectId,
      clientEmail: env.clientEmail,
      privateKey: env.privateKey,
    }),
    databaseURL: env.databaseURL,
  });

  return app;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function firestore(): Firestore {
  return getFirestore(getAdminApp());
}

export function rtdb(): Database {
  return getDatabase(getAdminApp());
}

/** Encerra as conexões do Admin SDK (desligamento do servidor e testes). */
export async function closeAdminApp(): Promise<void> {
  if (app) {
    await deleteApp(app);
    app = null;
  }
}
