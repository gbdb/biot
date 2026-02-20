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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  getSpecimen,
  getSpecimenEvents,
  duplicateSpecimen,
  createSpecimenEvent,
} from '@/api/client';
import type { SpecimenDetail, Event, EventType } from '@/types/api';
import { SPECIMEN_STATUT_LABELS, EVENT_TYPE_LABELS } from '@/types/api';

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

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const newEvent = await createSpecimenEvent(specimenId, {
        type_event: typeEvent,
        titre: titre.trim() || undefined,
        description: description.trim() || undefined,
      });
      onSuccess(newEvent);
      setTitre('');
      setDescription('');
      setTypeEvent('observation');
    } catch {
      // Erreur gérée silencieusement (ou toast à ajouter)
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={modalStyles.overlay}
      >
        <TouchableOpacity
          style={modalStyles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={modalStyles.content}
          onStartShouldSetResponder={() => true}
        >
          <Text style={modalStyles.title}>Ajouter un événement</Text>
          <ScrollView
            style={modalStyles.typeGrid}
            showsVerticalScrollIndicator={false}
          >
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
          <View style={modalStyles.actions}>
            <TouchableOpacity
              style={[modalStyles.button, modalStyles.cancelButton]}
              onPress={onClose}
            >
              <Text style={modalStyles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.button, modalStyles.submitButton]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={modalStyles.submitButtonText}>
                {submitting ? 'Enregistrement...' : 'Enregistrer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
    maxHeight: 200,
    marginBottom: 12,
  },
  typeButton: {
    padding: 12,
    backgroundColor: '#f0f0eb',
    borderRadius: 10,
    marginBottom: 8,
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
            <View key={ev.id} style={styles.eventRow}>
              <Text style={styles.eventType}>{EVENT_TYPE_LABELS[ev.type_event]}</Text>
              <Text style={styles.eventDate}>{ev.date}</Text>
              {ev.titre ? <Text style={styles.eventTitre}>{ev.titre}</Text> : null}
            </View>
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
