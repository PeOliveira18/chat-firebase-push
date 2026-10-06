import axios from 'axios';

import { API_TIMEOUT_MS, API_URL } from '../config/api';
import { auth } from '../config/firebase';

// eslint-disable-next-line import/no-named-as-default-member
export const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser;

  if (currentUser) {
    const token = await currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
