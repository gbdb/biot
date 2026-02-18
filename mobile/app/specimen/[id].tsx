import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { getSpecimen, getSpecimenEvents } from '@/api/client';
import type { SpecimenDetail, Event } from '@/types/api';
import { SPECIMEN_STATUT_LABELS, EVENT_TYPE_LABELS } from '@/types/api';

export default function SpecimenDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [specimen, setSpecimen] = useState<SpecimenDetail | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          onPress={() => {
            // TODO: modal ajout événement
          }}
        >
          <Text style={styles.addEventText}>+ Ajouter un événement</Text>
        </TouchableOpacity>
      </View>
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
  error: {
    color: '#c44',
    fontSize: 16,
  },
});
