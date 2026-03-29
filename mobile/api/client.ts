/**
 * Client API Jardin Biot
 * Appels REST vers le backend Django
 */

import * as SecureStore from 'expo-secure-store';
import { getApiBaseUrl, ENDPOINTS } from '@/constants/config';
import type {
  SpecimenDetail,
  SpecimenList,
  SpecimenCreateUpdate,
  Event,
  EventCreate,
  RecentEvent,
  Reminder,
  ReminderCreate,
  Photo,
  PhotoCreate,
  OrganismMinimal,
  OrganismDetail,
  OrganismUpdate,
  MissingSpeciesResponse,
  GardenMinimal,
  GardenCreate,
  GardenGCP,
  CultivarListEntry,
  CultivarDetail,
  TokenPair,
  ApiError,
  GardenWarningsResponse,
  SpecimenCompanions,
} from '@/types/api';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'jardinbiot_access_token',
  REFRESH_TOKEN: 'jardinbiot_refresh_token',
};

/** Timeout pour les appels auth (évite blocage si Django injoignable) */
const AUTH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = AUTH_TIMEOUT_MS
): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/** Token JWT actuel (pour WebView Cesium par ex.). Préférer ensureValidToken() avant usage. */
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
}

async function setTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, access);
  await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refresh);
}

async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
}

