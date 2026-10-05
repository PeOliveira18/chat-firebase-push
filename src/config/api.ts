/**
 * URL pública (HTTPS) da API de notificações hospedada no Render.
 * Pode ser sobrescrita pela variável EXPO_PUBLIC_API_URL.
 */
const DEFAULT_API_URL = 'https://chat-firebase-push-api.onrender.com';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;

// O plano gratuito do Render pode levar alguns segundos para "acordar" a API.
export const API_TIMEOUT_MS = 60000;
