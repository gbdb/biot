import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useEffect, useState, useCallback, useMemo } from 'react';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getSpecimen,
  getSpecimenEvents,
  getSpecimenReminders,
  getSpecimenPhotos,
  getSpecimenCompanions,
  uploadSpecimenPhoto,
  deleteSpecimenPhoto,
  setSpecimenDefaultPhoto,
  duplicateSpecimen,
  updateSpecimenEvent,
  deleteSpecimenEvent,
  deleteSpecimenReminder,
  getEventPhotos,
  uploadEventPhoto,
  getEventApplyToZonePreview,
  applyEventToZone,
  addSpecimenFavorite,
  removeSpecimenFavorite,
} from '@/api/client';
import { getApiBaseUrl } from '@/constants/config';
import { takeNfcPreloadedSpecimenIfMatch } from '@/lib/nfcPreload';
import type { SpecimenDetail, Event, EventType, Photo, Reminder, SpecimenCompanions } from '@/types/api';
import { SPECIMEN_STATUT_LABELS, EVENT_TYPE_LABELS, REMINDER_TYPE_LABELS, REMINDER_ALERTE_LABELS } from '@/types/api';
import type { ReminderUpcoming } from '@/api/client';
import { ReminderActionModal } from '@/components/ReminderActionModal';
import { FAB } from '@/components/FAB';
import { PhotoCarousel, type PhotoCarouselItem } from '@/components/PhotoCarousel';
import { AddEventModal } from '@/components/AddEventModal';
import { AddEventPhotoModal, getPhotoThumbUri, PHOTO_TYPE_LABELS, type PhotoOrPending } from '@/components/AddEventPhotoModal';