/** Une seule refresh à la fois : les appels concurrents (ex. Accueil) attendent le même token. */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const refresh = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refresh) return null;
      let res: Response;
      try {
        res = await fetchWithTimeout(`${getApiBaseUrl()}${ENDPOINTS.auth.refresh}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        });
      } catch {
        await clearTokens();
        return null;
      }
      if (!res.ok) {
        await clearTokens();
        return null;
      }
      const data = (await res.json()) as { access: string };
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, data.access);
      return data.access;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function authHeaders(): Promise<Record<string, string>> {
  let token = await getAccessToken();
  if (!token) {
    token = await refreshAccessToken();
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/** Fetch authentifié avec retry automatique sur 401 (token expiré → refresh → retry) */
async function fetchWithAuth(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const { headers: initHeaders, ...rest } = init;
  const baseHeaders = await authHeaders();
  const headers = { ...baseHeaders, ...(initHeaders as Record<string, string>) };
  if (rest.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  let res = await fetch(url, { ...rest, headers });
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(url, { ...rest, headers: retryHeaders });
    }
  }
  return res;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(res.statusText || 'Erreur réseau');
  }
  if (!res.ok) {
    const err = data as ApiError;
    const msg = err.detail ?? err.message ?? `Erreur ${res.status}`;
    throw new Error(String(msg));
  }
  return data as T;
}

/** Extract results from DRF paginated response { count, next, previous, results } */
function unwrapPaginated<T>(data: unknown): T[] {
  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown }).results)) {
    return (data as { results: T[] }).results;
  }
  return Array.isArray(data) ? data : [];
}

// --- Auth ---
export async function login(username: string, password: string): Promise<TokenPair> {
  const res = await fetchWithTimeout(`${getApiBaseUrl()}${ENDPOINTS.auth.token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await handleResponse<TokenPair>(res);
  await setTokens(data.access, data.refresh);
  return data;
}

export interface RegisterPayload {
  username: string;
  password: string;
  password_confirm: string;
  email?: string;
}

/** Crée un compte utilisateur. Ne connecte pas automatiquement. */
export async function register(data: RegisterPayload): Promise<{ detail: string }> {
  const res = await fetchWithTimeout(`${getApiBaseUrl()}${ENDPOINTS.auth.register}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: data.username.trim(),
      password: data.password,
      password_confirm: data.password_confirm,
      ...(data.email?.trim() && { email: data.email.trim() }),
    }),
  });
  return handleResponse<{ detail: string }>(res);
}

/**
 * Vérifie que le backend Jardin Biot répond, sans JWT.
 * POST /api/auth/register/ avec corps vide → 400 (validation) = API joignable (AllowAny).
 */
export async function pingBackendReachable(baseUrl: string): Promise<void> {
  const base = baseUrl.replace(/\/$/, '');
  const res = await fetchWithTimeout(
    `${base}${ENDPOINTS.auth.register}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({}),
    },
    AUTH_TIMEOUT_MS
  );
  if (res.status === 404) {
    throw new Error(
      'Route API introuvable (404). Vérifiez l’URL (ex. http://127.0.0.1:8000 sans /api).'
    );
  }
  if (res.status >= 500) {
    throw new Error(`Erreur serveur HTTP ${res.status}.`);
  }
  // 400 attendu : champs obligatoires manquants
  if (res.status === 400) {
    return;
  }
  if (res.ok) {
    return;
  }
  const text = await res.text().catch(() => '');
  throw new Error(
    `Réponse inattendue (${res.status}). Ce n’est peut‑être pas l’API Jardin Biot. ${text.slice(0, 80)}`
  );
}

export async function logout(): Promise<void> {
  refreshPromise = null;
  await clearTokens();
}

/** À appeler au focus de l’écran d’accueil : tente d’avoir un token valide avant les requêtes (évite 401 en rafale). */
export async function ensureValidToken(): Promise<boolean> {
  let token = await getAccessToken();
  if (!token) token = await refreshAccessToken();
  return !!token;
}

export async function isAuthenticated(): Promise<boolean> {
  let token = await getAccessToken();
  if (!token) {
    token = await refreshAccessToken();
    if (!token) return false;
  }
  let res: Response;
  try {
    res = await fetchWithTimeout(`${getApiBaseUrl()}${ENDPOINTS.auth.verify}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ token }),
    });
  } catch {
    return false;
  }
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) return true;
    return false;
  }
  return res.ok;
}

// --- NFC lookup ---
export async function getSpecimenByNfc(uid: string): Promise<SpecimenDetail> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.specimenByNfc(uid)}`);
  return handleResponse<SpecimenDetail>(res);
}

/** Returns specimen if found, null if tag is unknown (404). Throws on other errors. */
export async function getSpecimenByNfcOrNull(uid: string): Promise<SpecimenDetail | null> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.specimenByNfc(uid)}`);
  if (res.status === 404) return null;
  return handleResponse<SpecimenDetail>(res);
}

// --- Specimens ---
export async function getSpecimens(params?: {
  garden?: number;
  zone?: string;
  statut?: string;
  organisme?: number;
  search?: string;
  favoris?: boolean;
  sante?: number;
  /** Inclure les spécimens au statut « Enlevé » (par défaut ils sont exclus). */
  include_enleve?: boolean;
  /** Nombre par page (max 100 côté API). Utile pour la vue terrain 3D. */
  page_size?: number;
}): Promise<SpecimenList[]> {
  const searchParams = new URLSearchParams();
  if (params?.garden) searchParams.set('garden', String(params.garden));
  if (params?.zone) searchParams.set('zone', params.zone);
  if (params?.statut) searchParams.set('statut', params.statut);
  if (params?.organisme) searchParams.set('organisme', String(params.organisme));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.favoris) searchParams.set('favoris', '1');
  if (params?.sante != null) searchParams.set('sante', String(params.sante));
  if (params?.include_enleve === true) searchParams.set('include_enleve', 'true');
  if (params?.page_size != null) searchParams.set('page_size', String(params.page_size));
  const qs = searchParams.toString();
  const url = `${getApiBaseUrl()}${ENDPOINTS.specimens}${qs ? `?${qs}` : ''}`;
  const res = await fetchWithAuth(url);
  const data = await handleResponse<unknown>(res);
  return unwrapPaginated<SpecimenList>(data);
}

/** Nombre de spécimens (avec ou sans filtres). Pour afficher "X / total". */
export async function getSpecimensCount(params?: {
  garden?: number;
  zone?: string;
  statut?: string;
  favoris?: boolean;
  sante?: number;
  include_enleve?: boolean;
}): Promise<number> {
  const searchParams = new URLSearchParams();
  if (params?.garden) searchParams.set('garden', String(params.garden));
  if (params?.zone) searchParams.set('zone', params.zone);
  if (params?.statut) searchParams.set('statut', params.statut);
  if (params?.favoris) searchParams.set('favoris', '1');
  if (params?.sante != null) searchParams.set('sante', String(params.sante));
  if (params?.include_enleve === true) searchParams.set('include_enleve', 'true');
  const qs = searchParams.toString();
  const res = await fetchWithAuth(
    `${getApiBaseUrl()}${ENDPOINTS.specimens}count/${qs ? `?${qs}` : ''}`
  );
  const data = await handleResponse<{ count: number }>(res);
  return data?.count ?? 0;
}

export async function getSpecimenZones(): Promise<string[]> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.specimens}zones/`);
  return handleResponse<string[]>(res);
}

