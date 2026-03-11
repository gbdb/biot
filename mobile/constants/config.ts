/**
 * Configuration de l'app Jardin Biot
 * API base URL : en dev, pointe vers le serveur Django local.
 * L'utilisateur peut surcharger l'URL dans Paramètres → Serveur (persistée en SecureStore).
 */

/** URL par défaut (build / EXPO_PUBLIC_API_URL). */
export function getDefaultApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (process.env.EXPO_PUBLIC_USE_LOCALHOST === 'true') {
    return 'http://localhost:8000';
  }
  return 'http://localhost:8000';
}

let overrideApiBaseUrl: string | null = null;

/** URL effective : override utilisateur si défini, sinon défaut. Utilisée par le client API à chaque requête. */
export function getApiBaseUrl(): string {
  const base = overrideApiBaseUrl ?? getDefaultApiBaseUrl();
  return base.replace(/\/$/, '');
}

/** Définit la surcharge (ou null pour revenir au défaut). Appelé par ApiConfigContext après chargement/sauvegarde. */
export function setOverrideApiBaseUrl(url: string | null): void {
  overrideApiBaseUrl = url ? url.replace(/\/$/, '') : null;
}

/** Pour affichage et rétrocompat : même valeur que getApiBaseUrl() au moment du premier import. */
export const API_BASE_URL = getDefaultApiBaseUrl();
export const API_PREFIX = '/api';

export const ENDPOINTS = {
  auth: {
    token: `${API_PREFIX}/auth/token/`,
    refresh: `${API_PREFIX}/auth/token/refresh/`,
    verify: `${API_PREFIX}/auth/token/verify/`,
    register: `${API_PREFIX}/auth/register/`,
  },
  specimens: `${API_PREFIX}/specimens/`,
  specimenByNfc: (uid: string) => `${API_PREFIX}/specimens/by-nfc/${encodeURIComponent(uid)}/`,
  organisms: `${API_PREFIX}/organisms/`,
  cultivars: `${API_PREFIX}/cultivars/`,
  gardens: `${API_PREFIX}/gardens/`,
  remindersUpcoming: `${API_PREFIX}/reminders/upcoming/`,
  weatherAlerts: `${API_PREFIX}/weather-alerts/`,
  me: {
    profile: `${API_PREFIX}/me/`,
    preferences: `${API_PREFIX}/me/preferences/`,
    changePassword: `${API_PREFIX}/me/change-password/`,
  },
  admin: {
    users: `${API_PREFIX}/admin/users/`,
    userDetail: (id: number) => `${API_PREFIX}/admin/users/${id}/`,
    runCommand: `${API_PREFIX}/admin/run-command/`,
    speciesStats: `${API_PREFIX}/admin/species-stats/`,
    importVascanFile: `${API_PREFIX}/admin/import-vascan-file/`,
  },
} as const;
