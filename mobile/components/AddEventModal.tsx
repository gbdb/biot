import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  createSpecimenEvent,
  createSpecimenReminder,
  updateSpecimen,
} from '@/api/client';
import { getApiBaseUrl } from '@/constants/config';
import type { Event, EventType, Reminder, ReminderType, ReminderAlerteType, ReminderRecurrenceRule } from '@/types/api';
import { EVENT_TYPE_LABELS, REMINDER_TYPE_LABELS, REMINDER_ALERTE_LABELS, REMINDER_RECURRENCE_LABELS } from '@/types/api';
import { FAB } from '@/components/FAB';
import { AddEventPhotoModal, getPhotoThumbUri, type PhotoOrPending } from '@/components/AddEventPhotoModal';
import { Ionicons } from '@expo/vector-icons';

const EVENT_TYPES: EventType[] = [
  'plantation',
  'observation',
  'taille',
  'floraison',
  'fructification',
  'recolte',
  'arrosage',
  'maladie',
  'traitement',
  'amendement',
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

const PHOTO_TYPE_LABELS: Record<string, string> = {
  avant: 'Avant',
  apres: 'Après',
  autre: 'Autre',
};

const REMINDER_TYPE_ICONS: Record<ReminderType, keyof typeof Ionicons.glyphMap> = {
  arrosage: 'water-outline',
  suivi_maladie: 'medical-outline',
  taille: 'cut-outline',
  suivi_general: 'eye-outline',
  cueillette: 'basket-outline',
};

const REMINDER_ALERTE_ICONS: Record<ReminderAlerteType, keyof typeof Ionicons.glyphMap> = {
  email: 'mail-outline',
  popup: 'notifications-outline',
  son: 'volume-high-outline',
};

function formatDateForInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface AddEventModalProps {
  visible: boolean;
  specimenId: number;
  onClose: () => void;
  onSuccess: (event: Event) => void;
  onReminderSuccess?: (reminder: Reminder) => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  /** Pre-fill event type (e.g. plantation). */
  initialTypeEvent?: EventType;
  /** Pre-fill date (e.g. today for plantation). */
  initialDate?: string;
  /** If true, hide reminder mode and show only event form (e.g. scan quick-add). */
  eventOnly?: boolean;
}

export function AddEventModal({
  visible,
  specimenId,
  onClose,
  onSuccess,
  onReminderSuccess,
  submitting,
  setSubmitting,
  initialTypeEvent,
  initialDate,
  eventOnly = false,
}: AddEventModalProps) {
  const [mode, setMode] = useState<'event' | 'reminder'>('event');
  const [typeEvent, setTypeEvent] = useState<EventType>(initialTypeEvent ?? 'observation');
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
  const [mortEnlevementStep, setMortEnlevementStep] = useState<null | 'form_mort' | 'form_enlever'>(null);

  useEffect(() => {
    if (visible) {
      setTypeEvent(initialTypeEvent ?? 'observation');
      setDateRappel(initialDate ?? formatDateForInput(new Date()));
    }
  }, [visible, initialTypeEvent, initialDate]);

  const resetAndClose = () => {
    setCreatedEvent(null);
    setCreatedPhotos([]);
    setTitre('');
    setDescription('');
    setTypeEvent(initialTypeEvent ?? 'observation');
    setTypeRappel('arrosage');
    setDateRappel(formatDateForInput(new Date()));
    setTypeAlerte('popup');
    setRecurrenceRule('none');
    setShowDatePicker(false);
    setMode('event');
    setMortEnlevementStep(null);
    onClose();
  };

  const handleSubmitEvent = async () => {
    setSubmitting(true);
    try {
      const payload: { type_event: EventType; titre?: string; description?: string; date?: string } = {
        type_event: typeEvent,
        titre: titre.trim() || undefined,
        description: description.trim() || undefined,
      };
      if (initialDate) payload.date = initialDate;
      const newEvent = await createSpecimenEvent(specimenId, payload);
      if (mortEnlevementStep === 'form_mort') {
        await updateSpecimen(specimenId, { statut: 'mort' });
        onSuccess(newEvent);
        setSubmitting(false);
        Alert.alert(
          'Avez-vous enlevé le spécimen ?',
          undefined,
          [
            {
              text: 'Non',
              onPress: () => {
                Alert.alert(
                  'Rappel',
                  'Souhaitez-vous créer un rappel pour enlever le spécimen plus tard ?',
                  [
                    { text: 'Non', onPress: () => resetAndClose() },
                    {
                      text: 'Oui',
                      onPress: () => {
                        setMode('reminder');
                        setTitre('Enlever le spécimen');
                        setTypeRappel('suivi_general');
                        setMortEnlevementStep(null);
                      },
                    },
                  ]
                );
              },
            },
            {
              text: 'Oui',
              onPress: () => {
                setTypeEvent('enlever');
                setTitre('');
                setDescription('');
                setMortEnlevementStep('form_enlever');
              },
            },
          ]
        );
        return;
      }
      if (mortEnlevementStep === 'form_enlever') {
        onSuccess(newEvent);
        resetAndClose();
        return;
      }
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
              {!eventOnly && (
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
              )}

              {mode === 'event' ? (
                <>
                  {mortEnlevementStep === null ? (
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
                  ) : (
                    <Text style={[modalStyles.label, { marginBottom: 8 }]}>
                      Type : {EVENT_TYPE_LABELS[typeEvent]}
                    </Text>
                  )}
                  {mortEnlevementStep === null && (
                    <TouchableOpacity
                      style={[modalStyles.typeButton, { marginTop: 12, backgroundColor: '#4a3728', borderColor: '#4a3728' }]}
                      onPress={() => {
                        Alert.alert(
                          'Mort et enlèvement',
                          'Nous sommes désolés pour la perte de ce spécimen. Souhaitez-vous enregistrer sa mort et, si besoin, son enlèvement ?',
                          [
                            { text: 'Annuler', style: 'cancel' },
                            {
                              text: 'Confirmer',
                              onPress: () => {
                                setTypeEvent('mort');
                                setTitre('');
                                setDescription('');
                                setMortEnlevementStep('form_mort');
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={[modalStyles.typeButtonText, { color: '#fff' }]}>
                        Mort et enlèvement
                      </Text>
                    </TouchableOpacity>
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
                    onPress={handleSubmitEvent}
                    disabled={submitting}
                    style={{ marginTop: 24 }}
                  />
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
                        <Ionicons
                          name={REMINDER_TYPE_ICONS[t]}
                          size={18}
                          color={typeRappel === t ? '#fff' : '#1a3c27'}
                          style={{ marginRight: 6 }}
                        />
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
                        <Ionicons
                          name={REMINDER_ALERTE_ICONS[t]}
                          size={18}
                          color={typeAlerte === t ? '#fff' : '#1a3c27'}
                          style={{ marginRight: 6 }}
                        />
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
                    onPress={handleSubmitReminder}
                    disabled={submitting}
                    style={{ marginTop: 24 }}
                  />
                </>
              )}
            </>
          ) : (
            <>
              <Text style={eventDetailStyles.photoTitle}>Photos ({createdPhotos.length})</Text>
              <View style={eventDetailStyles.photoList}>
                {createdPhotos.map((p) => {
                  const thumbUri = getPhotoThumbUri(p, getApiBaseUrl());
                  return (
                    <View key={p.id} style={eventDetailStyles.photoItem}>
                      {thumbUri ? (
                        <Image source={{ uri: thumbUri }} style={eventDetailStyles.photoThumb} />
                      ) : (
                        <View style={[eventDetailStyles.photoThumb, { justifyContent: 'center', alignItems: 'center' }]}>
                          <Text style={{ color: '#888' }}>…</Text>
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
});

const modalStyles = StyleSheet.create({
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
    flexDirection: 'row',
    alignItems: 'center',
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
});

const eventDetailStyles = StyleSheet.create({
  photoTitle: { fontSize: 16, fontWeight: '600', color: '#1a3c27', marginBottom: 8 },
  photoList: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 16 },
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
});
