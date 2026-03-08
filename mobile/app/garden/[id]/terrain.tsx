import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useGlobalSearchParams } from 'expo-router';
import { Linking } from 'react-native';
import { getSpecimens, getGardenWarnings, getGardenGCPs, getGarden, getGardenGCPsExportUrl, getAccessToken } from '@/api/client';
import { API_BASE_URL } from '@/constants/config';
import { SPECIMEN_STATUT_EMOJI } from '@/types/api';
import type { SpecimenList, SpecimenStatut, CesiumOverlap } from '@/types/api';
import { OverlapWarning } from '@/components/terrain/OverlapWarning';

export default function TerrainScreen() {
  const { id: gardenId, placement, organism_id, cultivar_id } = useGlobalSearchParams<{
    id: string;
    placement?: string;
    organism_id?: string;
    cultivar_id?: string;
  }>();
  const webViewRef = useRef<WebView | null>(null);
  const [cesiumReady, setCesiumReady] = useState(false);
  const [cesiumUri, setCesiumUri] = useState<string | null>(null);
  const [gardenName, setGardenName] = useState<string>('');
  const [overlaps, setOverlaps] = useState<CesiumOverlap[]>([]);
  const [specimens, setSpecimens] = useState<SpecimenList[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const placementActive = placement === '1' && organism_id && gardenId;

  useEffect(() => {
    if (!gardenId) return;
    const gid = parseInt(gardenId, 10);
    if (isNaN(gid)) return;
    let cancelled = false;
    getAccessToken().then((token) => {
      if (cancelled) return;
      const uri = token
        ? `${API_BASE_URL}/cesium-view/?garden_id=${gardenId}&access_token=${token}`
        : `${API_BASE_URL}/cesium-view/?garden_id=${gardenId}`;
      setCesiumUri(uri);
    });
    getGarden(gid).then((g) => !cancelled && setGardenName(g.nom)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [gardenId]);

  useEffect(() => {
    if (!gardenId) return;
    const numId = parseInt(gardenId, 10);
    if (isNaN(numId)) return;
    getSpecimens({ garden: numId, page_size: 100 })
      .then(setSpecimens)
      .catch(() => setSpecimens([]));
  }, [gardenId]);

  const sendToCesium = useCallback((type: string, payload: object) => {
    const msg = JSON.stringify({ type, payload });
    webViewRef.current?.injectJavaScript(
      `(function(){try{if(window.receiveFromRN){window.receiveFromRN(${JSON.stringify(msg)});}}catch(e){}})();`
    );
  }, []);

  useEffect(() => {
    if (!cesiumReady) return;
    if (placementActive) {
      sendToCesium('SET_PLACEMENT_MODE', {
        active: true,
        organismId: organism_id ? parseInt(String(organism_id), 10) : null,
        cultivarId: cultivar_id ? parseInt(String(cultivar_id), 10) : null,
      });
    }
  }, [cesiumReady, placementActive, organism_id, cultivar_id, sendToCesium]);

  useEffect(() => {
    if (!cesiumReady) return;
    const t = setTimeout(() => sendToCesium('FLY_HOME', {}), 600);
    return () => clearTimeout(t);
  }, [cesiumReady, sendToCesium]);

  useEffect(() => {
    if (!cesiumReady || !gardenId) return;
    const numId = parseInt(gardenId, 10);
    if (isNaN(numId)) return;
    const specimenPayload = specimens.map((s) => ({
      id: s.id,
      nom: s.nom,
      organisme_nom: s.organisme_nom,
      organisme_nom_latin: s.organisme_nom_latin,
      latitude: s.latitude,
      longitude: s.longitude,
      health: s.sante,
      emoji: SPECIMEN_STATUT_EMOJI[s.statut as SpecimenStatut] ?? '🌱',
      statut: s.statut,
      rayon_adulte_m: s.rayon_adulte_m ?? null,
    }));
    sendToCesium('LOAD_SPECIMENS', { specimens: specimenPayload });
    getGardenWarnings(numId)
      .then((w) => sendToCesium('LOAD_WARNINGS', w))
      .catch(() => {});
    getGardenGCPs(numId)
      .then((gcps) => sendToCesium('LOAD_GCPs', { gcps }))
      .catch(() => {});
  }, [cesiumReady, gardenId, specimens, sendToCesium]);

  const onMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        const type = msg.type ?? msg.payload?.type;
        const payload = msg.payload ?? msg;
        if (type === 'CESIUM_READY') setCesiumReady(true);
        if ((type === 'SPECIMEN_OPEN_FICHE' || type === 'SPECIMEN_TAPPED') && payload?.specimenId != null) {
          router.push(`/specimen/${payload.specimenId}`);
        }
        if (type === 'OVERLAPS_DETECTED' && Array.isArray(payload?.overlaps)) {
          setOverlaps(payload.overlaps);
        }
        if (type === 'OPEN_GCP_CREATE') {
          router.push(`/garden/${gardenId}/gcp-create`);
        }
        if (type === 'OPEN_GCP_EXPORT' && payload?.gardenId) {
          getGardenGCPsExportUrl(payload.gardenId).then((url) => Linking.openURL(url));
        }
        if (type === 'PLACEMENT_TAP' && payload?.lat != null && payload?.lng != null && placementActive) {
          router.push({
            pathname: '/specimen/create',
            params: {
              organisme: organism_id,
              garden: gardenId,
              cultivar: cultivar_id ?? '',
              latitude: String(payload.lat),
              longitude: String(payload.lng),
            },
          });
        }
      } catch {
        // ignore
      }
    },
    [gardenId]
  );

  if (!cesiumUri) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a3c27" />
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: cesiumUri }}
        onMessage={onMessage}
        onError={() => setLoadError('Impossible de charger la carte')}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        style={styles.webview}
      />
      {overlaps.map((o) => (
        <OverlapWarning
          key={`${o.a}-${o.b}`}
          overlap={o}
          specimens={specimens}
          onDismiss={() => setOverlaps((prev) => prev.filter((x) => !(x.a === o.a && x.b === o.b)))}
        />
      ))}
      {loadError ? (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>{loadError}</Text>
        </View>
      ) : !cesiumReady && (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#ede8dc" />
          <Text style={styles.loadingText}>{gardenName ? `Terrain · ${gardenName}` : 'Chargement du terrain…'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    ...StyleSheet.absoluteFillObject,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f0',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 8,
  },
});
