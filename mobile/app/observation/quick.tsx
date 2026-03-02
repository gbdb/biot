import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  getOrganismInconnu,
  createSpecimen,
  getGardens,
  uploadSpecimenPhoto,
} from '@/api/client';
import type { OrganismMinimal, GardenMinimal } from '@/types/api';

function GardenPickerModal({
  visible,
  gardens,
  onSelect,
  onClose,
  onSelectNone,
}: {
  visible: boolean;
  gardens: GardenMinimal[];
  onSelect: (garden: GardenMinimal) => void;
  onClose: () => void;
  onSelectNone: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={modalStyles.closeBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={modalStyles.headerTitle}>Lieu (optionnel)</Text>
          <View style={{ width: 28 }} />
        </View>
        <TouchableOpacity
          style={modalStyles.item}
          onPress={() => {
            onSelectNone();
            onClose();
          }}
        >
          <Text style={modalStyles.itemText}>Aucun / Autre lieu</Text>
        </TouchableOpacity>
        <FlatList
          data={gardens}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={modalStyles.item}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <Text style={modalStyles.itemText}>{item.nom}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
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
  item: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemText: { fontSize: 16, color: '#333' },
});

function formatDate() {
  const d = new Date();
  return `Observation ${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function QuickObservationScreen() {
  const router = useRouter();
  const [inconnu, setInconnu] = useState<OrganismMinimal | null>(null);
  const [note, setNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [garden, setGarden] = useState<GardenMinimal | null>(null);
  const [zoneLabel, setZoneLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [gardens, setGardens] = useState<GardenMinimal[]>([]);
  const [gardenModalVisible, setGardenModalVisible] = useState(false);

  useEffect(() => {
    getOrganismInconnu()
      .then(setInconnu)
      .catch(() => setInconnu(null));
    getGardens().then(setGardens).catch(() => setGardens([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setLocationError('Localisation refusée');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setLocationError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLocationError(err instanceof Error ? err.message : 'Impossible d\'obtenir la position');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'La caméra est nécessaire pour prendre une photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!inconnu) {
      Alert.alert('Erreur', 'Organisme "Espèce non identifiée" introuvable. Vérifiez la connexion.');
      return;
    }

    setSubmitting(true);
    try {
      const nom = note.trim().slice(0, 50) || formatDate();
      const data = {
        organisme: inconnu.id,
        garden: garden?.id ?? null,
        nom,
        statut: 'jeune' as const,
        notes: note.trim() || undefined,
        latitude: location?.lat ?? undefined,
        longitude: location?.lng ?? undefined,
        zone_jardin: zoneLabel.trim() || undefined,
      };

      const created = await createSpecimen(data);
      const createdId = created?.id;

      if (photoUri && typeof createdId === 'number' && Number.isInteger(createdId)) {
        try {
          await uploadSpecimenPhoto(createdId, {
            image: {
              uri: photoUri,
              type: 'image/jpeg',
              name: 'observation.jpg',
            },
            type_photo: 'avant',
            titre: 'Observation',
          });
        } catch {
          // Photo upload failed but specimen was created
        }
      }

      if (typeof createdId === 'number' && Number.isInteger(createdId)) {
        router.replace(`/specimen/${createdId}`);
      } else {
        router.replace('/(tabs)/specimens');
        Alert.alert('Observation créée', 'Le spécimen a été créé. Retour à la liste.');
      }
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de créer l\'observation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!inconnu) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a3c27" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Observation rapide</Text>
        <Text style={styles.subtitle}>
          Plante, arbre ou champignon non identifié ? Prenez une photo et une note, la position GPS sera enregistrée.
        </Text>

        <Text style={styles.label}>Note (optionnel)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Décrivez ce que vous observez..."
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          placeholderTextColor="#888"
        />

        <Text style={styles.label}>Photo (optionnel)</Text>
        {photoUri ? (
          <View style={styles.photoRow}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            <TouchableOpacity
              style={styles.removePhotoBtn}
              onPress={() => setPhotoUri(null)}
            >
              <Text style={styles.removePhotoText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
            <Ionicons name="camera" size={40} color="#1a3c27" />
            <Text style={styles.photoButtonText}>Prendre une photo</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Position GPS</Text>
        {location ? (
          <Text style={styles.coords}>
            {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </Text>
        ) : locationError ? (
          <Text style={styles.coordsError}>{locationError}</Text>
        ) : (
          <Text style={styles.coords}>Acquisition en cours...</Text>
        )}

        <Text style={styles.label}>Lieu</Text>
        <TouchableOpacity
          style={styles.picker}
          onPress={() => setGardenModalVisible(true)}
          activeOpacity={0.7}
        >
          {garden ? (
            <Text style={styles.pickerText}>{garden.nom}</Text>
          ) : (
            <Text style={styles.pickerPlaceholder}>Mon jardin, forêt, autre...</Text>
          )}
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <Text style={styles.label}>Zone / Lieu personnalisé</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Forêt Est, Jardin de Marie, Sentier du ruisseau"
          value={zoneLabel}
          onChangeText={setZoneLabel}
          placeholderTextColor="#888"
        />

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Enregistrer l&apos;observation</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <GardenPickerModal
        visible={gardenModalVisible}
        gardens={gardens}
        onSelect={setGarden}
        onClose={() => setGardenModalVisible(false)}
        onSelectNone={() => setGarden(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f0',
  },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a3c27',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#4a6741',
    marginBottom: 24,
    lineHeight: 22,
  },
  label: { fontSize: 14, color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  photoButton: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  photoButtonText: { fontSize: 16, color: '#1a3c27', marginTop: 8 },
  photoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  photoPreview: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee' },
  removePhotoBtn: { padding: 8 },
  removePhotoText: { fontSize: 14, color: '#c44' },
  coords: { fontSize: 14, color: '#4a6741', marginBottom: 12, fontFamily: 'monospace' },
  coordsError: { fontSize: 14, color: '#c44', marginBottom: 12 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  pickerText: { fontSize: 16, color: '#1a3c27' },
  pickerPlaceholder: { fontSize: 16, color: '#888' },
  submitButton: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#1a3c27',
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 18, fontWeight: '600', color: '#fff' },
});
