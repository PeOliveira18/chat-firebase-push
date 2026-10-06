const DEFAULT_API_URL = 'https://chat-firebase-push-api.onrender.com';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;

export const API_TIMEOUT_MS = 60000;
