/**
 * Client API Jardin Biot
 * Appels REST vers le backend Django
 */

import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, ENDPOINTS } from '@/constants/config';
import type {
  SpecimenDetail,
  SpecimenList,
  SpecimenCreateUpdate,
  Event,
  EventCreate,
  Reminder,
  ReminderCreate,
  Photo,
  PhotoCreate,
  OrganismMinimal,
  OrganismDetail,
  OrganismUpdate,
  GardenMinimal,
  TokenPair,
  ApiError,
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

async function getAccessToken(): Promise<string | null> {
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
        res = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.auth.refresh}`, {
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
  const res = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.auth.token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await handleResponse<TokenPair>(res);
  await setTokens(data.access, data.refresh);
  return data;
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
    res = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.auth.verify}`, {
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
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.specimenByNfc(uid)}`);
  return handleResponse<SpecimenDetail>(res);
}

/** Returns specimen if found, null if tag is unknown (404). Throws on other errors. */
export async function getSpecimenByNfcOrNull(uid: string): Promise<SpecimenDetail | null> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.specimenByNfc(uid)}`);
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
}): Promise<SpecimenList[]> {
  const searchParams = new URLSearchParams();
  if (params?.garden) searchParams.set('garden', String(params.garden));
  if (params?.zone) searchParams.set('zone', params.zone);
  if (params?.statut) searchParams.set('statut', params.statut);
  if (params?.organisme) searchParams.set('organisme', String(params.organisme));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.favoris) searchParams.set('favoris', '1');
  if (params?.sante != null) searchParams.set('sante', String(params.sante));
  const qs = searchParams.toString();
  const url = `${API_BASE_URL}${ENDPOINTS.specimens}${qs ? `?${qs}` : ''}`;
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
}): Promise<number> {
  const searchParams = new URLSearchParams();
  if (params?.garden) searchParams.set('garden', String(params.garden));
  if (params?.zone) searchParams.set('zone', params.zone);
  if (params?.statut) searchParams.set('statut', params.statut);
  if (params?.favoris) searchParams.set('favoris', '1');
  if (params?.sante != null) searchParams.set('sante', String(params.sante));
  const qs = searchParams.toString();
  const res = await fetchWithAuth(
    `${API_BASE_URL}${ENDPOINTS.specimens}count/${qs ? `?${qs}` : ''}`
  );
  const data = await handleResponse<{ count: number }>(res);
  return data?.count ?? 0;
}

export async function getSpecimenZones(): Promise<string[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.specimens}zones/`);
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
    `${API_BASE_URL}${ENDPOINTS.specimens}nearby/?${searchParams.toString()}`
  );
  return handleResponse<SpecimenList[]>(res);
}

export async function addSpecimenFavorite(id: number): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.specimens}${id}/favoris/`, {
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
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.specimens}${id}/favoris/`, {
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
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.specimens}${id}/`);
  return handleResponse<SpecimenDetail>(res);
}

export async function createSpecimen(data: SpecimenCreateUpdate): Promise<SpecimenDetail> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.specimens}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<SpecimenDetail>(res);
}

export async function updateSpecimen(id: number, data: Partial<SpecimenCreateUpdate>): Promise<SpecimenDetail> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.specimens}${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return handleResponse<SpecimenDetail>(res);
}

export async function duplicateSpecimen(id: number): Promise<SpecimenDetail> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.specimens}${id}/duplicate/`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return handleResponse<SpecimenDetail>(res);
}

// --- Specimen events ---
export async function getSpecimenEvents(specimenId: number): Promise<Event[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/events/`);
  return handleResponse<Event[]>(res);
}

export async function createSpecimenEvent(specimenId: number, data: EventCreate): Promise<Event> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/events/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<Event>(res);
}

export async function getSpecimenEvent(specimenId: number, eventId: number): Promise<Event> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/events/${eventId}/`);
  return handleResponse<Event>(res);
}

export async function updateSpecimenEvent(
  specimenId: number,
  eventId: number,
  data: Partial<EventCreate>
): Promise<Event> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/events/${eventId}/`, {
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
    `${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/events/${eventId}/apply-to-zone-preview/`
  );
  return handleResponse<{ zone: string | null; count: number }>(res);
}

export async function applyEventToZone(
  specimenId: number,
  eventId: number
): Promise<{ created: number; zone: string }> {
  const res = await fetchWithAuth(
    `${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/events/${eventId}/apply-to-zone/`,
    { method: 'POST' }
  );
  return handleResponse<{ created: number; zone: string }>(res);
}

