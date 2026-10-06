export type ChatUser = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};

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
