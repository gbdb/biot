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
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getSpecimen,
  getSpecimenEvents,
  getSpecimenReminders,
  getSpecimenPhotos,
  uploadSpecimenPhoto,
  deleteSpecimenPhoto,
  setSpecimenDefaultPhoto,
  duplicateSpecimen,
  createSpecimenEvent,
  createSpecimenReminder,
  updateSpecimenEvent,
  deleteSpecimenEvent,
  deleteSpecimenReminder,
  getEventPhotos,
  uploadEventPhoto,
  getEventApplyToZonePreview,
  applyEventToZone,
  addSpecimenFavorite,
  removeSpecimenFavorite,
  updateSpecimen,
} from '@/api/client';
import { API_BASE_URL } from '@/constants/config';
import { takeNfcPreloadedSpecimenIfMatch } from '@/lib/nfcPreload';
import type { SpecimenDetail, Event, EventType, Photo, Reminder, ReminderType, ReminderAlerteType, ReminderRecurrenceRule } from '@/types/api';
import { SPECIMEN_STATUT_LABELS, EVENT_TYPE_LABELS, REMINDER_TYPE_LABELS, REMINDER_ALERTE_LABELS, REMINDER_RECURRENCE_LABELS } from '@/types/api';
import type { ReminderUpcoming } from '@/api/client';
import { ReminderActionModal } from '@/components/ReminderActionModal';
import { FAB } from '@/components/FAB';

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

const REMINDER_TYPES: ReminderType[] = [
  'arrosage',
  'suivi_maladie',
  'taille',
  'suivi_general',
  'cueillette',
];

const REMINDER_ALERTE_TYPES: ReminderAlerteType[] = ['email', 'popup', 'son'];

function formatDateForInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function AddEventModal({
  visible,
  specimenId,
  onClose,
  onSuccess,
  onReminderSuccess,
  submitting,
  setSubmitting,
}: {
  visible: boolean;
  specimenId: number;
  onClose: () => void;
  onSuccess: (event: Event) => void;
  onReminderSuccess?: (reminder: Reminder) => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
}) {
  const [mode, setMode] = useState<'event' | 'reminder'>('event');
  const [typeEvent, setTypeEvent] = useState<EventType>('observation');
  const [typeRappel, setTypeRappel] = useState<ReminderType>('arrosage');
  const [dateRappel, setDateRappel] = useState(() => formatDateForInput(new Date()));
  const [typeAlerte, setTypeAlerte] = useState<ReminderAlerteType>('popup');
  const [recurrenceRule, setRecurrenceRule] = useState<ReminderRecurrenceRule>('none');
  const [showDatePicker, setShowDatePicker] = useState(false);
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
    setTypeRappel('arrosage');
    setDateRappel(formatDateForInput(new Date()));
    setTypeAlerte('popup');
    setRecurrenceRule('none');
    setShowDatePicker(false);
    setMode('event');
    onClose();
  };

  const handleSubmitEvent = async () => {
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

  const handleSubmitReminder = async () => {
    setSubmitting(true);
    try {
      const newReminder = await createSpecimenReminder(specimenId, {
        type_rappel: typeRappel,
        date_rappel: dateRappel,
        type_alerte: typeAlerte,
        titre: titre.trim() || undefined,
        description: description.trim() || undefined,
        recurrence_rule: recurrenceRule,
      });
      onReminderSuccess?.(newReminder);
      resetAndClose();
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
            {createdEvent ? 'Ajouter des photos' : mode === 'reminder' ? 'Ajouter un rappel' : 'Ajouter un événement'}
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
              <View style={modalStyles.modeRow}>
                <TouchableOpacity
                  style={[modalStyles.modeButton, mode === 'event' && modalStyles.modeButtonSelected]}
                  onPress={() => setMode('event')}
                >
                  <Text style={[modalStyles.modeButtonText, mode === 'event' && modalStyles.modeButtonTextSelected]}>
                    Événement
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.modeButton, mode === 'reminder' && modalStyles.modeButtonSelected]}
                  onPress={() => setMode('reminder')}
                >
                  <Text style={[modalStyles.modeButtonText, mode === 'reminder' && modalStyles.modeButtonTextSelected]}>
                    Rappel
                  </Text>
                </TouchableOpacity>
              </View>

              {mode === 'event' ? (
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
                </>
              ) : (
                <>
                  <Text style={modalStyles.label}>Type de rappel</Text>
                  <View style={modalStyles.typeGrid}>
                    {REMINDER_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          modalStyles.typeButton,
                          typeRappel === t && modalStyles.typeButtonSelected,
                        ]}
                        onPress={() => setTypeRappel(t)}
                      >
                        <Text
                          style={[
                            modalStyles.typeButtonText,
                            typeRappel === t && modalStyles.typeButtonTextSelected,
                          ]}
                        >
                          {REMINDER_TYPE_LABELS[t]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={modalStyles.label}>Date de rappel</Text>
                  <TouchableOpacity
                    style={[modalStyles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={modalStyles.dateDisplay}>{dateRappel}</Text>
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={new Date(dateRappel || formatDateForInput(new Date()))}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(_, date) => {
                        if (Platform.OS !== 'ios') setShowDatePicker(false);
                        if (date) setDateRappel(formatDateForInput(date));
                      }}
                      minimumDate={new Date()}
                    />
                  )}
                  {Platform.OS === 'ios' && showDatePicker && (
                    <TouchableOpacity onPress={() => setShowDatePicker(false)} style={modalStyles.datePickerDone}>
                      <Text style={modalStyles.datePickerDoneText}>OK</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={modalStyles.label}>Récurrence</Text>
                  <View style={modalStyles.tagRow}>
                    {(['none', 'biweekly', 'annual', 'biannual'] as const).map((rule) => (
                      <TouchableOpacity
                        key={rule}
                        style={[
                          modalStyles.typeButton,
                          recurrenceRule === rule && modalStyles.typeButtonSelected,
                        ]}
                        onPress={() => setRecurrenceRule(rule)}
                      >
                        <Text
                          style={[
                            modalStyles.typeButtonText,
                            recurrenceRule === rule && modalStyles.typeButtonTextSelected,
                          ]}
                        >
                          {REMINDER_RECURRENCE_LABELS[rule]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={modalStyles.label}>Type d'alerte</Text>
                  <View style={modalStyles.tagRow}>
                    {REMINDER_ALERTE_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          modalStyles.typeButton,
                          typeAlerte === t && modalStyles.typeButtonSelected,
                        ]}
                        onPress={() => setTypeAlerte(t)}
                      >
                        <Text
                          style={[
                            modalStyles.typeButtonText,
                            typeAlerte === t && modalStyles.typeButtonTextSelected,
                          ]}
                        >
                          {REMINDER_ALERTE_LABELS[t]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

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
              <FAB
                label={submitting ? 'Enregistrement...' : 'Enregistrer'}
                variant="primary"
                size="large"
                onPress={mode === 'reminder' ? handleSubmitReminder : handleSubmitEvent}
                disabled={submitting}
                style={{ marginTop: 24 }}
              />
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
              <FAB
                label="Terminé"
                variant="primary"
                size="large"
                onPress={handleDone}
                style={{ marginTop: 24 }}
              />
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
  const [fullscreenPhoto, setFullscreenPhoto] = useState<Photo | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [settingDefaultPhoto, setSettingDefaultPhoto] = useState(false);
  const [defaultPhotoId, setDefaultPhotoId] = useState<number | null>(null);
  const [updatingGps, setUpdatingGps] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

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

  const pickAndUploadSpecimenPhoto = async (source: 'camera' | 'library') => {
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
    setUploadingPhoto(true);
    try {
      const photo = await uploadSpecimenPhoto(specimen.id, {
        image: {
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: 'photo.jpg',
        },
        type_photo: 'autre',
        titre: 'Photo du spécimen',
      });
      setSpecimenPhotos((prev) => [photo, ...prev]);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer la photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddSpecimenPhoto = () => {
    Alert.alert('Ajouter une photo', 'Choisir la source', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Appareil photo', onPress: () => pickAndUploadSpecimenPhoto('camera') },
      { text: 'Galerie', onPress: () => pickAndUploadSpecimenPhoto('library') },
    ]);
  };

  const getSpecimenPhotoUri = (p: Photo): string | null => {
    if (p.image_url?.startsWith('http')) return p.image_url;
    if (p.image) return `${API_BASE_URL}${p.image}`;
    return null;
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
        <Text style={styles.statut}>{SPECIMEN_STATUT_LABELS[specimen.statut]}</Text>
      </View>
      <View style={styles.photoSection}>
        {loadingPhotos ? (
          <ActivityIndicator size="small" color="#1a3c27" style={styles.photoLoader} />
        ) : (
          <>
            <View style={styles.photoGrid}>
              {specimenPhotos.map((p) => {
                const uri = getSpecimenPhotoUri(p);
                if (!uri) return null;
                const photoWidth = (screenWidth - 48) / 2;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setFullscreenPhoto(p)}
                    activeOpacity={0.9}
                    style={styles.photoWrapper}
                  >
                    <Image
                      source={{ uri }}
                      style={[styles.specimenPhoto, { width: photoWidth, height: photoWidth * 0.75 }]}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
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
          </>
        )}
      </View>
      <Modal
        visible={!!fullscreenPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenPhoto(null)}
      >
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setFullscreenPhoto(null)}
          >
            {fullscreenPhoto && (
              <Image
                source={{ uri: getSpecimenPhotoUri(fullscreenPhoto) ?? '' }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
          {fullscreenPhoto && (
            <View style={styles.fullscreenActions}>
              <TouchableOpacity
                style={[
                  styles.fullscreenActionButton,
                  defaultPhotoId === fullscreenPhoto.id && styles.fullscreenActionButtonDisabled,
                ]}
                onPress={async () => {
                  if (!specimen || settingDefaultPhoto || defaultPhotoId === fullscreenPhoto.id) return;
                  setSettingDefaultPhoto(true);
                  try {
                    await setSpecimenDefaultPhoto(specimen.id, fullscreenPhoto.id);
                    setDefaultPhotoId(fullscreenPhoto.id);
                  } catch {
                    Alert.alert('Erreur', 'Impossible de définir la photo par défaut.');
                  } finally {
                    setSettingDefaultPhoto(false);
                  }
                }}
                disabled={settingDefaultPhoto || defaultPhotoId === fullscreenPhoto.id}
              >
                {settingDefaultPhoto && defaultPhotoId !== fullscreenPhoto.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name={defaultPhotoId === fullscreenPhoto.id ? 'star' : 'star-outline'}
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.fullscreenActionText}>
                      {defaultPhotoId === fullscreenPhoto.id ? 'Photo par défaut' : 'Définir par défaut'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fullscreenActionButton, styles.fullscreenDeleteButton]}
                onPress={() => {
                  if (!specimen || deletingPhoto) return;
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
                            await deleteSpecimenPhoto(specimen.id, fullscreenPhoto.id);
                            setSpecimenPhotos((prev) => prev.filter((ph) => ph.id !== fullscreenPhoto.id));
                            if (defaultPhotoId === fullscreenPhoto.id) setDefaultPhotoId(null);
                            setFullscreenPhoto(null);
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
                    <Ionicons name="trash-outline" size={22} color="#fff" />
                    <Text style={styles.fullscreenDeleteText}>Supprimer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Infos</Text>
        <Text style={styles.info}>Jardin : {specimen.garden?.nom ?? 'Non assigné'}</Text>
        {specimen.zone_jardin && (
          <Text style={styles.info}>Zone : {specimen.zone_jardin}</Text>
        )}
        {specimen.date_plantation && (
          <Text style={styles.info}>Planté le : {specimen.date_plantation}</Text>
        )}
        <View style={styles.gpsRow}>
          <Text style={styles.info}>
            GPS : {specimen.latitude != null && specimen.longitude != null
              ? `${specimen.latitude.toFixed(5)}, ${specimen.longitude.toFixed(5)}`
              : 'Non renseigné'}
          </Text>
          <TouchableOpacity
            style={[styles.revalidateGpsButton, updatingGps && styles.revalidateGpsButtonDisabled]}
            onPress={async () => {
              if (updatingGps) return;
              setUpdatingGps(true);
              try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Localisation refusée', 'Autorisez l\'accès à la position pour revalider les coordonnées.');
                  return;
                }
                const pos = await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.Balanced,
                });
                const updated = await updateSpecimen(specimen.id, {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                });
                setSpecimen(updated);
              } catch (err) {
                Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible d\'obtenir la position.');
              } finally {
                setUpdatingGps(false);
              }
            }}
            disabled={updatingGps}
          >
            {updatingGps ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="locate" size={18} color="#fff" />
                <Text style={styles.revalidateGpsText}>Revalider les coordonnées GPS</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        {specimen.notes && <Text style={styles.notes}>{specimen.notes}</Text>}
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
              <Text style={styles.eventDate}>📅 {r.date_rappel} • {REMINDER_ALERTE_LABELS[r.type_alerte]}</Text>
              {r.titre ? <Text style={styles.eventTitre}>{r.titre}</Text> : null}
            </TouchableOpacity>
          ))
        )}
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
        <FAB
          label="Ajouter un événement"
          icon="add-circle-outline"
          variant="primary"
          size="large"
          onPress={() => setEventModalVisible(true)}
        />
      </View>
      <AddEventModal
        visible={eventModalVisible}
        specimenId={specimen.id}
        onClose={() => setEventModalVisible(false)}
        onSuccess={(newEvent) => {
          setEvents([newEvent, ...events]);
          setEventModalVisible(false);
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
  statut: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  photoSection: {
    marginBottom: 24,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoLoader: {
    marginVertical: 16,
  },
  photoWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  specimenPhoto: {
    borderRadius: 12,
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
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  fullscreenActions: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 12,
    zIndex: 10,
  },
  fullscreenActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#1a3c27',
    borderRadius: 12,
  },
  fullscreenActionButtonDisabled: {
    backgroundColor: '#4a6741',
    opacity: 0.9,
  },
  fullscreenActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  fullscreenDeleteButton: {
    backgroundColor: '#c44',
  },
  fullscreenDeleteText: {
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
  info: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
  },
  gpsRow: { marginTop: 8, marginBottom: 4 },
  revalidateGpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#4a6741',
    borderRadius: 10,
  },
  revalidateGpsButtonDisabled: { opacity: 0.7 },
  revalidateGpsText: { fontSize: 14, fontWeight: '600', color: '#fff' },
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