const EVENT_TYPES: EventType[] = [
  'observation',
  'arrosage',
  'plantation',
  'recolte',
  'taille',
  'floraison',
  'fructification',
  'paillage',
  'fertilisation',
  'amendement',
  'maladie',
  'traitement',
  'transplantation',
  'protection',
  'autre',
];

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a3c27',
    marginBottom: 16,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    padding: 14,
    backgroundColor: '#f0f0eb',
    borderRadius: 10,
    alignItems: 'center',
  },
  modeButtonSelected: {
    backgroundColor: '#1a3c27',
  },
  modeButtonText: {
    fontSize: 16,
    color: '#333',
  },
  modeButtonTextSelected: {
    color: '#fff',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a3c27',
    marginBottom: 8,
    marginTop: 4,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    padding: 12,
    backgroundColor: '#f0f0eb',
    borderRadius: 10,
    minWidth: '47%',
  },
  typeButtonSelected: {
    backgroundColor: '#1a3c27',
  },
  typeButtonText: {
    fontSize: 15,
    color: '#333',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  dateDisplay: {
    fontSize: 16,
    color: '#333',
  },
  datePickerDone: {
    marginTop: 8,
    padding: 12,
    alignItems: 'center',
  },
  datePickerDoneText: {
    fontSize: 16,
    color: '#1a3c27',
    fontWeight: '600',
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0eb',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#1a3c27',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

const ZONE_GUIDANCE_EVENTS: EventType[] = ['taille', 'transplantation'];

function EventDetailModal({
  visible,
  event,
  specimenId,
  specimen,
  onClose,
  onEventUpdate,
  onEventDelete,
}: {
  visible: boolean;
  event: Event | null;
  specimenId: number;
  specimen: SpecimenDetail;
  onClose: () => void;
  onEventUpdate: (updated: Event) => void;
  onEventDelete: (eventId: number) => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photos, setPhotos] = useState<PhotoOrPending[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [zonePreview, setZonePreview] = useState<{ zone: string; count: number } | null>(null);
  const [applyingToZone, setApplyingToZone] = useState(false);
  const [typeEvent, setTypeEvent] = useState<EventType>('observation');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [eventPhotoCarouselVisible, setEventPhotoCarouselVisible] = useState(false);

  const showZoneGuidance = event && ZONE_GUIDANCE_EVENTS.includes(event.type_event);

  useEffect(() => {
    if (visible && event) {
      setTypeEvent(event.type_event);
      setTitre(event.titre || '');
      setDescription(event.description || '');
      setEditMode(false);
    }
  }, [visible, event]);

  useEffect(() => {
    if (visible && event) {
      setLoadingPhotos(true);
      getEventPhotos(specimenId, event.id)
        .then((p) => setPhotos(p as PhotoOrPending[]))
        .catch(() => setPhotos([]))
        .finally(() => setLoadingPhotos(false));
    }
  }, [visible, event, specimenId]);

  useEffect(() => {
    if (visible && event && specimen.zone_jardin) {
      getEventApplyToZonePreview(specimenId, event.id)
        .then((p) => {
          if (p.zone && p.count > 0) setZonePreview({ zone: p.zone, count: p.count });
          else setZonePreview(null);
        })
        .catch(() => setZonePreview(null));
    } else {
      setZonePreview(null);
    }
  }, [visible, event, specimenId, specimen.zone_jardin]);

  const handleSave = async () => {
    if (!event) return;
    setSaving(true);
    try {
      const updated = await updateSpecimenEvent(specimenId, event.id, {
        type_event: typeEvent,
        titre: titre.trim() || undefined,
        description: description.trim() || undefined,
      });
      onEventUpdate(updated);
      setEditMode(false);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToZone = async () => {
    if (!event) return;
    setApplyingToZone(true);
    try {
      const result = await applyEventToZone(specimenId, event.id);
      Alert.alert(
        'Zone mise à jour',
        `Événement appliqué à ${result.created} spécimen${result.created > 1 ? 's' : ''} dans la zone « ${result.zone} ».`
      );
      setZonePreview(null);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'appliquer l\'événement à la zone.');
    } finally {
      setApplyingToZone(false);
    }
  };

  const handleDelete = () => {
    if (!event) return;
    const eventIdToDelete = event.id;
    Alert.alert(
      'Supprimer l\'événement',
      'Êtes-vous sûr de vouloir supprimer cet événement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            setDeleting(true);
            deleteSpecimenEvent(specimenId, eventIdToDelete)
              .then(() => {
                onEventDelete(eventIdToDelete);
              })
              .catch((err) => {
                const msg = err instanceof Error ? err.message : 'Impossible de supprimer l\'événement.';
                Alert.alert('Erreur', msg);
              })
              .finally(() => setDeleting(false));
          },
        },
      ]
    );
  };

  if (!visible || !event) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={modalStyles.overlay}
      >
        <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[modalStyles.content, { maxHeight: '90%' }]} onStartShouldSetResponder={() => true}>
          <Text style={modalStyles.title}>{EVENT_TYPE_LABELS[event.type_event]}</Text>
          <Text style={eventDetailStyles.date}>{event.date}</Text>

          {editMode ? (
            <>
              <ScrollView style={eventDetailStyles.typeGrid} showsVerticalScrollIndicator={false}>
                {EVENT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      modalStyles.typeButton,
                      typeEvent === t && modalStyles.typeButtonSelected,
                    ]}
                    onPress={() => setTypeEvent(t)}
                  >
                    <Text
                      style={[
                        modalStyles.typeButtonText,
                        typeEvent === t && modalStyles.typeButtonTextSelected,
                      ]}
                    >
                      {EVENT_TYPE_LABELS[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput
                style={modalStyles.input}
                placeholder="Titre"
                value={titre}
                onChangeText={setTitre}
                placeholderTextColor="#888"
              />
              <TextInput
                style={[modalStyles.input, modalStyles.textArea]}
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={2}
                placeholderTextColor="#888"
              />
              <View style={modalStyles.actions}>
                <TouchableOpacity
                  style={[modalStyles.button, modalStyles.cancelButton]}
                  onPress={() => setEditMode(false)}
                >
                  <Text style={modalStyles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.button, modalStyles.submitButton]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={modalStyles.submitButtonText}>
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {event.titre ? <Text style={eventDetailStyles.field}>{event.titre}</Text> : null}
              {event.description ? (
                <Text style={eventDetailStyles.desc}>{event.description}</Text>
              ) : null}

              <Text style={eventDetailStyles.photoTitle}>Photos</Text>
              {loadingPhotos ? (
                <ActivityIndicator size="small" color="#1a3c27" />
              ) : (
                <View style={eventDetailStyles.photoList}>
                  {photos.map((p) => {
                    const thumbUri = getPhotoThumbUri(p, getApiBaseUrl());
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={eventDetailStyles.photoItem}
                        onPress={() => thumbUri && setEventPhotoCarouselVisible(true)}
                        activeOpacity={0.8}
                      >
                        {thumbUri ? (
                          <Image source={{ uri: thumbUri }} style={eventDetailStyles.photoThumb} />
                        ) : (
                          <View style={[eventDetailStyles.photoThumb, { justifyContent: 'center', alignItems: 'center' }]}>
                            <ActivityIndicator size="small" color="#1a3c27" />
                          </View>
                        )}
                        <Text style={eventDetailStyles.photoTag}>
                          {p.type_photo ? (PHOTO_TYPE_LABELS[p.type_photo] || p.type_photo) : 'Photo'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={eventDetailStyles.addPhotoBtn}
                    onPress={() => setPhotoModalVisible(true)}
                  >
                    <Text style={eventDetailStyles.addPhotoText}>+ Photo</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!loadingPhotos && photos.length > 0 && event && (
                <Modal
                  visible={eventPhotoCarouselVisible}
                  animationType="slide"
                  onRequestClose={() => setEventPhotoCarouselVisible(false)}
                >
                  <View style={fullScreenModalStyles.container}>
                    <View style={fullScreenModalStyles.header}>
                      <TouchableOpacity
                        onPress={() => setEventPhotoCarouselVisible(false)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <Text style={fullScreenModalStyles.closeBtn}>✕</Text>
                      </TouchableOpacity>
                      <Text style={fullScreenModalStyles.headerTitle}>Photos de l'événement</Text>
                      <View style={{ width: 28 }} />
                    </View>
                    <PhotoCarousel
                      items={photos
                        .map((p) => {
                          const uri = getPhotoThumbUri(p, getApiBaseUrl());
                          if (!uri) return null;
                          return {
                            id: p.id,
                            image_url: uri,
                            event: {
                              id: event.id,
                              type_event: event.type_event,
                              date: event.date,
                              titre: event.titre || '',
                            },
                          };
                        })
                        .filter(Boolean) as PhotoCarouselItem[]}
                      showEventBadge={false}
                    />
                  </View>
                </Modal>
              )}

              {zonePreview && (
                <>
                  <TouchableOpacity
                    style={eventDetailStyles.applyToZoneButton}
                    onPress={handleApplyToZone}
                    disabled={applyingToZone}
                  >
                    <Ionicons name="layers-outline" size={20} color="#1a3c27" />
                    <Text style={eventDetailStyles.applyToZoneText}>
                      {applyingToZone
                        ? 'Application...'
                        : `Appliquer à la zone (${zonePreview.count} spécimen${zonePreview.count > 1 ? 's' : ''})`}
                    </Text>
                  </TouchableOpacity>
                  {showZoneGuidance && (
                    <Text style={eventDetailStyles.zoneGuidance}>
                      💡 Cet événement concerne souvent un spécimen précis. Vous pouvez tout de même l'appliquer à la zone.
                    </Text>
                  )}
                </>
              )}
              <View style={modalStyles.actions}>
                <TouchableOpacity
                  style={[modalStyles.button, modalStyles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={modalStyles.cancelButtonText}>Fermer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.button, modalStyles.submitButton]}
                  onPress={() => setEditMode(true)}
                  disabled={deleting}
                >
                  <Text style={modalStyles.submitButtonText}>Modifier</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={eventDetailStyles.deleteButton}
                onPress={handleDelete}
                disabled={deleting}
              >
                <Ionicons name="trash-outline" size={20} color="#c44" />
                <Text style={eventDetailStyles.deleteButtonText}>
                  {deleting ? 'Suppression...' : 'Supprimer l\'événement'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <AddEventPhotoModal
        visible={photoModalVisible}
        specimenId={specimenId}
        eventId={event.id}
        onClose={() => setPhotoModalVisible(false)}
        onPendingPick={(localUri, typePhoto) => {
          const id = `pending-${Date.now()}`;
          setPhotos((prev) => [{ id, localUri, type_photo: typePhoto }, ...prev]);
          return id;
        }}
        onSuccess={(photo, pendingId) => {
          setPhotos((prev) => {
            const without = pendingId ? prev.filter((x) => x.id !== pendingId) : prev;
            return [photo, ...without];
          });
          setPhotoModalVisible(false);
        }}
        onUploadFailed={(pendingId) => {
          setPhotos((prev) => prev.filter((x) => x.id !== pendingId));
        }}
      />
    </Modal>
  );
}

const fullScreenModalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    backgroundColor: '#000',
  },
  closeBtn: {
    fontSize: 24,
    color: '#fff',
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});

const eventDetailStyles = StyleSheet.create({
  date: { fontSize: 14, color: '#666', marginBottom: 12 },
  field: { fontSize: 16, color: '#1a3c27', marginBottom: 8 },
  desc: { fontSize: 14, color: '#555', marginBottom: 16 },
  photoTitle: { fontSize: 16, fontWeight: '600', color: '#1a3c27', marginBottom: 8 },
  photoList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  photoItem: { alignItems: 'center' },
  photoThumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#eee' },
  photoTag: { fontSize: 10, color: '#666', marginTop: 4 },
  addPhotoBtn: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#f0f0eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: { fontSize: 14, color: '#1a3c27' },
  typeGrid: { maxHeight: 160, marginBottom: 12 },
  tagLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  tagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  photoSourceRow: { flexDirection: 'row', gap: 16, marginVertical: 16 },
  photoSourceBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f0eb',
    borderRadius: 12,
  },
  photoSourceLabel: { fontSize: 12, color: '#1a3c27', marginTop: 8 },
  successText: { fontSize: 16, color: '#2e7d32', marginTop: 12, textAlign: 'center' },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    marginTop: 8,
  },
  deleteButtonText: { fontSize: 14, color: '#c44' },
  applyToZoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    marginBottom: 8,
  },
  applyToZoneText: { fontSize: 14, color: '#1a3c27', fontWeight: '500' },
  zoneGuidance: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
});

export default function SpecimenDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [specimen, setSpecimen] = useState<SpecimenDetail | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [eventDetailModalVisible, setEventDetailModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedReminderForModal, setSelectedReminderForModal] = useState<ReminderUpcoming | null>(null);
  const [isFavori, setIsFavori] = useState(false);
  const [favoriToggling, setFavoriToggling] = useState(false);
  const [specimenPhotos, setSpecimenPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [settingDefaultPhoto, setSettingDefaultPhoto] = useState(false);
  const [defaultPhotoId, setDefaultPhotoId] = useState<number | null>(null);
  const [pendingPhotoForEvent, setPendingPhotoForEvent] = useState<{ uri: string; type?: string; name?: string } | null>(null);
  const [companions, setCompanions] = useState<SpecimenCompanions | null>(null);
  const [loadingCompanions, setLoadingCompanions] = useState(false);
  const [eventsViewMode, setEventsViewMode] = useState<'list' | 'images'>('list');
  const [eventsCarouselModalVisible, setEventsCarouselModalVisible] = useState(false);
  const [eventsCarouselInitialIndex, setEventsCarouselInitialIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      setError('ID invalide');
      setLoading(false);
      return;
    }
    const preloadedSpecimen = takeNfcPreloadedSpecimenIfMatch(numId);
    if (preloadedSpecimen) {
      setSpecimen(preloadedSpecimen);
      setIsFavori(preloadedSpecimen.is_favori ?? false);
      setDefaultPhotoId(preloadedSpecimen.photo_principale ?? null);
      setLoading(false);
      Promise.all([getSpecimenEvents(numId), getSpecimenReminders(numId)])
        .then(([e, r]) => {
          setEvents(e);
          setReminders(r);
        })
        .catch(() => {});
    } else {
      setLoading(true);
      Promise.all([getSpecimen(numId), getSpecimenEvents(numId), getSpecimenReminders(numId)])
        .then(([s, e, r]) => {
          setSpecimen(s);
          setEvents(e);
          setReminders(r);
          setIsFavori(s.is_favori ?? false);
          setDefaultPhotoId(s.photo_principale ?? null);
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!id || !specimen) return;
      const numId = parseInt(id, 10);
      if (isNaN(numId)) return;
      getSpecimen(numId)
        .then((s) => {
          setSpecimen(s);
          setIsFavori(s.is_favori ?? false);
          setDefaultPhotoId(s.photo_principale ?? null);
        })
        .catch(() => {});
      getSpecimenEvents(numId)
        .then(setEvents)
        .catch(() => {});
      getSpecimenReminders(numId)
        .then(setReminders)
        .catch(() => {});
    }, [id, specimen?.id])
  );

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      const numId = parseInt(id, 10);
      if (isNaN(numId)) return;
      setLoadingPhotos(true);
      getSpecimenPhotos(numId)
        .then(setSpecimenPhotos)
        .catch(() => setSpecimenPhotos([]))
        .finally(() => setLoadingPhotos(false));
    }, [id])
  );

  useEffect(() => {
    if (!specimen?.id) {
      setCompanions(null);
      return;
    }
    setLoadingCompanions(true);
    getSpecimenCompanions(specimen.id)
      .then(setCompanions)
      .catch(() => setCompanions(null))
      .finally(() => setLoadingCompanions(false));
  }, [specimen?.id]);

  const handleEventCreatedWithPendingPhoto = useCallback(
    async (event: Event) => {
      if (!specimen || !pendingPhotoForEvent) return;
      setUploadingPhoto(true);
      try {
        await uploadEventPhoto(specimen.id, event.id, {
          image: pendingPhotoForEvent as { uri: string; type?: string; name?: string },
          type_photo: 'autre',
        });
      } catch {
        Alert.alert('Erreur', 'Impossible d\'ajouter la photo à l\'événement.');
      } finally {
        setUploadingPhoto(false);
        setPendingPhotoForEvent(null);
      }
    },
    [specimen?.id, pendingPhotoForEvent]
  );

  const getSpecimenPhotoUri = useCallback((p: Photo): string | null => {
    if (p.image_url?.startsWith('http')) return p.image_url;
    if (p.image) return `${getApiBaseUrl()}${p.image}`;
    return null;
  }, []);

  const specimenCarouselItems = useMemo((): PhotoCarouselItem[] => {
    if (!specimen) return [];
    return specimenPhotos
      .map((p) => {
        const uri = getSpecimenPhotoUri(p);
        if (!uri) return null;
        return {
          id: p.id,
          image_url: uri,
          event: p.event ?? undefined,
          meta: { photoId: p.id, specimenId: specimen.id },
        };
      })
      .filter(Boolean) as PhotoCarouselItem[];
  }, [specimenPhotos, specimen?.id, getSpecimenPhotoUri]);

  const eventsWithFirstPhoto = useMemo(() => {
    return events
      .slice(0, 10)
      .map((ev) => ({ ev, firstPhoto: specimenPhotos.find((p) => p.event_id === ev.id) }))
      .filter((x): x is { ev: Event; firstPhoto: Photo } => x.firstPhoto != null);
  }, [events, specimenPhotos]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a3c27" />
      </View>
    );
  }

  if (error || !specimen) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error || 'Spécimen introuvable'}</Text>
      </View>
    );
  }

  const pickImageThenChooseAction = async (source: 'camera' | 'library') => {
    if (!specimen) return;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
    }
    const launcher =
      source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launcher({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const imagePayload = {
      uri: asset.uri,
      type: asset.mimeType || 'image/jpeg',
      name: 'photo.jpg',
    };
    Alert.alert(
      'Associer à un événement ?',
      'Voulez-vous créer un événement lié à cette photo (ex: taille, plantation) ou l\'ajouter simplement comme photo du spécimen ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Photo seule',
          onPress: async () => {
            setUploadingPhoto(true);
            try {
              const photo = await uploadSpecimenPhoto(specimen.id, {
                image: imagePayload,
                type_photo: 'autre',
                titre: 'Photo du spécimen',
              });
              setSpecimenPhotos((prev) => [photo, ...prev]);
            } catch (e) {
              Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible d\'envoyer la photo.');
            } finally {
              setUploadingPhoto(false);
            }
          },
        },
        {
          text: 'Créer un événement',
          onPress: () => {
            setPendingPhotoForEvent(imagePayload);
            setEventModalVisible(true);
          },
        },
      ]
    );
  };

  const handleAddSpecimenPhoto = () => {
    Alert.alert('Ajouter une photo', 'Choisir la source', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Appareil photo', onPress: () => pickImageThenChooseAction('camera') },
      { text: 'Galerie', onPress: () => pickImageThenChooseAction('library') },
    ]);
  };

  const handleToggleFavori = async () => {
    if (!specimen || favoriToggling) return;
    setFavoriToggling(true);
    const wasFavori = isFavori;
    setIsFavori(!wasFavori);
    try {
      if (wasFavori) {
        await removeSpecimenFavorite(specimen.id);
      } else {
        await addSpecimenFavorite(specimen.id);
      }
    } catch {
      setIsFavori(wasFavori);
    } finally {
      setFavoriToggling(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{specimen.nom}</Text>
          <View style={styles.titleActions}>
            <TouchableOpacity
              onPress={() => router.push(`/specimen/edit/${specimen.id}`)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.iconButton}
            >
              <Ionicons name="pencil" size={22} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleToggleFavori}
              disabled={favoriToggling}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.favoriButton}
            >
              <Ionicons
                name={isFavori ? 'star' : 'star-outline'}
                size={28}
                color={isFavori ? '#f0c040' : '#666'}
              />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.organism}>
          {specimen.organisme.nom_commun} ({specimen.organisme.nom_latin})
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/species/${specimen.organisme.id}`)}
          style={styles.backToSpeciesLink}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color="#1a3c27" />
          <Text style={styles.backToSpeciesText}>Retour à la fiche espèce</Text>
        </TouchableOpacity>
        <Text style={styles.statut}>{SPECIMEN_STATUT_LABELS[specimen.statut]}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Infos</Text>
        <Text style={styles.info}>Jardin : {specimen.garden?.nom ?? 'Non assigné'}</Text>
        {specimen.zone_jardin && (
          <Text style={styles.info}>Zone : {specimen.zone_jardin}</Text>
        )}
        {specimen.date_plantation && (
          <Text style={styles.info}>Planté le : {specimen.date_plantation}</Text>
        )}
        <Text style={styles.info}>
          GPS : {specimen.latitude != null && specimen.longitude != null
            ? `${specimen.latitude.toFixed(5)}, ${specimen.longitude.toFixed(5)}`
            : 'Non renseigné'}
        </Text>
        {specimen.notes && <Text style={styles.notes}>{specimen.notes}</Text>}
      </View>
      {(specimen.organism_calendrier?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stade phénologique</Text>
          <Text style={styles.label}>Calendrier de référence</Text>
          {(specimen.organism_calendrier ?? []).map((cal) => (
            <View key={cal.id} style={styles.phenoRow}>
              <Text style={styles.phenoIcon}>
                {cal.type_periode === 'floraison' ? 'F' : cal.type_periode === 'fructification' ? 'F' : cal.type_periode === 'recolte' ? 'R' : '•'}
              </Text>
              <Text style={styles.phenoLabel}>
                {cal.type_periode_display ?? cal.type_periode} — {cal.mois_debut != null && cal.mois_fin != null ? `Mois ${cal.mois_debut}–${cal.mois_fin}` : '—'}
              </Text>
            </View>
          ))}
          <Text style={[styles.label, { marginTop: 12 }]}>Observations confirmées (cette année)</Text>
          {(['floraison', 'fructification', 'recolte'] as const).map((typeEv) => {
            const currentYear = new Date().getFullYear();
            const ev = events.find(
              (e) => e.type_event === typeEv && e.date.startsWith(String(currentYear))
            );
            return (
              <View key={typeEv} style={styles.phenoRow}>
                <Text style={styles.phenoLabel}>
                  {EVENT_TYPE_LABELS[typeEv]} : {ev ? ev.date : 'Pas encore enregistré'}
                </Text>
              </View>
            );
          })}
          <TouchableOpacity
            style={styles.addEventButton}
            onPress={() => {
              setEventModalVisible(true);
            }}
          >
            <Text style={styles.addEventText}>Confirmer un stade (floraison, fructification, récolte)</Text>
          </TouchableOpacity>
        </View>
      )}
      {specimen.pollination_associations && specimen.pollination_associations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Associé à (pollinisation)</Text>
          {specimen.pollination_associations.map((assoc) => (
            <View key={assoc.group_id} style={styles.pollinationGroup}>
              <Text style={styles.pollinationGroupType}>
                {assoc.type_groupe === 'male_female' ? 'Mâle / femelle' : 'Pollinisation croisée'}
                {assoc.role ? ` — Rôle : ${assoc.role}` : ''}
              </Text>
              {assoc.other_members.map((m) => (
                <TouchableOpacity
                  key={m.specimen_id}
                  style={[styles.pollinationMemberRow, m.alerte_distance && styles.pollinationMemberRowAlert]}
                  onPress={() => router.push(`/specimen/${m.specimen_id}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pollinationMemberNom}>{m.nom}</Text>
                  {m.organisme_nom && <Text style={styles.pollinationMemberOrg}>{m.organisme_nom}</Text>}
                  {m.distance_metres != null && <Text style={styles.pollinationMemberDist}>{m.distance_metres} m</Text>}
                  {m.alerte_distance && <Text style={styles.pollinationAlert}>Zone trop loin</Text>}
                  <Ionicons name="chevron-forward" size={18} color="#888" />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      )}
      {(() => {
        const hasBenefices = (companions?.benefices_de.actifs.length ?? 0) + (companions?.benefices_de.manquants.length ?? 0) > 0;
        const hasAide = (companions?.aide_a.actifs.length ?? 0) + (companions?.aide_a.manquants.length ?? 0) > 0;
        if (loadingCompanions || (!hasBenefices && !hasAide)) return null;
        const comp = companions!;
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compagnonnage</Text>
            {specimen?.latitude == null && specimen?.longitude == null && (
              <Text style={styles.companionGpsNote}>Ajoutez les coordonnées GPS pour calculer les distances.</Text>
            )}
            {hasBenefices && (
              <>
                <Text style={styles.companionSubtitle}>Ce spécimen bénéficie de</Text>
                {comp.benefices_de.actifs.map((e, i) => (
                  <View key={`b-a-${i}`} style={styles.companionRow}>
                    <Text style={styles.companionText}>
                      {e.specimen_nom ?? e.organisme_nom} {e.distance_metres != null ? `à ${e.distance_metres} m` : ''} — {e.type_relation_display} ({e.force})
                    </Text>
                    {e.specimen_id != null && (
                      <TouchableOpacity onPress={() => router.push(`/specimen/${e.specimen_id}`)}>
                        <Ionicons name="chevron-forward" size={18} color="#4a6741" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {comp.benefices_de.manquants.map((e, i) => (
                  <View key={`b-m-${i}`} style={styles.companionRow}>
                    <Text style={styles.companionText}>
                      Aucun {e.organisme_nom} {e.distance_optimale != null ? `dans un rayon de ${e.distance_optimale} m` : 'dans le jardin'}
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/species/library')}>
                      <Text style={styles.companionLink}>Voir les espèces compatibles →</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
            {hasAide && (
              <>
                <Text style={[styles.companionSubtitle, hasBenefices && { marginTop: 16 }]}>Ce spécimen aide</Text>
                {comp.aide_a.actifs.map((e, i) => (
                  <View key={`a-a-${i}`} style={styles.companionRow}>
                    <Text style={styles.companionText}>
                      {e.specimen_nom ?? e.organisme_nom} {e.distance_metres != null ? `à ${e.distance_metres} m` : ''} — {e.type_relation_display} ({e.force})
                    </Text>
                    {e.specimen_id != null && (
                      <TouchableOpacity onPress={() => router.push(`/specimen/${e.specimen_id}`)}>
                        <Ionicons name="chevron-forward" size={18} color="#4a6741" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {comp.aide_a.manquants.map((e, i) => (
                  <View key={`a-m-${i}`} style={styles.companionRow}>
                    <Text style={styles.companionText}>
                      Aucun {e.organisme_nom} {e.distance_optimale != null ? `dans un rayon de ${e.distance_optimale} m` : 'dans le jardin'}
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/species/library')}>
                      <Text style={styles.companionLink}>Voir les espèces compatibles →</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </View>
        );
      })()}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photos</Text>
        {loadingPhotos ? (
          <ActivityIndicator size="small" color="#1a3c27" style={styles.photoLoader} />
        ) : (
          <PhotoCarousel
            items={specimenPhotos.map((p) => {
              const uri = getSpecimenPhotoUri(p);
              if (!uri) return null;
              return {
                id: p.id,
                image_url: uri,
                event: p.event ?? undefined,
                meta: { photoId: p.id, specimenId: specimen.id },
              };
            }).filter(Boolean) as PhotoCarouselItem[]}
            showEventBadge
            onOpenEvent={(eventId) => {
              const ev = events.find((e) => e.id === eventId);
              if (ev) {
                setSelectedEvent(ev);
                setEventDetailModalVisible(true);
              }
            }}
            renderFullscreenActions={(item, close) => {
              if (!item.meta?.specimenId || !item.meta?.photoId || !specimen || item.event) return null;
              return (
                <>
                  <TouchableOpacity
                    style={[styles.carouselActionBtn, defaultPhotoId === item.meta.photoId && styles.carouselActionBtnDisabled]}
                    onPress={async () => {
                      if (settingDefaultPhoto || defaultPhotoId === item.meta!.photoId) return;
                      setSettingDefaultPhoto(true);
                      try {
                        await setSpecimenDefaultPhoto(specimen.id, item.meta!.photoId!);
                        setDefaultPhotoId(item.meta!.photoId!);
                      } catch {
                        Alert.alert('Erreur', 'Impossible de définir la photo par défaut.');
                      } finally {
                        setSettingDefaultPhoto(false);
                      }
                    }}
                    disabled={settingDefaultPhoto || defaultPhotoId === item.meta.photoId}
                  >
                    {settingDefaultPhoto && defaultPhotoId !== item.meta.photoId ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name={defaultPhotoId === item.meta.photoId ? 'star' : 'star-outline'} size={20} color="#fff" />
                        <Text style={styles.carouselActionText}>
                          {defaultPhotoId === item.meta.photoId ? 'Par défaut' : 'Définir par défaut'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.carouselActionBtn, styles.carouselActionBtnDanger]}
                    onPress={() => {
                      if (deletingPhoto) return;
                      Alert.alert(
                        'Supprimer la photo',
                        'Êtes-vous sûr de vouloir supprimer cette photo ?',
                        [
                          { text: 'Annuler', style: 'cancel' },
                          {
                            text: 'Supprimer',
                            style: 'destructive',
                            onPress: async () => {
                              setDeletingPhoto(true);
                              try {
                                await deleteSpecimenPhoto(specimen.id, item.meta!.photoId!);
                                setSpecimenPhotos((prev) => prev.filter((ph) => ph.id !== item.meta!.photoId));
                                if (defaultPhotoId === item.meta!.photoId) setDefaultPhotoId(null);
                                close();
                              } catch {
                                Alert.alert('Erreur', 'Impossible de supprimer la photo.');
                              } finally {
                                setDeletingPhoto(false);
                              }
                            },
                          },
                        ]
                      );
                    }}
                    disabled={deletingPhoto}
                  >
                    {deletingPhoto ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={20} color="#fff" />
                        <Text style={styles.carouselActionText}>Supprimer</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              );
            }}
            extraContent={
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={handleAddSpecimenPhoto}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={24} color="#fff" />
                    <Text style={styles.addPhotoText}>Ajouter une photo</Text>
                  </>
                )}
              </TouchableOpacity>
            }
          />
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rappels</Text>
        {reminders.length === 0 ? (
          <Text style={styles.empty}>Aucun rappel</Text>
        ) : (
          reminders.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={styles.eventRow}
              onPress={() => {
                const today = new Date().toISOString().slice(0, 10);
                setSelectedReminderForModal({
                  id: r.id,
                  type_rappel: r.type_rappel,
                  date_rappel: r.date_rappel,
                  type_alerte: r.type_alerte,
                  titre: r.titre ?? '',
                  description: r.description ?? '',
                  is_overdue: r.date_rappel < today,
                  recurrence_rule: r.recurrence_rule ?? 'none',
                  specimen: {
                    id: specimen.id,
                    nom: specimen.nom,
                    organisme_nom: specimen.organisme?.nom_commun ?? '',
                    photo_url: specimen.photo_principale_url ?? null,
                  },
                });
              }}
              onLongPress={() => {
                Alert.alert(
                  'Supprimer le rappel',
                  'Êtes-vous sûr de vouloir supprimer ce rappel ?',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    {
                      text: 'Supprimer',
                      style: 'destructive',
                      onPress: () => {
                        deleteSpecimenReminder(specimen.id, r.id)
                          .then(() => setReminders((prev) => prev.filter((x) => x.id !== r.id)))
                          .catch(() => Alert.alert('Erreur', 'Impossible de supprimer le rappel.'));
                      },
                    },
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.eventType}>{REMINDER_TYPE_LABELS[r.type_rappel]}</Text>
              <Text style={styles.eventDate}>{r.date_rappel} • {REMINDER_ALERTE_LABELS[r.type_alerte]}</Text>
              {r.titre ? <Text style={styles.eventTitre}>{r.titre}</Text> : null}
            </TouchableOpacity>
          ))
        )}
      </View>
      <View style={styles.section}>
        <View style={styles.eventsSectionHeader}>
          <Text style={styles.sectionTitle}>Événements récents</Text>
          <View style={styles.eventsViewModeRow}>
            <TouchableOpacity
              onPress={() => setEventsViewMode('list')}
              style={[styles.eventsViewModeBtn, eventsViewMode === 'list' && styles.eventsViewModeBtnActive]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="list" size={22} color={eventsViewMode === 'list' ? '#fff' : '#666'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setEventsViewMode('images')}
              style={[styles.eventsViewModeBtn, eventsViewMode === 'images' && styles.eventsViewModeBtnActive]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="images" size={22} color={eventsViewMode === 'images' ? '#fff' : '#666'} />
            </TouchableOpacity>
          </View>
        </View>
        {events.length === 0 ? (
          <Text style={styles.empty}>Aucun événement</Text>
        ) : eventsViewMode === 'list' ? (
          events.slice(0, 10).map((ev) => (
            <TouchableOpacity
              key={ev.id}
              style={styles.eventRow}
              onPress={() => {
                setSelectedEvent(ev);
                setEventDetailModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.eventType}>{EVENT_TYPE_LABELS[ev.type_event]}</Text>
              <Text style={styles.eventDate}>{ev.date}</Text>
              {ev.titre ? <Text style={styles.eventTitre}>{ev.titre}</Text> : null}
            </TouchableOpacity>
          ))
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventsThumbScroll}>
            {eventsWithFirstPhoto.map(({ ev, firstPhoto }) => {
              const uri = getSpecimenPhotoUri(firstPhoto);
              const carouselIndex = specimenPhotos.findIndex((p) => p.id === firstPhoto.id);
              return (
                <TouchableOpacity
                  key={ev.id}
                  style={styles.eventsThumbWrap}
                  onPress={() => {
                    if (carouselIndex >= 0) {
                      setEventsCarouselInitialIndex(carouselIndex);
                      setEventsCarouselModalVisible(true);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  {uri ? (
                    <Image source={{ uri }} style={styles.eventsThumbImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.eventsThumbImage, styles.eventsThumbPlaceholder]}>
                      <Ionicons name="image-outline" size={28} color="#888" />
                    </View>
                  )}
                  <Text style={styles.eventsThumbLabel} numberOfLines={2}>
                    {EVENT_TYPE_LABELS[ev.type_event]} — {ev.date}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
        {eventsViewMode === 'images' && eventsWithFirstPhoto.length === 0 && events.length > 0 && (
          <Text style={styles.empty}>Aucune photo dans les événements récents</Text>
        )}
        <FAB
          label="Ajouter un événement"
          icon="add-circle-outline"
          variant="primary"
          size="large"
          onPress={() => setEventModalVisible(true)}
        />
      </View>
      {specimen && (
        <Modal
          visible={eventsCarouselModalVisible}
          animationType="slide"
          onRequestClose={() => setEventsCarouselModalVisible(false)}
        >
          <View style={fullScreenModalStyles.container}>
            <View style={fullScreenModalStyles.header}>
              <TouchableOpacity
                onPress={() => setEventsCarouselModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={fullScreenModalStyles.closeBtn}>✕</Text>
              </TouchableOpacity>
              <Text style={fullScreenModalStyles.headerTitle}>Photos du spécimen</Text>
              <View style={{ width: 28 }} />
            </View>
            <PhotoCarousel
              items={specimenCarouselItems}
              initialFullscreenIndex={eventsCarouselInitialIndex}
              showEventBadge
              onOpenEvent={(eventId) => {
                setEventsCarouselModalVisible(false);
                const ev = events.find((e) => e.id === eventId);
                if (ev) {
                  setSelectedEvent(ev);
                  setEventDetailModalVisible(true);
                }
              }}
            />
          </View>
        </Modal>
      )}
      <AddEventModal
        visible={eventModalVisible}
        specimenId={specimen.id}
        onClose={() => {
          setPendingPhotoForEvent(null);
          setEventModalVisible(false);
        }}
        onSuccess={async (newEvent) => {
          if (pendingPhotoForEvent) {
            await handleEventCreatedWithPendingPhoto(newEvent);
            getSpecimenPhotos(specimen.id).then(setSpecimenPhotos).catch(() => {});
          }
          setEvents([newEvent, ...events]);
          if (newEvent.type_event === 'mort') {
            getSpecimen(specimen.id).then(setSpecimen).catch(() => {});
            // Ne pas fermer le modal : le flux « Mort et enlèvement » continue (alerte puis formulaire enlever ou rappel).
          } else {
            setEventModalVisible(false);
          }
        }}
        onReminderSuccess={(newReminder) => {
          setReminders((prev) => [newReminder, ...prev]);
          setEventModalVisible(false);
        }}
        submitting={eventSubmitting}
        setSubmitting={setEventSubmitting}
      />
      <ReminderActionModal
        visible={selectedReminderForModal != null}
        reminder={selectedReminderForModal}
        onClose={() => setSelectedReminderForModal(null)}
        onAction={() => {
          getSpecimenReminders(specimen.id).then(setReminders).catch(() => {});
        }}
      />
      <EventDetailModal
        visible={eventDetailModalVisible}
        event={selectedEvent}
        specimenId={specimen.id}
        specimen={specimen}
        onClose={() => {
          setEventDetailModalVisible(false);
          setSelectedEvent(null);
        }}
        onEventUpdate={(updated) => {
          setEvents(events.map((e) => (e.id === updated.id ? updated : e)));
        }}
        onEventDelete={(eventId) => {
          setEvents((prev) => prev.filter((e) => e.id !== eventId));
          setEventDetailModalVisible(false);
          setSelectedEvent(null);
        }}
      />
      <TouchableOpacity
        style={[styles.duplicateButton, duplicating && styles.duplicateButtonDisabled]}
        onPress={async () => {
          if (!specimen || duplicating) return;
          setDuplicating(true);
          try {
            const copy = await duplicateSpecimen(specimen.id);
            router.replace(`/specimen/${copy.id}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur duplication');
          } finally {
            setDuplicating(false);
          }
        }}
        disabled={duplicating}
      >
        <Text style={styles.duplicateButtonText}>
          {duplicating ? '⏳ Duplication...' : '📋 Dupliquer ce spécimen'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  content: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f0',
  },
  header: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a3c27',
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  favoriButton: {
    padding: 4,
  },
  organism: {
    fontSize: 16,
    color: '#4a6741',
    marginTop: 4,
  },
  backToSpeciesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  backToSpeciesText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a3c27',
  },
  statut: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  photoLoader: {
    marginVertical: 16,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#1a3c27',
    borderRadius: 10,
    marginTop: 4,
  },
  addPhotoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a3c27',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  phenoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  phenoIcon: { fontSize: 18 },
  phenoLabel: { fontSize: 15, color: '#1a3c27', flex: 1 },
  companionGpsNote: { fontSize: 13, color: '#666', marginBottom: 10, fontStyle: 'italic' },
  companionSubtitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 8 },
  companionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  companionText: { fontSize: 14, color: '#1a3c27', flex: 1 },
  companionLink: { fontSize: 14, color: '#4a6741', fontWeight: '500' },
  pollinationGroup: {
    marginBottom: 16,
  },
  pollinationGroupType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pollinationMemberRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: '#f0f7f0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0ebe0',
  },
  pollinationMemberRowAlert: {
    backgroundColor: '#fdf2f2',
    borderColor: '#f0d8d8',
  },
  pollinationMemberNom: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a3c27',
    width: '100%',
  },
  pollinationMemberOrg: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    width: '100%',
  },
  pollinationMemberDist: {
    fontSize: 12,
    color: '#4a6741',
    marginTop: 4,
  },
  pollinationAlert: {
    fontSize: 12,
    color: '#8b3a3a',
    fontWeight: '600',
    marginLeft: 8,
    marginTop: 4,
  },
  eventsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eventsViewModeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  eventsViewModeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  eventsViewModeBtnActive: {
    backgroundColor: '#1a3c27',
  },
  eventsThumbScroll: {
    marginBottom: 12,
  },
  eventsThumbWrap: {
    width: 100,
    marginRight: 12,
  },
  eventsThumbImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  eventsThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventsThumbLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  info: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
  },
  carouselActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(26,60,39,0.9)',
    borderRadius: 10,
  },
  carouselActionBtnDisabled: { opacity: 0.6 },
  carouselActionBtnDanger: {
    backgroundColor: 'rgba(180,60,60,0.9)',
  },
  carouselActionText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  notes: {
    fontSize: 14,
    color: '#555',
    marginTop: 8,
    fontStyle: 'italic',
  },
  empty: {
    fontSize: 14,
    color: '#888',
  },
  eventRow: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
  },
  eventType: {
    fontSize: 16,
    color: '#1a3c27',
  },
  eventDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  eventTitre: {
    fontSize: 14,
    color: '#4a6741',
    marginTop: 4,
  },
  addEventButton: {
    marginTop: 12,
    padding: 14,
    backgroundColor: '#1a3c27',
    borderRadius: 10,
    alignItems: 'center',
  },
  addEventText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  duplicateButton: {
    marginTop: 24,
    padding: 14,
    backgroundColor: '#4a6741',
    borderRadius: 10,
    alignItems: 'center',
  },
  duplicateButtonDisabled: {
    opacity: 0.7,
  },
  duplicateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  error: {
    color: '#c44',
    fontSize: 16,
  },
});
