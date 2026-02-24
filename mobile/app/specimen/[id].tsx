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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  getSpecimen,
  getSpecimenEvents,
  duplicateSpecimen,
  createSpecimenEvent,
  updateSpecimenEvent,
  deleteSpecimenEvent,
  getEventPhotos,
  uploadEventPhoto,
  getEventApplyToZonePreview,
  applyEventToZone,
} from '@/api/client';
import { API_BASE_URL } from '@/constants/config';
import type { SpecimenDetail, Event, EventType, Photo } from '@/types/api';
import { SPECIMEN_STATUT_LABELS, EVENT_TYPE_LABELS } from '@/types/api';

const PHOTO_TYPE_LABELS: Record<string, string> = {
  avant: '📷 Avant',
  apres: '📷 Après',
  autre: '📷 Autre',
};

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

function AddEventModal({
  visible,
  specimenId,
  onClose,
  onSuccess,
  submitting,
  setSubmitting,
}: {
  visible: boolean;
  specimenId: number;
  onClose: () => void;
  onSuccess: (event: Event) => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
}) {
  const [typeEvent, setTypeEvent] = useState<EventType>('observation');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [createdEvent, setCreatedEvent] = useState<Event | null>(null);
  const [createdPhotos, setCreatedPhotos] = useState<PhotoOrPending[]>([]);
  const [addPhotoModalVisible, setAddPhotoModalVisible] = useState(false);

  const resetAndClose = () => {
    setCreatedEvent(null);
    setCreatedPhotos([]);
    setTitre('');
    setDescription('');
    setTypeEvent('observation');
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const newEvent = await createSpecimenEvent(specimenId, {
        type_event: typeEvent,
        titre: titre.trim() || undefined,
        description: description.trim() || undefined,
      });
      setCreatedEvent(newEvent);
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    if (createdEvent) {
      onSuccess(createdEvent);
    }
    resetAndClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={createdEvent ? handleDone : onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={fullScreenModalStyles.container}
      >
        <View style={fullScreenModalStyles.header}>
          <TouchableOpacity
            onPress={createdEvent ? handleDone : onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={fullScreenModalStyles.closeBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={fullScreenModalStyles.headerTitle}>
            {createdEvent ? 'Ajouter des photos' : 'Ajouter un événement'}
          </Text>
          <View style={{ width: 28 }} />
        </View>
        <ScrollView
          style={fullScreenModalStyles.scroll}
          contentContainerStyle={fullScreenModalStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!createdEvent ? (
            <>
              <View style={modalStyles.typeGrid}>
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
              </View>
              <TextInput
                style={modalStyles.input}
                placeholder="Titre (optionnel)"
                value={titre}
                onChangeText={setTitre}
                placeholderTextColor="#888"
              />
              <TextInput
                style={[modalStyles.input, modalStyles.textArea]}
                placeholder="Description (optionnel)"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={2}
                placeholderTextColor="#888"
              />
              <TouchableOpacity
                style={fullScreenModalStyles.submitButton}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={fullScreenModalStyles.submitButtonText}>
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={eventDetailStyles.photoTitle}>Photos ({createdPhotos.length})</Text>
              <View style={eventDetailStyles.photoList}>
                {createdPhotos.map((p) => {
                  const thumbUri = getPhotoThumbUri(p);
                  return (
                    <View key={p.id} style={eventDetailStyles.photoItem}>
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
                    </View>
                  );
                })}
                <TouchableOpacity
                  style={eventDetailStyles.addPhotoBtn}
                  onPress={() => setAddPhotoModalVisible(true)}
                >
                  <Text style={eventDetailStyles.addPhotoText}>+ Photo</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={fullScreenModalStyles.submitButton} onPress={handleDone}>
                <Text style={fullScreenModalStyles.submitButtonText}>Terminé</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {createdEvent && (
        <AddEventPhotoModal
          visible={addPhotoModalVisible}
          specimenId={specimenId}
          eventId={createdEvent.id}
          onClose={() => setAddPhotoModalVisible(false)}
          onPendingPick={(localUri, typePhoto) => {
            const id = `pending-${Date.now()}`;
            setCreatedPhotos((prev) => [{ id, localUri, type_photo: typePhoto }, ...prev]);
            return id;
          }}
          onSuccess={(photo, pendingId) => {
            setCreatedPhotos((prev) => {
              const without = pendingId ? prev.filter((x) => x.id !== pendingId) : prev;
              return [photo, ...without];
            });
            setAddPhotoModalVisible(false);
          }}
          onUploadFailed={(pendingId) => {
            setCreatedPhotos((prev) => prev.filter((x) => x.id !== pendingId));
          }}
        />
      )}
    </Modal>
  );
}

const fullScreenModalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f5f5f0',
  },
  closeBtn: { fontSize: 24, color: '#1a3c27', fontWeight: '300' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1a3c27' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  submitButton: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#1a3c27',
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: { fontSize: 18, fontWeight: '600', color: '#fff' },
});

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
          <Text style={eventDetailStyles.date}>📅 {event.date}</Text>

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
                    const thumbUri = getPhotoThumbUri(p);
                    return (
                      <View key={p.id} style={eventDetailStyles.photoItem}>
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
                      </View>
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

type PhotoOrPending = Photo | { id: string; localUri: string; type_photo: string; titre?: string };

function getPhotoThumbUri(p: PhotoOrPending): string | null {
  if ('localUri' in p) return p.localUri;
  if (p.image_url?.startsWith('http')) return p.image_url;
  if (p.image) return `${API_BASE_URL}${p.image}`;
  return null;
}

async function pickAndUpload(
  source: 'camera' | 'library',
  specimenId: number,
  eventId: number,
  typePhoto: string,
  setUploading: (v: boolean) => void,
  onPendingPick?: (localUri: string, typePhoto: string) => string
): Promise<{ photo: Photo; pendingId: string | null } | null> {
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return null;
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return null;
  }
  const launcher = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  const result = await launcher({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const pendingId = onPendingPick?.(asset.uri, typePhoto) ?? null;
  setUploading(true);
  try {
    const photo = await uploadEventPhoto(specimenId, eventId, {
      image: {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: 'photo.jpg',
      },
      type_photo: typePhoto,
      titre: PHOTO_TYPE_LABELS[typePhoto] || typePhoto,
    });
    return { photo, pendingId };
  } catch {
    return { photo: null, pendingId };
  } finally {
    setUploading(false);
  }
}

function AddEventPhotoModal({
  visible,
  specimenId,
  eventId,
  onClose,
  onSuccess,
  onPendingPick,
  onUploadFailed,
}: {
  visible: boolean;
  specimenId: number;
  eventId: number;
  onClose: () => void;
  onSuccess: (photo: Photo, pendingId?: string) => void;
  onPendingPick?: (localUri: string, typePhoto: string) => string;
  onUploadFailed?: (pendingId: string) => void;
}) {
  const [typePhoto, setTypePhoto] = useState<string>('avant');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handlePick = async (source: 'camera' | 'library') => {
    const result = await pickAndUpload(source, specimenId, eventId, typePhoto, setUploading, onPendingPick);
    if (result?.photo) {
      setUploadSuccess(true);
      setTimeout(() => {
        onSuccess(result.photo!, result.pendingId ?? undefined);
        onClose();
      }, 1200);
    } else if (result?.pendingId) {
      onUploadFailed?.(result.pendingId);
      Alert.alert('Erreur', 'Impossible d\'envoyer la photo. Vérifiez votre connexion.');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={modalStyles.content} onStartShouldSetResponder={() => true}>
          <Text style={modalStyles.title}>Ajouter une photo</Text>
          <Text style={eventDetailStyles.tagLabel}>Tag (avant/après)</Text>
          <View style={eventDetailStyles.tagRow}>
            {['avant', 'apres', 'autre'].map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  modalStyles.typeButton,
                  typePhoto === t && modalStyles.typeButtonSelected,
                ]}
                onPress={() => setTypePhoto(t)}
              >
                <Text
                  style={[
                    modalStyles.typeButtonText,
                    typePhoto === t && modalStyles.typeButtonTextSelected,
                  ]}
                >
                  {PHOTO_TYPE_LABELS[t] || t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={eventDetailStyles.photoSourceRow}>
            <TouchableOpacity
              style={eventDetailStyles.photoSourceBtn}
              onPress={() => handlePick('camera')}
              disabled={uploading}
            >
              <Ionicons name="camera" size={36} color="#1a3c27" />
              <Text style={eventDetailStyles.photoSourceLabel}>Prendre une photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={eventDetailStyles.photoSourceBtn}
              onPress={() => handlePick('library')}
              disabled={uploading}
            >
              <Ionicons name="images" size={36} color="#1a3c27" />
              <Text style={eventDetailStyles.photoSourceLabel}>Galerie</Text>
            </TouchableOpacity>
          </View>
          {uploadSuccess && (
            <Text style={eventDetailStyles.successText}>✓ Photo enregistrée !</Text>
          )}
          {uploading && <ActivityIndicator size="small" color="#1a3c27" style={{ marginTop: 12 }} />}
          <TouchableOpacity style={[modalStyles.button, modalStyles.cancelButton]} onPress={onClose}>
            <Text style={modalStyles.cancelButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [eventDetailModalVisible, setEventDetailModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (!id) return;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      setError('ID invalide');
      setLoading(false);
      return;
    }
    Promise.all([getSpecimen(numId), getSpecimenEvents(numId)])
      .then(([s, e]) => {
        setSpecimen(s);
        setEvents(e);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [id]);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{specimen.nom}</Text>
        <Text style={styles.organism}>
          {specimen.organisme.nom_commun} ({specimen.organisme.nom_latin})
        </Text>
        <Text style={styles.statut}>{SPECIMEN_STATUT_LABELS[specimen.statut]}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Infos</Text>
        <Text style={styles.info}>Jardin : {specimen.garden.nom}</Text>
        {specimen.zone_jardin && (
          <Text style={styles.info}>Zone : {specimen.zone_jardin}</Text>
        )}
        {specimen.date_plantation && (
          <Text style={styles.info}>Planté le : {specimen.date_plantation}</Text>
        )}
        {specimen.notes && <Text style={styles.notes}>{specimen.notes}</Text>}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Événements récents</Text>
        {events.length === 0 ? (
          <Text style={styles.empty}>Aucun événement</Text>
        ) : (
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
        )}
        <TouchableOpacity
          style={styles.addEventButton}
          onPress={() => setEventModalVisible(true)}
        >
          <Text style={styles.addEventText}>+ Ajouter un événement</Text>
        </TouchableOpacity>
      </View>
      <AddEventModal
        visible={eventModalVisible}
        specimenId={specimen.id}
        onClose={() => setEventModalVisible(false)}
        onSuccess={(newEvent) => {
          setEvents([newEvent, ...events]);
          setEventModalVisible(false);
        }}
        submitting={eventSubmitting}
        setSubmitting={setEventSubmitting}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a3c27',
  },
  organism: {
    fontSize: 16,
    color: '#4a6741',
    marginTop: 4,
  },
  statut: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
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
  info: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
  },
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