export async function getSpecimensNearby(params: {
  lat: number;
  lng: number;
  radius?: number;
  limit?: number;
}): Promise<SpecimenList[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('lat', String(params.lat));
  searchParams.set('lng', String(params.lng));
  if (params.radius != null) searchParams.set('radius', String(params.radius));
  if (params.limit != null) searchParams.set('limit', String(params.limit));
  const res = await fetchWithAuth(
    `${getApiBaseUrl()}${ENDPOINTS.specimens}nearby/?${searchParams.toString()}`
  );
  return handleResponse<SpecimenList[]>(res);
}

export async function addSpecimenFavorite(id: number): Promise<void> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.specimens}${id}/favoris/`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text();
    let err: ApiError;
    try {
      err = text ? (JSON.parse(text) as ApiError) : {};
    } catch {
      throw new Error(`Erreur ${res.status}: ${text || res.statusText}`);
    }
    const msg = err.detail ?? err.message ?? `Erreur ${res.status}`;
    throw new Error(String(msg));
  }
}

export async function removeSpecimenFavorite(id: number): Promise<void> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.specimens}${id}/favoris/`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    let err: ApiError;
    try {
      err = text ? (JSON.parse(text) as ApiError) : {};
    } catch {
      throw new Error(`Erreur ${res.status}: ${text || res.statusText}`);
    }
    const msg = err.detail ?? err.message ?? `Erreur ${res.status}`;
    throw new Error(String(msg));
  }
}

export async function getSpecimen(id: number): Promise<SpecimenDetail> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.specimens}${id}/`);
  return handleResponse<SpecimenDetail>(res);
}

export async function createSpecimen(data: SpecimenCreateUpdate): Promise<SpecimenDetail> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.specimens}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<SpecimenDetail>(res);
}

export async function updateSpecimen(id: number, data: Partial<SpecimenCreateUpdate>): Promise<SpecimenDetail> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.specimens}${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return handleResponse<SpecimenDetail>(res);
}

export async function duplicateSpecimen(id: number): Promise<SpecimenDetail> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.specimens}${id}/duplicate/`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return handleResponse<SpecimenDetail>(res);
}

export async function getSpecimenCompanions(specimenId: number): Promise<SpecimenCompanions> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/companions/`);
  return handleResponse<SpecimenCompanions>(res);
}

// --- Specimen events ---
export async function getRecentEvents(params?: { limit?: number }): Promise<RecentEvent[]> {
  const limit = params?.limit ?? 20;
  const res = await fetchWithAuth(
    `${getApiBaseUrl()}${ENDPOINTS.specimens}recent_events/?limit=${Math.min(limit, 100)}`
  );
  return handleResponse<RecentEvent[]>(res);
}

export async function getSpecimenEvents(specimenId: number): Promise<Event[]> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/events/`);
  return handleResponse<Event[]>(res);
}

export async function createSpecimenEvent(specimenId: number, data: EventCreate): Promise<Event> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/events/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<Event>(res);
}

export async function getSpecimenEvent(specimenId: number, eventId: number): Promise<Event> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/events/${eventId}/`);
  return handleResponse<Event>(res);
}

export async function updateSpecimenEvent(
  specimenId: number,
  eventId: number,
  data: Partial<EventCreate>
): Promise<Event> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/events/${eventId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return handleResponse<Event>(res);
}

export async function getEventApplyToZonePreview(
  specimenId: number,
  eventId: number
): Promise<{ zone: string | null; count: number }> {
  const res = await fetchWithAuth(
    `${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/events/${eventId}/apply-to-zone-preview/`
  );
  return handleResponse<{ zone: string | null; count: number }>(res);
}

export async function applyEventToZone(
  specimenId: number,
  eventId: number
): Promise<{ created: number; zone: string }> {
  const res = await fetchWithAuth(
    `${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/events/${eventId}/apply-to-zone/`,
    { method: 'POST' }
  );
  return handleResponse<{ created: number; zone: string }>(res);
}

// --- Specimen reminders ---
export async function getSpecimenReminders(specimenId: number): Promise<Reminder[]> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/reminders/`);
  return handleResponse<Reminder[]>(res);
}

