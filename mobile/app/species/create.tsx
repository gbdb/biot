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
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { createOrganism, getOrganisms, ApiValidationError } from '@/api/client';
import type { OrganismMinimal } from '@/types/api';

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'arbre_fruitier', label: '🌳 Arbre fruitier' },
  { value: 'arbre_noix', label: '🌰 Arbre à noix' },
  { value: 'arbre_ornement', label: "🌲 Arbre d'ornement" },
  { value: 'arbre_bois', label: '🪵 Arbre forestier' },
  { value: 'arbuste_fruitier', label: '🫐 Arbuste fruitier' },
  { value: 'arbuste_baies', label: '🫐 Arbuste à baies' },
  { value: 'arbuste', label: '🌿 Arbuste' },
  { value: 'vivace', label: '🌸 Vivace' },
  { value: 'annuelle', label: '🌻 Annuelle' },
  { value: 'bisannuelle', label: '🌷 Bisannuelle' },
  { value: 'herbe_aromatique', label: '🌿 Herbe aromatique' },
  { value: 'legume', label: '🥕 Légume' },
  { value: 'grimpante', label: '🌿 Grimpante' },
  { value: 'couvre_sol', label: '🌱 Couvre-sol' },
  { value: 'champignon_comestible', label: '🍄 Champignon comestible' },
  { value: 'champignon_mycorhize', label: '🍄 Champignon mycorhizien' },
  { value: 'mousse', label: '🟢 Mousse' },
];

