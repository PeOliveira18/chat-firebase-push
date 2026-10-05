export type ChatUser = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};

/**
 * Dados mínimos visíveis a qualquer usuário autenticado (lista de usuários).
 * Os dados cadastrais completos ficam em `users/{uid}` e só são liberados para
 * quem compartilha uma conversa ou grupo.
 */
export type PublicProfile = {
  uid: string;
  name: string;
  photoUrl: string;
};

export type RegisterData = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  birthDate: string;
  photoUri: string | null;
};

export type LoginData = {
  email: string;
  password: string;
};