export async function createSpecimenReminder(specimenId: number, data: ReminderCreate): Promise<Reminder> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/reminders/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<Reminder>(res);
}

export async function deleteSpecimenReminder(specimenId: number, reminderId: number): Promise<void> {
  const res = await fetchWithAuth(
    `${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/reminders/${reminderId}/`,
    { method: 'DELETE' }
  );
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    let err: ApiError;
    try {
      err = text ? (JSON.parse(text) as ApiError) : {};
    } catch {
      throw new Error(`Erreur ${res.status}: ${text || res.statusText}`);
    }
    const msg = err.detail ?? err.message ?? `Erreur ${res.status}`;
    throw new Error(String(msg));
  }
}

export async function deleteSpecimenEvent(specimenId: number, eventId: number): Promise<void> {
  const url = `${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/events/${eventId}/`;
  const res = await fetchWithAuth(url, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    let err: ApiError;
    try {
      err = text ? (JSON.parse(text) as ApiError) : {};
    } catch {
      throw new Error(`Erreur ${res.status}: ${text || res.statusText}`);
    }
    const msg = err.detail ?? err.message ?? `Erreur ${res.status} (${text || res.statusText})`;
    throw new Error(String(msg));
  }
}

export async function getEventPhotos(specimenId: number, eventId: number): Promise<Photo[]> {
  const res = await fetchWithAuth(
    `${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/events/${eventId}/photos/`
  );
  return handleResponse<Photo[]>(res);
}

export async function uploadEventPhoto(
  specimenId: number,
  eventId: number,
  data: PhotoCreate
): Promise<Photo> {
  const formData = new FormData();
  const img = data.image as { uri: string; type?: string; name?: string };
  formData.append('image', {
    uri: img.uri,
    type: img.type || 'image/jpeg',
    name: img.name || 'photo.jpg',
  } as unknown as Blob);
  if (data.type_photo) formData.append('type_photo', data.type_photo);
  if (data.titre) formData.append('titre', data.titre || '');
  if (data.description) formData.append('description', data.description || '');
  if (data.date_prise) formData.append('date_prise', data.date_prise);

  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/events/${eventId}/photos/`,
    { method: 'POST', headers, body: formData }
  );
  return handleResponse<Photo>(res);
}

// --- Specimen photos ---
export async function getSpecimenPhotos(specimenId: number): Promise<Photo[]> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/photos/`);
  return handleResponse<Photo[]>(res);
}

export async function setSpecimenDefaultPhoto(specimenId: number, photoId: number): Promise<void> {
  const res = await fetchWithAuth(
    `${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/photos/${photoId}/set-default/`,
    { method: 'POST' }
  );
  if (!res.ok) {
    const text = await res.text();
    let err: ApiError;
    try {
      err = text ? (JSON.parse(text) as ApiError) : {};
    } catch {
      throw new Error(`Erreur ${res.status}: ${text || res.statusText}`);
    }
    const msg = err.detail ?? err.message ?? `Erreur ${res.status}`;
    throw new Error(String(msg));
  }
}

export async function deleteSpecimenPhoto(specimenId: number, photoId: number): Promise<void> {
  const res = await fetchWithAuth(
    `${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/photos/${photoId}/`,
    { method: 'DELETE' }
  );
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    let err: ApiError;
    try {
      err = text ? (JSON.parse(text) as ApiError) : {};
    } catch {
      throw new Error(`Erreur ${res.status}: ${text || res.statusText}`);
    }
    const msg = err.detail ?? err.message ?? `Erreur ${res.status}`;
    throw new Error(String(msg));
  }
}

