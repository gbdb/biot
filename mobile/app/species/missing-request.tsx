/**
 * Demande d’espèce absente du catalogue (Radix Sylva) — puis confirmation et lien création spécimen.
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useMemo } from 'react';
import { postMissingSpeciesRequest } from '@/api/client';
import type { MissingSpeciesResponse } from '@/types/api';

export default function MissingSpeciesRequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ search_query?: string | string[] }>();
  const initialSearch = useMemo(() => {
    const raw = params.search_query;
    const s = raw == null ? '' : Array.isArray(raw) ? raw[0] : raw;
    return s || '';
  }, [params.search_query]);

  const [nomLatin, setNomLatin] = useState(initialSearch);
  const [nomCommun, setNomCommun] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<MissingSpeciesResponse | null>(null);

  const handleSubmit = async () => {
    const latin = nomLatin.trim();
    if (!latin) {
      Alert.alert('Nom latin requis', 'Indiquez au moins le nom scientifique (latin).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await postMissingSpeciesRequest({
        nom_latin: latin,
        nom_commun: nomCommun.trim() || undefined,
        search_query: initialSearch || undefined,
      });
      setResult(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Échec de la demande.';
      Alert.alert('Erreur', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const org = result.organism;
    const syncErr = result.sync_error === true;
    const displayName =
      org?.nom_latin ||
      org?.nom_commun ||
      (nomLatin.trim() || 'Cette espèce');

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.confirmTitle}>Demande enregistrée</Text>
          {org && !syncErr ? (
            <>
              <Text style={styles.confirmBody}>
                « {displayName} » est disponible dans le catalogue. La fiche Radix Sylva sera enrichie
                progressivement (VASCAN et autres sources).
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.replace(`/specimen/create?organisme=${org.id}`)}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Créer un spécimen</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.confirmBody}>
              L’espèce a été acceptée côté serveur botanique, mais elle n’a pas encore été copiée dans
              l’app. Réessayez plus tard ou après une synchronisation du catalogue.
            </Text>
          )}
          <Text style={styles.hintMuted}>{result.message}</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.secondaryBtnText}>Fermer</Text>
          </TouchableOpacity>
        </ScrollView>
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
      >
        <Text style={styles.intro}>
          Proposez une espèce absente du catalogue. Elle sera créée sur Radix Sylva puis ajoutée à votre
          catalogue.
        </Text>
        <Text style={styles.label}>Nom latin *</Text>
        <TextInput
          style={styles.input}
          value={nomLatin}
          onChangeText={setNomLatin}
          placeholder="Ex. Malus × robusta"
          placeholderTextColor="#888"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Nom commun (optionnel)</Text>
        <TextInput
          style={styles.input}
          value={nomCommun}
          onChangeText={setNomCommun}
          placeholder="Ex. Pommier Dolgo"
          placeholderTextColor="#888"
          autoCapitalize="words"
        />
        <TouchableOpacity
          style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Envoyer la demande</Text>
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
  intro: {
    fontSize: 14,
    color: '#444',
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a3c27',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a3c27',
  },
  primaryBtn: {
    backgroundColor: '#1a3c27',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 28,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 17, fontWeight: '600', color: '#fff' },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a3c27',
    marginBottom: 16,
  },
  confirmBody: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
  },
  hintMuted: {
    fontSize: 13,
    color: '#666',
    marginTop: 12,
    fontStyle: 'italic',
  },
  secondaryBtn: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 16, color: '#1a3c27', fontWeight: '600' },
});
