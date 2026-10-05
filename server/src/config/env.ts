/**
 * Variáveis de ambiente da API.
 * Os valores reais ficam SOMENTE nas variáveis secretas do serviço de hospedagem.
 */
function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }

  return value;
}

export type FirebaseEnv = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  databaseURL: string;
};

export function getFirebaseEnv(): FirebaseEnv {
  return {
    projectId: required('FIREBASE_PROJECT_ID'),
    clientEmail: required('FIREBASE_CLIENT_EMAIL'),
    // Na hospedagem a chave costuma ser salva com "\n" literais.
    privateKey: required('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    databaseURL: required('FIREBASE_DATABASE_URL'),
  };
}

export const PORT = Number(process.env.PORT ?? 3000);
export const EXPO_ACCESS_TOKEN = process.env.EXPO_ACCESS_TOKEN || undefined;

export type CloudinaryEnv = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

/** Credenciais do Cloudinary (armazenamento das fotos). null = não configurado. */
export function getCloudinaryEnv(): CloudinaryEnv | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return { cloudName, apiKey, apiSecret };
}