export async function uploadSpecimenPhoto(
  specimenId: number,
  data: PhotoCreate,
  apiBaseUrl: string = getApiBaseUrl()
): Promise<Photo> {
  const formData = new FormData();
  const img = data.image as { uri: string; type?: string; name?: string };
  formData.append('image', {
    uri: img.uri,
    type: img.type || 'image/jpeg',
    name: img.name || 'photo.jpg',
  } as unknown as Blob);
  if (data.type_photo) formData.append('type_photo', data.type_photo);
  if (data.titre) formData.append('titre', data.titre ?? '');
  if (data.description) formData.append('description', data.description ?? '');
  if (data.date_prise) formData.append('date_prise', data.date_prise ?? '');

  const res = await fetchWithAuth(`${apiBaseUrl}${ENDPOINTS.specimens}${specimenId}/photos/`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<Photo>(res);
}

// --- Organism photos ---
export async function uploadOrganismPhoto(
  organismId: number,
  data: PhotoCreate
): Promise<Photo> {
  const formData = new FormData();
  const img = data.image as { uri: string; type?: string; name?: string };
  formData.append('image', {
    uri: img.uri,
    type: img.type || 'image/jpeg',
    name: img.name || 'photo.jpg',
  } as unknown as Blob);
  if (data.type_photo) formData.append('type_photo', data.type_photo);
  if (data.titre) formData.append('titre', data.titre ?? '');
  if (data.description) formData.append('description', data.description ?? '');
  if (data.date_prise) formData.append('date_prise', data.date_prise ?? '');

  const res = await fetchWithAuth(
    `${getApiBaseUrl()}${ENDPOINTS.organisms}${organismId}/photos/`,
    { method: 'POST', body: formData }
  );
  return handleResponse<Photo>(res);
}

export async function uploadOrganismPhotoFromUrl(
  organismId: number,
  data: { image_url: string; titre?: string; type_photo?: string }
): Promise<Photo> {
  const res = await fetchWithAuth(
    `${getApiBaseUrl()}${ENDPOINTS.organisms}${organismId}/photos/`,
    {
      method: 'POST',
      body: JSON.stringify({
        image_url: data.image_url,
        ...(data.titre && { titre: data.titre }),
        ...(data.type_photo && { type_photo: data.type_photo }),
      }),
    }
  );
  return handleResponse<Photo>(res);
}

/** Définit une photo comme image par défaut de l'espèce. */
export async function setOrganismDefaultPhoto(organismId: number, photoId: number): Promise<void> {
  const res = await fetchWithAuth(
    `${getApiBaseUrl()}${ENDPOINTS.organisms}${organismId}/photos/${photoId}/set-default/`,
    { method: 'POST' }
  );
  if (!res.ok) {
    const text = await res.text();
    let err: ApiError;
    try {
      err = text ? (JSON.parse(text) as ApiError) : {};
    } catch {
      throw new Error(`Erreur ${res.status}: ${text || res.statusText}`);
    }
    const msg = err.detail ?? err.message ?? `Erreur ${res.status}`;
    throw new Error(String(msg));
  }
}

// --- Organisms ---
export async function postMissingSpeciesRequest(payload: {
  nom_latin: string;
  nom_commun?: string;
  search_query?: string;
}): Promise<MissingSpeciesResponse> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.organisms}missing-species-request/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return handleResponse<MissingSpeciesResponse>(res);
}

export async function getOrganismInconnu(): Promise<OrganismMinimal> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.organisms}inconnu/`);
  return handleResponse<OrganismMinimal>(res);
}

export async function getOrganisms(params?: { search?: string; type?: string }): Promise<OrganismMinimal[]> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.type) searchParams.set('type', params.type);
  const qs = searchParams.toString();
  const url = `${getApiBaseUrl()}${ENDPOINTS.organisms}${qs ? `?${qs}` : ''}`;
  const res = await fetchWithAuth(url);
  const data = await handleResponse<unknown>(res);
  return unwrapPaginated<OrganismMinimal>(data);
}

/** Liste paginée pour infinite scroll. Retourne results + hasMore + count. */
export async function getOrganismsPaginated(params?: {
  search?: string;
  type?: string;
  page?: number;
  favoris?: boolean;
  soleil?: string;
  zone_usda?: number;
  fruits?: boolean;
  noix?: boolean;
  vigueur?: string;
  has_specimen?: boolean;
  garden?: number;
}): Promise<{ results: OrganismMinimal[]; hasMore: boolean; count: number }> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.favoris) searchParams.set('favoris', '1');
  if (params?.soleil) searchParams.set('soleil', params.soleil);
  if (params?.zone_usda) searchParams.set('zone_usda', String(params.zone_usda));
  if (params?.fruits) searchParams.set('fruits', '1');
  if (params?.noix) searchParams.set('noix', '1');
  if (params?.vigueur) searchParams.set('vigueur', params.vigueur);
  if (params?.has_specimen) searchParams.set('has_specimen', '1');
  if (params?.garden != null) searchParams.set('garden', String(params.garden));
  const qs = searchParams.toString();
  const url = `${getApiBaseUrl()}${ENDPOINTS.organisms}${qs ? `?${qs}` : ''}`;
  const res = await fetchWithAuth(url);
  const data = (await handleResponse<unknown>(res)) as {
    results?: OrganismMinimal[];
    next?: string | null;
    count?: number;
  };
  const results = Array.isArray(data?.results) ? data.results : [];
  const hasMore = !!data?.next;
  const count = typeof data?.count === 'number' ? data.count : results.length;
  return { results, hasMore, count };
}

/** Liste paginée des cultivars (vue "Tous les cultivars"). */
export async function getCultivarsPaginated(params?: {
  search?: string;
  organism?: number;
  page?: number;
}): Promise<{ results: CultivarListEntry[]; hasMore: boolean; count: number }> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.organism != null) searchParams.set('organism', String(params.organism));
  if (params?.page) searchParams.set('page', String(params.page));
  const qs = searchParams.toString();
  const url = `${getApiBaseUrl()}${ENDPOINTS.cultivars}${qs ? `?${qs}` : ''}`;
  const res = await fetchWithAuth(url);
  const data = (await handleResponse<unknown>(res)) as {
    results?: CultivarListEntry[];
    next?: string | null;
    count?: number;
  };
  const results = Array.isArray(data?.results) ? data.results : [];
  const hasMore = !!data?.next;
  const count = typeof data?.count === 'number' ? data.count : results.length;
  return { results, hasMore, count };
}

/** Détail d'un cultivar (avec porte-greffes, pollinisateurs). */
export async function getCultivar(id: number): Promise<CultivarDetail> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.cultivars}${id}/`);
  return handleResponse<CultivarDetail>(res);
}

