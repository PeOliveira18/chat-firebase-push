/**
 * Cria usuários de demonstração no Firebase Emulator Suite (somente local).
 * Uso: com os emuladores rodando, `npm run seed` dentro de tests/rules.
 *
 * Senha de todos os usuários de demonstração: demo1234
 */
import { adminAuth, closeAdminApp, firestore } from '../../server/src/services/firebaseAdmin.js';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_DATABASE_EMULATOR_HOST ??= '127.0.0.1:9000';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
process.env.FIREBASE_PROJECT_ID ??= 'demo-chat';

const DEMO_PASSWORD = 'demo1234';

const DEMO_USERS = [
  { name: 'Ana Souza', email: 'ana@demo.com', phoneNumber: '(11) 98888-1111', birthDate: '10/03/2001' },
  { name: 'Bruno Lima', email: 'bruno@demo.com', phoneNumber: '(11) 97777-2222', birthDate: '22/07/1999' },
  { name: 'Carla Mendes', email: 'carla@demo.com', phoneNumber: '(21) 96666-3333', birthDate: '05/12/2000' },
];

async function main() {
  const db = firestore();
  const auth = adminAuth();

  for (const demo of DEMO_USERS) {
    const existing = await auth.getUserByEmail(demo.email).catch(() => null);
    const user = existing ?? (await auth.createUser({ email: demo.email, password: DEMO_PASSWORD }));
    const profile = { uid: user.uid, ...demo, photoUrl: '', createdAt: Date.now() };

    await db.collection('users').doc(user.uid).set(profile);
    await db.collection('publicProfiles').doc(user.uid).set({ uid: user.uid, name: demo.name, photoUrl: '' });
    console.log(`✔ ${demo.name} <${demo.email}>`);
  }

  await closeAdminApp();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
