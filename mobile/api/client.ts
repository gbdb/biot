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

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  if (!refresh) return null;
  const res = await fetch(`${API_BASE_URL}${ENDPOINTS.auth.refresh}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    await clearTokens();
    return null;
  }
  const data = (await res.json()) as { access: string };
  await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, data.access);
  return data.access;
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
  const res = await fetch(`${API_BASE_URL}${ENDPOINTS.auth.token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await handleResponse<TokenPair>(res);
  await setTokens(data.access, data.refresh);
  return data;
}

export async function logout(): Promise<void> {
  await clearTokens();
}

export async function isAuthenticated(): Promise<boolean> {
  let token = await getAccessToken();
  if (!token) {
    token = await refreshAccessToken();
    if (!token) return false;
  }
  let res = await fetch(`${API_BASE_URL}${ENDPOINTS.auth.verify}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ token }),
  });
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

export async function getSpecimenZones(): Promise<string[]> {
  const res = await fetchWithAuth(`${API_BASE_URL}${ENDPOINTS.specimens}zones/`);
  return handleResponse<string[]>(res);
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
  if (data.titre) formData.append('titre', data.titre);
  if (data.description) formData.append('description', data.description);
  if (data.date_prise) formData.append('date_prise', data.date_prise);

  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  // FormData sets Content-Type with boundary; don't override

  const res = await fetch(`${apiBaseUrl}${ENDPOINTS.specimens}${specimenId}/photos/`, {
    method: 'POST',
    headers,
    body: formData,
  });
  return handleResponse<Photo>(res);
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

/** Liste paginée pour infinite scroll. Retourne results + hasMore. */
export async function getOrganismsPaginated(params?: {
  search?: string;
  type?: string;
  page?: number;
  favoris?: boolean;
  soleil?: string;
  zone_usda?: number;
  fruits?: boolean;
  noix?: boolean;
}): Promise<{ results: OrganismMinimal[]; hasMore: boolean }> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.favoris) searchParams.set('favoris', '1');
  if (params?.soleil) searchParams.set('soleil', params.soleil);
  if (params?.zone_usda) searchParams.set('zone_usda', String(params.zone_usda));
  if (params?.fruits) searchParams.set('fruits', '1');
  if (params?.noix) searchParams.set('noix', '1');
  const qs = searchParams.toString();
  const url = `${API_BASE_URL}${ENDPOINTS.organisms}${qs ? `?${qs}` : ''}`;
  const res = await fetchWithAuth(url);
  const data = (await handleResponse<unknown>(res)) as { results?: OrganismMinimal[]; next?: string | null };
  const results = Array.isArray(data?.results) ? data.results : [];
  const hasMore = !!data?.next;
  return { results, hasMore };
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
