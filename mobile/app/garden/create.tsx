/**
 * Création d'un nouveau jardin.
 * Accessible depuis l'onglet Jardins, l'onglet Espèces (aucun jardin) et les paramètres.
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { createGarden } from '@/api/client';

export default function GardenCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const [nom, setNom] = useState('');
  const [ville, setVille] = useState('');
  const [adresse, setAdresse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ nom?: string }>({});

  const validate = (): boolean => {
    const err: { nom?: string } = {};
    if (!nom.trim()) err.nom = 'Le nom du jardin est obligatoire';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || submitting) return;
    setSubmitting(true);
    setErrors({});
    try {
      const garden = await createGarden({
        nom: nom.trim(),
        ville: ville.trim() || undefined,
        adresse: adresse.trim() || undefined,
      });
      if (params.returnTo === 'settings') {
        router.replace('/settings');
      } else {
        router.replace(`/garden/${garden.id}`);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de créer le jardin. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Nom du jardin *</Text>
        <TextInput
          style={[styles.input, errors.nom && styles.inputError]}
          value={nom}
          onChangeText={setNom}
          placeholder="Ex: Potager familial, Jardin du balcon"
          placeholderTextColor="#888"
          autoCapitalize="words"
          editable={!submitting}
        />
        {errors.nom ? <Text style={styles.errorText}>{errors.nom}</Text> : null}

        <Text style={styles.label}>Ville</Text>
        <TextInput
          style={styles.input}
          value={ville}
          onChangeText={setVille}
          placeholder="Ex: Montréal"
          placeholderTextColor="#888"
          autoCapitalize="words"
          editable={!submitting}
        />

        <Text style={styles.label}>Adresse</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={adresse}
          onChangeText={setAdresse}
          placeholder="Rue, code postal..."
          placeholderTextColor="#888"
          multiline
          numberOfLines={2}
          editable={!submitting}
        />

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.7}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Créer le jardin</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a3c27',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  inputError: { borderColor: '#c44' },
  errorText: { fontSize: 14, color: '#c44', marginTop: 4 },
  submitBtn: {
    backgroundColor: '#1a3c27',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 28,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