/** Nombre total d'espèces (sans filtres). Pour afficher "X / total". */
export async function getOrganismsCount(params?: {
  search?: string;
  type?: string;
  favoris?: boolean;
  soleil?: string;
  zone_usda?: number;
  fruits?: boolean;
  noix?: boolean;
  vigueur?: string;
  has_specimen?: boolean;
  garden?: number;
}): Promise<number> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.favoris) searchParams.set('favoris', '1');
  if (params?.soleil) searchParams.set('soleil', params.soleil);
  if (params?.zone_usda) searchParams.set('zone_usda', String(params.zone_usda));
  if (params?.fruits) searchParams.set('fruits', '1');
  if (params?.noix) searchParams.set('noix', '1');
  if (params?.vigueur) searchParams.set('vigueur', params.vigueur);
  if (params?.has_specimen) searchParams.set('has_specimen', '1');
  if (params?.garden != null) searchParams.set('garden', String(params.garden));
  const qs = searchParams.toString();
  const res = await fetchWithAuth(
    `${getApiBaseUrl()}${ENDPOINTS.organisms}count/${qs ? `?${qs}` : ''}`
  );
  const data = await handleResponse<{ count: number }>(res);
  return data?.count ?? 0;
}

export async function addOrganismFavorite(id: number): Promise<void> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.organisms}${id}/favoris/`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text();
    let err: { detail?: string };
    try {
      err = text ? (JSON.parse(text) as { detail?: string }) : {};
    } catch {
      throw new Error(`Erreur ${res.status}: ${text || res.statusText}`);
    }
    throw new Error(err.detail ?? `Erreur ${res.status}`);
  }
}

export async function removeOrganismFavorite(id: number): Promise<void> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.organisms}${id}/favoris/`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    let err: { detail?: string };
    try {
      err = text ? (JSON.parse(text) as { detail?: string }) : {};
    } catch {
      throw new Error(`Erreur ${res.status}: ${text || res.statusText}`);
    }
    throw new Error(err.detail ?? `Erreur ${res.status}`);
  }
}

export async function getOrganism(id: number): Promise<OrganismDetail> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.organisms}${id}/`);
  return handleResponse<OrganismDetail>(res);
}

export async function updateOrganism(id: number, data: Partial<OrganismUpdate>): Promise<OrganismDetail> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.organisms}${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return handleResponse<OrganismDetail>(res);
}

/** Résultat d'enrichissement pour une source (VASCAN, USDA, Botanipedia). */
export type EnrichResult = { success: boolean; message: string };

/** Enrichit un organisme depuis VASCAN, USDA et Botanipedia. Réservé aux staff. */
export async function enrichOrganism(id: number): Promise<{
  results: { vascan?: EnrichResult; usda?: EnrichResult; botanipedia?: EnrichResult };
}> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.organisms}${id}/enrich/`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return handleResponse<{ results: { vascan?: EnrichResult; usda?: EnrichResult; botanipedia?: EnrichResult } }>(res);
}

