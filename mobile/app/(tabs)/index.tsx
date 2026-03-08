import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { getSpecimens, getSpecimensNearby, getRemindersUpcoming, getWeatherAlerts, getRecentEvents, getUserPreferences, ensureValidToken } from '@/api/client';
import { ActionToolbar } from '@/components/ActionToolbar';
import { ReminderActionModal } from '@/components/ReminderActionModal';
import { WarningsBlock } from '@/components/WarningsBlock';
import { AddEventModal } from '@/components/AddEventModal';
import type { SpecimenList, Event } from '@/types/api';
import type { RecentEvent } from '@/types/api';
import type { ReminderUpcoming, WeatherAlert } from '@/api/client';
import { EVENT_TYPE_LABELS } from '@/types/api';

const COLS = 4;
const THUMB_GAP = 8;

const WEATHER_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  warning: 'warning-outline',
  snowflake: 'snow-outline',
  thermometer: 'thermometer-outline',
  water: 'water-outline',
};

export default function HomeScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [favoris, setFavoris] = useState<SpecimenList[]>([]);
  const [nearby, setNearby] = useState<SpecimenList[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [reminders, setReminders] = useState<ReminderUpcoming[]>([]);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [loadingFavoris, setLoadingFavoris] = useState(true);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [remindersError, setRemindersError] = useState<string | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<ReminderUpcoming | null>(null);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loadingRecentEvents, setLoadingRecentEvents] = useState(true);
  const [recentEventsError, setRecentEventsError] = useState<string | null>(null);
  const [defaultGardenId, setDefaultGardenId] = useState<number | null>(null);
  const [phenologyModal, setPhenologyModal] = useState<{ specimenId: number; type: 'floraison' | 'fructification' | 'recolte' } | null>(null);
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [warningsRefreshTrigger, setWarningsRefreshTrigger] = useState(0);

  const fetchNearby = useCallback(async () => {
    setLoadingNearby(true);
    setNearbyError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setNearbyError('Localisation non autorisée');
        setNearby([]);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const list = await getSpecimensNearby({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        radius: 1000,
        limit: 4,
      });
      setNearby(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setNearbyError(
        msg.includes('Localisation') || msg.includes('authorized')
          ? 'Localisation non autorisée'
          : 'Position ou connexion indisponible'
      );
      setNearby([]);
    } finally {
      setLoadingNearby(false);
    }
  }, []);

  const fetchFavoris = useCallback(async () => {
    setLoadingFavoris(true);
    try {
      const list = await getSpecimens({ favoris: true });
      setFavoris(list);
    } catch {
      setFavoris([]);
    } finally {
      setLoadingFavoris(false);
    }
  }, []);

  const fetchReminders = useCallback(async () => {
    setLoadingReminders(true);
    setRemindersError(null);
    try {
      const list = await getRemindersUpcoming();
      setReminders(list);
    } catch {
      setReminders([]);
      setRemindersError('Rappels indisponibles. Vérifiez la connexion et réessayez.');
    } finally {
      setLoadingReminders(false);
    }
  }, []);

  const fetchWeatherAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      const list = await getWeatherAlerts();
      setWeatherAlerts(list);
    } catch {
      setWeatherAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  const fetchRecentEvents = useCallback(async () => {
    setLoadingRecentEvents(true);
    setRecentEventsError(null);
    try {
      const list = await getRecentEvents({ limit: 6 });
      setRecentEvents(list);
    } catch (err) {
      setRecentEvents([]);
      setRecentEventsError(err instanceof Error ? err.message : 'Impossible de charger les événements');
    } finally {
      setLoadingRecentEvents(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      ensureValidToken().then((ok) => {
        if (cancelled || !ok) return;
        getUserPreferences().then((prefs) => {
          if (!cancelled) setDefaultGardenId(prefs.default_garden_id);
        });
        fetchFavoris();
        fetchNearby();
        fetchReminders();
        fetchWeatherAlerts();
        fetchRecentEvents();
      });
      return () => {
        cancelled = true;
      };
    }, [fetchFavoris, fetchNearby, fetchReminders, fetchWeatherAlerts, fetchRecentEvents])
  );


  const containerWidth = screenWidth - 48;
  const thumbSize = (containerWidth - (COLS - 1) * THUMB_GAP) / COLS;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>🌳 Jardin Biot</Text>

      {/* Warnings (rappels en retard, pollinisateurs manquants, phénologie) */}
      <WarningsBlock
        defaultGardenId={defaultGardenId}
        refreshTrigger={warningsRefreshTrigger}
        onConfirmPhenology={(specimenId, typePeriode) =>
          setPhenologyModal({ specimenId, type: typePeriode })
        }
        onWarningsChange={() => setWarningsRefreshTrigger((t) => t + 1)}
      />

      {/* Alertes météo (avant les rappels) */}
      {loadingAlerts ? (
        <ActivityIndicator size="small" color="#1a3c27" style={styles.sectionLoader} />
      ) : weatherAlerts.length > 0 ? (
        <View style={styles.weatherSection}>
          <Text style={styles.sectionTitle}>Alertes météo</Text>
          <View style={styles.weatherAlertsRow}>
            {weatherAlerts.slice(0, 5).map((a, i) => (
              <View key={i} style={styles.weatherAlertChip}>
                <Ionicons
                  name={WEATHER_ICONS[a.icon] || 'warning-outline'}
                  size={20}
                  color="#c44"
                />
                <Text style={styles.weatherAlertText} numberOfLines={2}>
                  {a.message}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Rappels à venir */}
      {loadingReminders ? (
        <ActivityIndicator size="small" color="#1a3c27" style={styles.sectionLoader} />
      ) : remindersError ? (
        <View style={styles.remindersSection}>
          <Text style={styles.sectionTitle}>Rappels</Text>
          <Text style={styles.remindersErrorText}>{remindersError}</Text>
          <TouchableOpacity onPress={fetchReminders} style={styles.retryButton}>
            <Ionicons name="refresh-outline" size={18} color="#1a3c27" />
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.remindersSection}>
          <View style={styles.remindersHeader}>
            <Text style={styles.sectionTitle}>Rappels</Text>
            <TouchableOpacity
              onPress={() => router.push('/reminders')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.seeAllButton}
            >
              <Ionicons name="list" size={20} color="#4a6741" />
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          {reminders.length > 0 && (
            <View style={[styles.remindersGrid, { width: containerWidth }]}>
              {reminders.slice(0, 4).map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.reminderThumb, { width: thumbSize }]}
                  onPress={() => setSelectedReminder(r)}
                  activeOpacity={0.8}
                >
                  <View style={styles.reminderThumbInner}>
                    {r.specimen.photo_url ? (
                      <Image
                        source={{ uri: r.specimen.photo_url }}
                        style={[styles.reminderImage, { width: thumbSize, height: thumbSize }]}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.reminderPlaceholder, { width: thumbSize, height: thumbSize }]}>
                        <Text style={styles.reminderPlaceholderText}>⏰</Text>
                      </View>
                    )}
                    {r.is_overdue && (
                      <View style={styles.reminderOverdueBadge}>
                        <Ionicons name="warning" size={14} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.reminderDate, r.is_overdue && styles.reminderDateOverdue]}>{r.date_rappel}</Text>
                  <Text style={styles.reminderName} numberOfLines={2}>
                    {r.specimen.nom}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <ReminderActionModal
            visible={selectedReminder != null}
            reminder={selectedReminder}
            onClose={() => setSelectedReminder(null)}
            onAction={fetchReminders}
            onOpenSpecimen={(id) => {
              setSelectedReminder(null);
              router.push(`/specimen/${id}`);
            }}
          />
        </View>
      )}

      {/* À proximité */}
      {loadingNearby ? (
        <ActivityIndicator size="small" color="#1a3c27" style={styles.sectionLoader} />
      ) : nearby.length > 0 ? (
        <View style={styles.nearbySection}>
          <View style={styles.nearbyHeader}>
            <Text style={styles.sectionTitle}>À proximité</Text>
            <TouchableOpacity
              onPress={() => router.push('/specimens/nearby')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.seeAllButton}
            >
              <Ionicons name="list" size={20} color="#4a6741" />
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.nearbyGrid, { width: containerWidth }]}>
            {nearby.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.nearbyThumb, { width: thumbSize }]}
                onPress={() => router.push(`/specimen/${s.id}`)}
                activeOpacity={0.8}
              >
                {s.photo_principale_url ? (
                  <Image
                    source={{ uri: s.photo_principale_url }}
                    style={[styles.nearbyImage, { width: thumbSize, height: thumbSize }]}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.nearbyPlaceholder, { width: thumbSize, height: thumbSize }]}>
                    <Text style={styles.nearbyPlaceholderText}>📍</Text>
                  </View>
                )}
                <Text style={styles.nearbyName} numberOfLines={2}>
                  {s.nom}
                </Text>
                {s.distance_km != null && (
                  <Text style={styles.nearbyDistance}>
                    {s.distance_km < 0.1
                      ? `${Math.round(s.distance_km * 1000)} m`
                      : `${s.distance_km.toFixed(2)} km`}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : nearbyError ? (
        <View style={styles.nearbySection}>
          <Text style={styles.nearbyError}>📍 {nearbyError}</Text>
          <TouchableOpacity onPress={() => router.push('/specimens/nearby')} style={styles.nearbyErrorLink}>
            <Text style={styles.nearbyErrorLinkText}>Essayer quand même</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Favoris */}
      {loadingFavoris ? (
        <ActivityIndicator size="small" color="#1a3c27" style={styles.favorisLoader} />
      ) : favoris.length > 0 ? (
        <View style={styles.favorisSection}>
          <Text style={styles.favorisTitle}>Favoris</Text>
          <View style={[styles.favorisGrid, { width: containerWidth }]}>
            {favoris.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.favoriThumb, { width: thumbSize }]}
                onPress={() => router.push(`/specimen/${s.id}`)}
                activeOpacity={0.8}
              >
                {s.photo_principale_url ? (
                  <Image
                    source={{ uri: s.photo_principale_url }}
                    style={[styles.favoriImage, { width: thumbSize, height: thumbSize }]}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.favoriPlaceholder, { width: thumbSize, height: thumbSize }]}>
                    <Text style={styles.favoriPlaceholderText}>🌿</Text>
                  </View>
                )}
                <Text style={styles.favoriName} numberOfLines={2}>
                  {s.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {/* Événements récents — toujours visible pour que l’utilisateur voie la section */}
      <View style={styles.recentEventsSection}>
        <View style={styles.recentEventsHeader}>
          <Text style={styles.favorisTitle}>Événements récents</Text>
          <TouchableOpacity
            onPress={() => router.push('/events/recent')}
            style={styles.voirToutButton}
          >
            <Text style={styles.voirToutText}>Voir tout</Text>
            <Ionicons name="chevron-forward" size={18} color="#1a3c27" />
          </TouchableOpacity>
        </View>
        {loadingRecentEvents ? (
          <ActivityIndicator size="small" color="#1a3c27" style={styles.favorisLoader} />
        ) : recentEventsError ? (
          <Text style={styles.recentEventsErrorText}>{recentEventsError}</Text>
        ) : recentEvents.length === 0 ? (
          <Text style={styles.recentEventsEmptyText}>Aucun événement récent</Text>
        ) : (
          <View style={[styles.favorisGrid, { width: containerWidth }]}>
            {recentEvents.slice(0, 6).map((ev) => (
              <TouchableOpacity
                key={`${ev.specimen_id}-${ev.event_id}`}
                style={[styles.favoriThumb, { width: thumbSize }]}
                onPress={() => router.push(`/specimen/${ev.specimen_id}`)}
                activeOpacity={0.8}
              >
                {ev.photo_url ? (
                  <Image
                    source={{ uri: ev.photo_url }}
                    style={[styles.favoriImage, { width: thumbSize, height: thumbSize }]}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.favoriPlaceholder, { width: thumbSize, height: thumbSize }]}>
                    <Text style={styles.favoriPlaceholderText}>
                      {EVENT_TYPE_LABELS[ev.type_event as keyof typeof EVENT_TYPE_LABELS]?.slice(0, 1) ?? '📅'}
                    </Text>
                  </View>
                )}
                <Text style={styles.favoriName} numberOfLines={2}>
                  {ev.specimen_nom}
                </Text>
                <Text style={styles.recentEventMeta} numberOfLines={1}>
                  {EVENT_TYPE_LABELS[ev.type_event as keyof typeof EVENT_TYPE_LABELS]} — {ev.date}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <ActionToolbar
        actions={[
          { icon: 'barcode-outline', href: '/scan', variant: 'primary' },
          { icon: 'add-circle-outline', href: '/specimen/create', variant: 'secondary' },
          { icon: 'eye-outline', href: '/observation/quick', variant: 'secondary' },
        ]}
      />

      {phenologyModal && (
        <AddEventModal
          visible
          specimenId={phenologyModal.specimenId}
          onClose={() => setPhenologyModal(null)}
          onSuccess={(_event: Event) => {
            setPhenologyModal(null);
            setWarningsRefreshTrigger((t) => t + 1);
          }}
          submitting={eventSubmitting}
          setSubmitting={setEventSubmitting}
          initialTypeEvent={phenologyModal.type}
          initialDate={new Date().toISOString().slice(0, 10)}
          eventOnly
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a3c27',
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionLoader: {
    marginBottom: 16,
  },
  favorisLoader: {
    marginBottom: 20,
  },
  recentEventsSection: {
    marginBottom: 24,
  },
  recentEventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  voirToutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voirToutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a3c27',
  },
  recentEventMeta: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  recentEventsErrorText: {
    fontSize: 14,
    color: '#c44',
    marginBottom: 8,
  },
  recentEventsEmptyText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  weatherSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a3c27',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  weatherAlertsRow: {
    gap: 8,
  },
  weatherAlertChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff5f5',
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#c44',
  },
  weatherAlertText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },
  remindersSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  remindersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  remindersErrorText: {
    fontSize: 13,
    color: '#c44',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#1a3c27',
    fontWeight: '600',
  },
  remindersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THUMB_GAP,
    justifyContent: 'flex-start',
  },
  reminderThumb: {
    alignItems: 'center',
  },
  reminderThumbInner: {
    position: 'relative',
  },
  reminderOverdueBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#c44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderDateOverdue: {
    color: '#c44',
    fontWeight: '600',
  },
  reminderImage: {
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
  },
  reminderPlaceholder: {
    borderRadius: 10,
    backgroundColor: '#fff8e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderPlaceholderText: {
    fontSize: 28,
  },
  reminderDate: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  reminderName: {
    fontSize: 11,
    color: '#1a3c27',
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
  nearbySection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  nearbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    color: '#4a6741',
    fontWeight: '500',
  },
  nearbyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THUMB_GAP,
    justifyContent: 'flex-start',
  },
  nearbyThumb: {
    alignItems: 'center',
  },
  nearbyImage: {
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
  },
  nearbyPlaceholder: {
    borderRadius: 10,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nearbyPlaceholderText: {
    fontSize: 28,
  },
  nearbyName: {
    fontSize: 11,
    color: '#1a3c27',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  nearbyDistance: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  nearbyError: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  nearbyErrorLink: {
    alignSelf: 'flex-start',
  },
  nearbyErrorLinkText: {
    fontSize: 14,
    color: '#4a6741',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  favorisSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  favorisTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a3c27',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  favorisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THUMB_GAP,
    justifyContent: 'flex-start',
    width: '100%',
  },
  favoriThumb: {
    alignItems: 'center',
  },
  favoriImage: {
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
  },
  favoriPlaceholder: {
    borderRadius: 10,
    backgroundColor: '#e8f0eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriPlaceholderText: {
    fontSize: 28,
  },
  favoriName: {
    fontSize: 11,
    color: '#1a3c27',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
});
