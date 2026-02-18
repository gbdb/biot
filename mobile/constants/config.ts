/**
 * Configuration de l'app Jardin Biot
 * API base URL : en dev, pointe vers le serveur Django local
 */

const getApiBaseUrl = (): string => {
  // En production, utilise EXPO_PUBLIC_API_URL
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  // Dev: Android emulator → 10.0.2.2, iOS simulator → localhost, web → localhost
  if (process.env.EXPO_PUBLIC_USE_LOCALHOST === 'true') {
    return 'http://localhost:8000';
  }
  // Expo Go sur device physique : définir EXPO_PUBLIC_API_URL avec l'IP de ta machine (ex: http://192.168.1.x:8000)
  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_PREFIX = '/api';

export const ENDPOINTS = {
  auth: {
    token: `${API_PREFIX}/auth/token/`,
    refresh: `${API_PREFIX}/auth/token/refresh/`,
    verify: `${API_PREFIX}/auth/token/verify/`,
  },
  specimens: `${API_PREFIX}/specimens/`,
  specimenByNfc: (uid: string) => `${API_PREFIX}/specimens/by-nfc/${encodeURIComponent(uid)}/`,
  organisms: `${API_PREFIX}/organisms/`,
  gardens: `${API_PREFIX}/gardens/`,
} as const;