/** Erreur de validation API (400) avec données structurées (duplicate, similar) */
export class ApiValidationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiValidationError';
  }
}

export async function createOrganism(data: {
  nom_commun: string;
  nom_latin: string;
  type_organisme: string;
  force_create?: boolean;
}): Promise<OrganismMinimal> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.organisms}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(res.statusText || 'Erreur réseau');
  }
  if (!res.ok) {
    const err = parsed as Record<string, unknown>;
    const msg = (err.detail ?? err.message ?? `Erreur ${res.status}`) as string;
    throw new ApiValidationError(msg, res.status, err as Record<string, unknown>);
  }
  return parsed as OrganismMinimal;
}

// --- Gardens ---
export async function getGardens(): Promise<GardenMinimal[]> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.gardens}`);
  const data = await handleResponse<unknown>(res);
  return unwrapPaginated<GardenMinimal>(data);
}

export async function getGarden(id: number): Promise<GardenMinimal> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.gardens}${id}/`);
  return handleResponse<GardenMinimal>(res);
}

export async function getGardenWarnings(gardenId: number): Promise<GardenWarningsResponse> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.gardens}${gardenId}/warnings/`);
  return handleResponse<GardenWarningsResponse>(res);
}

export async function createGarden(data: GardenCreate): Promise<GardenMinimal> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.gardens}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nom: data.nom.trim(),
      ...(data.ville?.trim() && { ville: data.ville.trim() }),
      ...(data.adresse?.trim() && { adresse: data.adresse.trim() }),
    }),
  });
  return handleResponse<GardenMinimal>(res);
}

// --- Garden GCP (points de contrôle terrain) ---
export async function getGardenGCPs(gardenId: number): Promise<GardenGCP[]> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.gardens}${gardenId}/gcps/`);
  const data = await handleResponse<unknown>(res);
  return Array.isArray(data) ? data as GardenGCP[] : (data as { results?: GardenGCP[] }).results ?? [];
}

export interface GardenGCPCreate {
  label: string;
  latitude: number;
  longitude: number;
  photo?: { uri: string; type?: string; name?: string };
  date_capture?: string | null;
  notes?: string;
}

export async function createGardenGCP(gardenId: number, data: GardenGCPCreate): Promise<GardenGCP> {
  const formData = new FormData();
  formData.append('label', data.label);
  formData.append('latitude', String(data.latitude));
  formData.append('longitude', String(data.longitude));
  if (data.date_capture != null) formData.append('date_capture', data.date_capture);
  if (data.notes != null) formData.append('notes', data.notes);
  if (data.photo?.uri) {
    formData.append('photo', {
      uri: data.photo.uri,
      type: data.photo.type ?? 'image/jpeg',
      name: data.photo.name ?? 'photo.jpg',
    } as unknown as Blob & { uri: string; type: string; name: string });
  }
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}${ENDPOINTS.gardens}${gardenId}/gcps/`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    let err: ApiError;
    try {
      err = text ? (JSON.parse(text) as ApiError) : {};
    } catch {
      throw new Error(`Erreur ${res.status}: ${text || res.statusText}`);
    }
    throw new Error(String(err.detail ?? err.message ?? `Erreur ${res.status}`));
  }
  return res.json() as Promise<GardenGCP>;
}

export async function getGardenGCPsExportUrl(gardenId: number): Promise<string> {
  const token = await getAccessToken();
  const base = `${getApiBaseUrl()}${ENDPOINTS.gardens}${gardenId}/gcps/export/`;
  return token ? `${base}?access_token=${encodeURIComponent(token)}` : base;
}

// --- Reminders upcoming (page d'accueil) ---
export interface ReminderUpcoming {
  id: number;
  type_rappel: string;
  date_rappel: string;
  type_alerte: string;
  titre: string;
  description: string;
  is_overdue: boolean;
  recurrence_rule: string;
  specimen: {
    id: number;
    nom: string;
    organisme_nom: string;
    photo_url: string | null;
  };
}

export async function getRemindersUpcoming(): Promise<ReminderUpcoming[]> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.remindersUpcoming}`);
  return handleResponse<ReminderUpcoming[]>(res);
}