const DEBOUNCE_MS = 400;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function SpeciesCreateScreen() {
  const router = useRouter();
  const [nomCommun, setNomCommun] = useState('');
  const [nomLatin, setNomLatin] = useState('');
  const [typeOrganisme, setTypeOrganisme] = useState('vivace');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ nom_commun?: string; nom_latin?: string }>({});
  const [similarModalVisible, setSimilarModalVisible] = useState(false);
  const [similarOrganisms, setSimilarOrganisms] = useState<OrganismMinimal[]>([]);

  // Recherche en temps réel (debounced)
  const searchTerm = `${nomCommun.trim()} ${nomLatin.trim()}`.trim();
  const debouncedSearch = useDebounce(searchTerm, DEBOUNCE_MS);
  const [suggestions, setSuggestions] = useState<OrganismMinimal[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);
    getOrganisms({ search: debouncedSearch })
      .then(setSuggestions)
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionsLoading(false));
  }, [debouncedSearch]);

  const validate = (): boolean => {
    const err: { nom_commun?: string; nom_latin?: string } = {};
    if (!nomCommun.trim()) err.nom_commun = 'Le nom commun est obligatoire';
    if (!nomLatin.trim()) err.nom_latin = 'Le nom latin est obligatoire';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const doCreate = useCallback(
    async (forceCreate: boolean) => {
      setSubmitting(true);
      setErrors({});

      try {
        await createOrganism({
          nom_commun: nomCommun.trim(),
          nom_latin: nomLatin.trim(),
          type_organisme: typeOrganisme,
          force_create: forceCreate,
        });
        setSimilarModalVisible(false);
        Alert.alert('Espèce créée', "L'espèce a été ajoutée à la liste.", [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch (err) {
        if (err instanceof ApiValidationError) {
          const data = err.data;
          const code = data?.code as string | undefined;

          if (code === 'duplicate') {
            const existing = data?.existing as OrganismMinimal | undefined;
            if (existing) {
              Alert.alert(
                'Espèce existante',
                "Cette espèce existe déjà. Souhaitez-vous créer un spécimen avec cette espèce ?",
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Créer un spécimen',
                    onPress: () => router.replace(`/specimen/create?organisme=${existing.id}`),
                  },
                ]
              );
            } else {
              Alert.alert('Espèce existante', err.message);
            }
          } else if (code === 'similar') {
            const organisms = (data?.organisms ?? []) as OrganismMinimal[];
            setSimilarOrganisms(organisms);
            setSimilarModalVisible(true);
          } else {
            Alert.alert('Erreur', err.message);
          }
        } else {
          const msg = err instanceof Error ? err.message : 'Erreur lors de la création';
          Alert.alert('Erreur', msg);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [nomCommun, nomLatin, typeOrganisme, router]
  );

  const handleSubmit = () => {
    if (!validate()) return;
    doCreate(false);
  };

  const handleUseExisting = (org: OrganismMinimal) => {
    setSimilarModalVisible(false);
    router.replace(`/specimen/create?organisme=${org.id}`);
  };

  const handleCreateAnyway = () => {
    setSimilarModalVisible(false);
    doCreate(true);
  };

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
        <Text style={styles.label}>Nom commun *</Text>
        <TextInput
          style={[styles.input, errors.nom_commun && styles.inputError]}
          value={nomCommun}
          onChangeText={setNomCommun}
          placeholder="Ex: Pommier Dolgo, Basilic"
          placeholderTextColor="#888"
          autoCapitalize="words"
        />
        {errors.nom_commun && (
          <Text style={styles.errorText}>{errors.nom_commun}</Text>
        )}

        <Text style={styles.label}>Nom latin *</Text>
        <TextInput
          style={[styles.input, errors.nom_latin && styles.inputError]}
          value={nomLatin}
          onChangeText={setNomLatin}
          placeholder="Ex: Malus × robusta, Ocimum basilicum"
          placeholderTextColor="#888"
          autoCapitalize="none"
        />
        {errors.nom_latin && (
          <Text style={styles.errorText}>{errors.nom_latin}</Text>
        )}

        {/* Suggestions en temps réel */}
        {searchTerm.length >= 2 && (
          <View style={styles.suggestionsBox}>
            <View style={styles.suggestionsTitleRow}>
              <Text style={styles.suggestionsTitle}>Espèces similaires</Text>
              {suggestionsLoading && (
                <ActivityIndicator size="small" color="#1a3c27" style={{ marginLeft: 8 }} />
              )}
            </View>
            {suggestionsLoading && suggestions.length === 0 ? (
              <Text style={styles.suggestionsHint}>Recherche...</Text>
            ) : suggestions.length > 0 ? (
              <View style={styles.suggestionsList}>
                {suggestions.slice(0, 5).map((org) => (
                  <TouchableOpacity
                    key={org.id}
                    style={styles.suggestionItem}
                    onPress={() => handleUseExisting(org)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionItemTitle}>{org.nom_commun}</Text>
                    <Text style={styles.suggestionItemSubtitle}>{org.nom_latin}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.suggestionsHint}>
                Aucune espèce trouvée. Vous pouvez en créer une nouvelle.
              </Text>
            )}
          </View>
        )}

        <Text style={styles.label}>Type d&apos;organisme</Text>
        <View style={styles.typeGrid}>
          {TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.typeChip,
                typeOrganisme === opt.value && styles.typeChipActive,
              ]}
              onPress={() => setTypeOrganisme(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.typeChipText,
                  typeOrganisme === opt.value && styles.typeChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting ? 'Création...' : "Créer l'espèce"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal espèces similaires */}
      <Modal
        visible={similarModalVisible}
        animationType="slide"
        onRequestClose={() => setSimilarModalVisible(false)}
      >
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <TouchableOpacity
              onPress={() => setSimilarModalVisible(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={modalStyles.closeBtn}>✕</Text>
            </TouchableOpacity>
            <Text style={modalStyles.headerTitle}>Espèces similaires</Text>
            <View style={{ width: 28 }} />
          </View>
          <Text style={modalStyles.message}>
            Des espèces similaires existent. Utilisez-en une ou créez quand même.
          </Text>
          <FlatList
            data={similarOrganisms}
            keyExtractor={(item) => String(item.id)}
            style={modalStyles.list}
            contentContainerStyle={modalStyles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={modalStyles.item}
                onPress={() => handleUseExisting(item)}
                activeOpacity={0.7}
              >
                <Text style={modalStyles.itemTitle}>{item.nom_commun}</Text>
                <Text style={modalStyles.itemSubtitle}>{item.nom_latin}</Text>
              </TouchableOpacity>
            )}
          />
          <View style={modalStyles.footer}>
            <TouchableOpacity
              style={modalStyles.createAnywayBtn}
              onPress={handleCreateAnyway}
              disabled={submitting}
            >
              <Text style={modalStyles.createAnywayText}>Créer quand même</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a3c27',
    marginBottom: 8,
    marginTop: 16,
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
  inputError: {
    borderColor: '#c44',
  },
  errorText: {
    fontSize: 12,
    color: '#c44',
    marginTop: 4,
  },
  suggestionsBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  suggestionsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a3c27',
  },
  suggestionsHint: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  suggestionsList: {
    gap: 8,
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f0',
    borderRadius: 8,
  },
  suggestionItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a3c27',
  },
  suggestionItemSubtitle: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  typeChipActive: {
    backgroundColor: '#1a3c27',
    borderColor: '#1a3c27',
  },
  typeChipText: {
    fontSize: 14,
    color: '#1a3c27',
  },
  typeChipTextActive: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#1a3c27',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});

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
  message: {
    fontSize: 14,
    color: '#666',
    padding: 16,
  },
  list: { flex: 1 },
  listContent: { padding: 16, paddingTop: 0 },
  item: {
    backgroundColor: '#f5f5f0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#1a3c27' },
  itemSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  footer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  createAnywayBtn: {
    backgroundColor: '#4a6741',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  createAnywayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
