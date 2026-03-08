import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { getGardenGCPs, createGardenGCP } from '@/api/client';
import type { GardenGCPCreate } from '@/api/client';

export default function GCPCreateScreen() {
  const { id: gardenId } = useLocalSearchParams<{ id: string }>();
  const [label, setLabel] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; type?: string; name?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureLocation = useCallback(async () => {
    setError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Autorisation de localisation refusée');
      return;
    }
    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Best,
        mayShowUserSettings: true,
      });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      setAccuracy(loc.coords.accuracy ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible d\'obtenir la position');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    captureLocation();
  }, [captureLocation]);

  useEffect(() => {
    if (!gardenId) return;
    const numId = parseInt(gardenId, 10);
    if (isNaN(numId)) return;
    getGardenGCPs(numId)
      .then((gcps) => {
        const numbers = gcps
          .map((g) => {
            const m = g.label.match(/GCP-(\d+)/i);
            return m ? parseInt(m[1], 10) : 0;
          })
          .filter((n) => n > 0);
        const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
        setLabel('GCP-' + String(next).padStart(2, '0'));
      })
      .catch(() => setLabel('GCP-01'));
  }, [gardenId]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'Accès à la galerie requis pour ajouter une photo.');
      return;
    }
    const result = await ImagePicker.launchImagePickerAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto({
        uri: result.assets[0].uri,
        type: 'image/jpeg',
        name: 'gcp.jpg',
      });
    }
  };

  const handleSave = async () => {
    if (!gardenId || latitude == null || longitude == null || !label.trim()) {
      Alert.alert('Champs requis', 'Label et coordonnées GPS sont obligatoires.');
      return;
    }
    const numId = parseInt(gardenId, 10);
    if (isNaN(numId)) return;
    setSubmitting(true);
    try {
      const data: GardenGCPCreate = {
        label: label.trim(),
        latitude,
        longitude,
        notes: notes.trim() || undefined,
        photo: photo ?? undefined,
      };
      await createGardenGCP(numId, data);
      router.replace(`/garden/${gardenId}/terrain`);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de créer le point de contrôle.');
    } finally {
      setSubmitting(false);
    }
  };

  const accuracyWarning = accuracy != null && accuracy > 5;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Nouveau point de contrôle (GCP)</Text>
      <Text style={styles.hint}>Placez le piquet rouge devant vous, puis capturez la position.</Text>

      {loading ? (
        <View style={styles.row}>
          <ActivityIndicator size="small" color="#1a3c27" />
          <Text style={styles.label}>Acquisition GPS…</Text>
        </View>
      ) : (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>Coordonnées</Text>
          </View>
          {latitude != null && longitude != null && (
            <View style={styles.coords}>
              <Text style={styles.coordText}>
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </Text>
              {accuracy != null && (
                <Text style={styles.accuracyText}>Précision estimée : {Math.round(accuracy)} m</Text>
              )}
            </View>
          )}
          {accuracyWarning && (
            <View style={styles.warning}>
              <Text style={styles.warningText}>
                Précision insuffisante ({Math.round(accuracy!)} m) — attendre ou se déplacer en zone dégagée.
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.buttonSecondary} onPress={captureLocation} disabled={loading}>
            <Text style={styles.buttonSecondaryText}>Recharger la position</Text>
          </TouchableOpacity>
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.inputLabel}>Label *</Text>
      <TextInput
        style={styles.input}
        value={label}
        onChangeText={setLabel}
        placeholder="GCP-01"
        autoCapitalize="characters"
      />

      <TouchableOpacity style={styles.buttonSecondary} onPress={pickImage}>
        <Text style={styles.buttonSecondaryText}>{photo ? 'Changer la photo du piquet' : 'Photo du piquet (optionnel)'}</Text>
      </TouchableOpacity>
      {photo && <Text style={styles.photoHint}>Photo ajoutée</Text>}

      <Text style={styles.inputLabel}>Notes (optionnel)</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Ex: près du ruisseau"
        multiline
        numberOfLines={2}
      />

      <TouchableOpacity
        style={[styles.buttonPrimary, submitting && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={submitting || loading}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonPrimaryText}>Enregistrer le GCP</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#1a3c27', marginBottom: 8 },
  hint: { fontSize: 14, color: '#666', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 14, color: '#333' },
  coords: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e8e8e8' },
  coordText: { fontFamily: 'monospace', fontSize: 14, color: '#1a3c27' },
  accuracyText: { fontSize: 12, color: '#666', marginTop: 4 },
  warning: { backgroundColor: '#fef3cd', padding: 12, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#c4832a' },
  warningText: { fontSize: 13, color: '#856404' },
  error: { color: '#b83a3a', fontSize: 14, marginBottom: 12 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 12, padding: 12, fontSize: 16 },
  inputMultiline: { minHeight: 60, textAlignVertical: 'top' },
  buttonSecondary: { backgroundColor: '#e8e8e8', padding: 14, borderRadius: 12, marginTop: 8, alignItems: 'center' },
  buttonSecondaryText: { fontSize: 15, color: '#1a3c27', fontWeight: '600' },
  buttonPrimary: { backgroundColor: '#1a3c27', padding: 16, borderRadius: 12, marginTop: 24, alignItems: 'center' },
  buttonPrimaryText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  buttonDisabled: { opacity: 0.7 },
  photoHint: { fontSize: 12, color: '#666', marginTop: 4 },
});
