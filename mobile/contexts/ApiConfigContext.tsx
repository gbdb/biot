import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getDefaultApiBaseUrl, setOverrideApiBaseUrl } from '@/constants/config';

const STORAGE_KEY_API_BASE_URL = 'jardinbiot_api_base_url';

type ApiConfigContextType = {
  /** URL du serveur actuellement utilisée (override ou défaut). */
  apiBaseUrl: string;
  /** URL par défaut (build). */
  defaultApiBaseUrl: string;
  /** Enregistrer une URL personnalisée, ou null pour rétablir le défaut. */
  setApiBaseUrlOverride: (url: string | null) => Promise<void>;
  /** true une fois le stockage chargé (évite une requête avec la mauvaise URL). */
  loaded: boolean;
};

const ApiConfigContext = createContext<ApiConfigContextType | null>(null);

export function ApiConfigProvider({ children }: { children: React.ReactNode }) {
  const defaultApiBaseUrl = getDefaultApiBaseUrl();
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>(defaultApiBaseUrl);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(STORAGE_KEY_API_BASE_URL)
      .then((stored) => {
        if (cancelled) return;
        if (stored && stored.trim()) {
          const url = stored.trim().replace(/\/$/, '');
          setOverrideApiBaseUrl(url);
          setApiBaseUrlState(url);
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setApiBaseUrlOverride = useCallback(async (url: string | null) => {
    if (url === null || !url.trim()) {
      await SecureStore.deleteItemAsync(STORAGE_KEY_API_BASE_URL);
      setOverrideApiBaseUrl(null);
      setApiBaseUrlState(getDefaultApiBaseUrl());
    } else {
      const normalized = url.trim().replace(/\/$/, '');
      await SecureStore.setItemAsync(STORAGE_KEY_API_BASE_URL, normalized);
      setOverrideApiBaseUrl(normalized);
      setApiBaseUrlState(normalized);
    }
  }, []);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f0' }}>
        <ActivityIndicator size="large" color="#1a3c27" />
      </View>
    );
  }

  return (
    <ApiConfigContext.Provider
      value={{
        apiBaseUrl,
        defaultApiBaseUrl,
        setApiBaseUrlOverride,
        loaded,
      }}
    >
      {children}
    </ApiConfigContext.Provider>
  );
}

export function useApiConfig() {
  const ctx = useContext(ApiConfigContext);
  if (!ctx) throw new Error('useApiConfig must be used within ApiConfigProvider');
  return ctx;
}