// --- Specimen reminders ---
export async function getSpecimenReminders(specimenId: number): Promise<Reminder[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/reminders/`);
  return handleResponse<Reminder[]>(res);
}

export async function createSpecimenReminder(specimenId: number, data: ReminderCreate): Promise<Reminder> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/reminders/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return handleResponse<Reminder>(res);
}

export async function deleteSpecimenReminder(specimenId: number, reminderId: number): Promise<void> {
  const res = await fetchWithAuth(
    `${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/reminders/${reminderId}/`,
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
  const url = `${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/events/${eventId}/`;
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
    `${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/events/${eventId}/photos/`
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
    `${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/events/${eventId}/photos/`,
    { method: 'POST', headers, body: formData }
  );
  return handleResponse<Photo>(res);
}

// --- Specimen photos ---
export async function getSpecimenPhotos(specimenId: number): Promise<Photo[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/photos/`);
  return handleResponse<Photo[]>(res);
}

export async function setSpecimenDefaultPhoto(specimenId: number, photoId: number): Promise<void> {
  const res = await fetchWithAuth(
    `${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/photos/${photoId}/set-default/`,
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
    `${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/photos/${photoId}/`,
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
  apiBaseUrl: string = API_BASE_URL
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
    `${API_BASE_URL}${ENDPOINTS.organisms}${organismId}/photos/`,
    { method: 'POST', body: formData }
  );
  return handleResponse<Photo>(res);
}

export async function uploadOrganismPhotoFromUrl(
  organismId: number,
  data: { image_url: string; titre?: string; type_photo?: string }
): Promise<Photo> {
  const res = await fetchWithAuth(
    `${API_BASE_URL}${ENDPOINTS.organisms}${organismId}/photos/`,
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
    `${API_BASE_URL}${ENDPOINTS.organisms}${organismId}/photos/${photoId}/set-default/`,
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
export async function getOrganismInconnu(): Promise<OrganismMinimal> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.organisms}inconnu/`);
  return handleResponse<OrganismMinimal>(res);
}

export async function getOrganisms(params?: { search?: string; type?: string }): Promise<OrganismMinimal[]> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.type) searchParams.set('type', params.type);
  const qs = searchParams.toString();
  const url = `${API_BASE_URL}${ENDPOINTS.organisms}${qs ? `?${qs}` : ''}`;
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
  if (params?.has_specimen) searchParams.set('has_specimen', '1');
  if (params?.garden != null) searchParams.set('garden', String(params.garden));
  const qs = searchParams.toString();
  const url = `${API_BASE_URL}${ENDPOINTS.organisms}${qs ? `?${qs}` : ''}`;
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

/** Nombre total d'espèces (sans filtres). Pour afficher "X / total". */
export async function getOrganismsCount(params?: {
  search?: string;
  type?: string;
  favoris?: boolean;
  soleil?: string;
  zone_usda?: number;
  fruits?: boolean;
  noix?: boolean;
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
  if (params?.has_specimen) searchParams.set('has_specimen', '1');
  if (params?.garden != null) searchParams.set('garden', String(params.garden));
  const qs = searchParams.toString();
  const res = await fetchWithAuth(
    `${API_BASE_URL}${ENDPOINTS.organisms}count/${qs ? `?${qs}` : ''}`
  );
  const data = await handleResponse<{ count: number }>(res);
  return data?.count ?? 0;
}

export async function addOrganismFavorite(id: number): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.organisms}${id}/favoris/`, {
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
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.organisms}${id}/favoris/`, {
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
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.organisms}${id}/`);
  return handleResponse<OrganismDetail>(res);
}

export async function updateOrganism(id: number, data: Partial<OrganismUpdate>): Promise<OrganismDetail> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.organisms}${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return handleResponse<OrganismDetail>(res);
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
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.organisms}`, {
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
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.gardens}`);
  const data = await handleResponse<unknown>(res);
  return unwrapPaginated<GardenMinimal>(data);
}

export async function getGarden(id: number): Promise<GardenMinimal> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.gardens}${id}/`);
  return handleResponse<GardenMinimal>(res);
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
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.remindersUpcoming}`);
  return handleResponse<ReminderUpcoming[]>(res);
}

export async function updateSpecimenReminder(
  specimenId: number,
  reminderId: number,
  data: Partial<{ date_rappel: string; recurrence_rule: string }>
): Promise<Reminder> {
  const res = await fetchWithAuth(
    `${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/reminders/${reminderId}/`,
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
    `${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/reminders/${reminderId}/complete/`,
    { method: 'POST', body: JSON.stringify(createNext != null ? { create_next: createNext } : {}) }
  );
  return handleResponse<{ detail: string }>(res);
}

// --- User preferences (default garden) ---
export interface UserPreferences {
  default_garden_id: number | null;
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.me.preferences}`);
  return handleResponse<UserPreferences>(res);
}

export async function updateUserPreferences(data: UserPreferences): Promise<UserPreferences> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.me.preferences}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return handleResponse<UserPreferences>(res);
}

// --- Weather alerts (page d'accueil) ---
export interface WeatherAlert {
  type: string;
  icon: string;
  message: string;
  garden_nom: string;
}

export async function getWeatherAlerts(): Promise<WeatherAlert[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.weatherAlerts}`);
  return handleResponse<WeatherAlert[]>(res);
}
