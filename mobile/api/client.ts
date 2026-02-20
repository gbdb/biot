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
    throw new Error(err.detail || err.message || `Erreur ${res.status}`);
  }
  return data as T;
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
  const token = await getAccessToken();
  if (!token) return false;
  const res = await fetch(`${API_BASE_URL}${ENDPOINTS.auth.verify}`, {
    method: 'POST',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return res.ok;
}

// --- NFC lookup ---
export async function getSpecimenByNfc(uid: string): Promise<SpecimenDetail> {
  const res = await fetch(`${API_BASE_URL}${ENDPOINTS.specimenByNfc(uid)}`, {
    headers: await authHeaders(),
  });
  return handleResponse<SpecimenDetail>(res);
}

// --- Specimens ---
export async function getSpecimens(params?: {
  garden?: number;
  zone?: string;
  statut?: string;
  organisme?: number;
  search?: string;
}): Promise<SpecimenList[]> {
  const searchParams = new URLSearchParams();
  if (params?.garden) searchParams.set('garden', String(params.garden));
  if (params?.zone) searchParams.set('zone', params.zone);
  if (params?.statut) searchParams.set('statut', params.statut);
  if (params?.organisme) searchParams.set('organisme', String(params.organisme));
  if (params?.search) searchParams.set('search', params.search);
  const qs = searchParams.toString();
  const url = `${API_BASE_URL}${ENDPOINTS.specimens}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: await authHeaders() });
  return handleResponse<SpecimenList[]>(res);
}

export async function getSpecimen(id: number): Promise<SpecimenDetail> {
  const res = await fetch(`${API_BASE_URL}${ENDPOINTS.specimens}${id}/`, {
    headers: await authHeaders(),
  });
  return handleResponse<SpecimenDetail>(res);
}

export async function createSpecimen(data: SpecimenCreateUpdate): Promise<SpecimenDetail> {
  const res = await fetch(`${API_BASE_URL}${ENDPOINTS.specimens}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<SpecimenDetail>(res);
}

export async function updateSpecimen(id: number, data: Partial<SpecimenCreateUpdate>): Promise<SpecimenDetail> {
  const res = await fetch(`${API_BASE_URL}${ENDPOINTS.specimens}${id}/`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<SpecimenDetail>(res);
}

export async function duplicateSpecimen(id: number): Promise<SpecimenDetail> {
  const res = await fetch(`${API_BASE_URL}${ENDPOINTS.specimens}${id}/duplicate/`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({}),
  });
  return handleResponse<SpecimenDetail>(res);
}

// --- Specimen events ---
export async function getSpecimenEvents(specimenId: number): Promise<Event[]> {
  const res = await fetch(`${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/events/`, {
    headers: await authHeaders(),
  });
  return handleResponse<Event[]>(res);
}

export async function createSpecimenEvent(specimenId: number, data: EventCreate): Promise<Event> {
  const res = await fetch(`${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/events/`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<Event>(res);
}

// --- Specimen photos ---
export async function getSpecimenPhotos(specimenId: number): Promise<Photo[]> {
  const res = await fetch(`${API_BASE_URL}${ENDPOINTS.specimens}${specimenId}/photos/`, {
    headers: await authHeaders(),
  });
  return handleResponse<Photo[]>(res);
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
export async function getOrganisms(params?: { search?: string; type?: string }): Promise<OrganismMinimal[]> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.type) searchParams.set('type', params.type);
  const qs = searchParams.toString();
  const url = `${API_BASE_URL}${ENDPOINTS.organisms}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: await authHeaders() });
  return handleResponse<OrganismMinimal[]>(res);
}

// --- Gardens ---
export async function getGardens(): Promise<GardenMinimal[]> {
  const res = await fetch(`${API_BASE_URL}${ENDPOINTS.gardens}`, {
    headers: await authHeaders(),
  });
  return handleResponse<GardenMinimal[]>(res);
}