export async function updateSpecimenReminder(
  specimenId: number,
  reminderId: number,
  data: Partial<{ date_rappel: string; recurrence_rule: string }>
): Promise<Reminder> {
  const res = await fetchWithAuth(
    `${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/reminders/${reminderId}/`,
    { method: 'PATCH', body: JSON.stringify(data) }
  );
  return handleResponse<Reminder>(res);
}

export async function completeSpecimenReminder(
  specimenId: number,
  reminderId: number,
  createNext?: boolean
): Promise<{ detail: string }> {
  const res = await fetchWithAuth(
    `${getApiBaseUrl()}${ENDPOINTS.specimens}${specimenId}/reminders/${reminderId}/complete/`,
    { method: 'POST', body: JSON.stringify(createNext != null ? { create_next: createNext } : {}) }
  );
  return handleResponse<{ detail: string }>(res);
}

// --- User preferences (default garden) ---
// --- Profil utilisateur (moi) ---
export interface MeProfile {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff?: boolean;
  is_superuser?: boolean;
}

export async function getMe(): Promise<MeProfile> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.me.profile}`);
  return handleResponse<MeProfile>(res);
}

export async function updateMe(data: Partial<Pick<MeProfile, 'email' | 'first_name' | 'last_name'>>): Promise<MeProfile> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.me.profile}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<MeProfile>(res);
}

export async function changePassword(current_password: string, new_password: string): Promise<{ detail: string }> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.me.changePassword}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password, new_password }),
  });
  return handleResponse<{ detail: string }>(res);
}

// --- Admin : liste et modification des utilisateurs (staff / superuser) ---
export interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.admin.users}`);
  return handleResponse<AdminUser[]>(res);
}

export async function updateAdminUser(id: number, data: { is_staff?: boolean }): Promise<AdminUser> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.admin.userDetail(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<AdminUser>(res);
}

export interface UserPreferences {
  default_garden_id: number | null;
  /** Distance de pollinisation par défaut (m) pour les plants. */
  pollination_distance_max_default_m?: number | null;
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.me.preferences}`);
  return handleResponse<UserPreferences>(res);
}

export async function updateUserPreferences(data: Partial<UserPreferences>): Promise<UserPreferences> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.me.preferences}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<UserPreferences>(res);
}

// --- Admin (paramètres avancés, staff uniquement) ---
export interface RunAdminCommandOptions {
  enrich?: boolean;
  limit?: number;
  delay?: number;
  dry_run?: boolean;
  no_input?: boolean;
  curl?: boolean;
  insecure?: boolean;
  /** sync_radixsylva : premier tirage ou réalignement complet */
  full?: boolean;
  /** sync_radixsylva : ne pas lancer rebuild_search_vectors à la fin */
  no_rebuild_search?: boolean;
}

export interface RunAdminCommandResult {
  success: boolean;
  output: string;
  detail?: string;
}

export async function runAdminCommand(
  command: string,
  options: RunAdminCommandOptions = {}
): Promise<RunAdminCommandResult> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.admin.runCommand}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, options }),
  });
  const data = await handleResponse<RunAdminCommandResult>(res);
  return data;
}

export interface SpeciesStats {
  organism_count: number;
  global_enrichment_score_pct?: number | null;
}

export async function getSpeciesStats(): Promise<SpeciesStats> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.admin.speciesStats}`);
  return handleResponse<SpeciesStats>(res);
}

export interface ImportVascanFileResult {
  success: boolean;
  output: string;
  detail?: string;
}

export async function uploadVascanFile(file: {
  uri: string;
  name?: string;
  type?: string;
}): Promise<ImportVascanFileResult> {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name ?? 'vascan.txt',
    type: file.type ?? 'text/plain',
  } as unknown as Blob);
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.admin.importVascanFile}`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<ImportVascanFileResult>(res);
}

// --- Weather alerts (page d'accueil) ---
export interface WeatherAlert {
  type: string;
  icon: string;
  message: string;
  garden_nom: string;
}

export async function getWeatherAlerts(): Promise<WeatherAlert[]> {
  const res = await fetchWithAuth(`${getApiBaseUrl()}${ENDPOINTS.weatherAlerts}`);
  return handleResponse<WeatherAlert[]>(res);
}
