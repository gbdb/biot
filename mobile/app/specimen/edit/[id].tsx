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
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NfcScanModal } from '@/components/NfcScanModal';
import {
  getSpecimen,
  updateSpecimen,
  getOrganisms,
  getGardens,
} from '@/api/client';
import type {
  OrganismMinimal,
  GardenMinimal,
  SpecimenDetail,
  SpecimenCreateUpdate,
  SpecimenStatut,
} from '@/types/api';
import { SPECIMEN_STATUT_LABELS } from '@/types/api';

function OrganismPickerModal({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (org: OrganismMinimal) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [organisms, setOrganisms] = useState<OrganismMinimal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    getOrganisms({ search: search.trim() || undefined })
      .then(setOrganisms)
      .catch(() => setOrganisms([]))
      .finally(() => setLoading(false));
  }, [visible, search]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={modalStyles.closeBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={modalStyles.headerTitle}>Choisir l&apos;espèce</Text>
          <View style={{ width: 28 }} />
        </View>
        <TextInput
          style={modalStyles.searchInput}
          placeholder="Rechercher (nom commun ou latin)..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#888"
          autoCapitalize="none"
        />
        {loading ? (
          <View style={modalStyles.centered}>
            <ActivityIndicator size="large" color="#1a3c27" />
          </View>
        ) : (
          <FlatList
            data={organisms}
            keyExtractor={(item) => String(item.id)}
            style={modalStyles.list}
            contentContainerStyle={modalStyles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={modalStyles.item}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text style={modalStyles.itemTitle}>{item.nom_commun}</Text>
                <Text style={modalStyles.itemSubtitle}>{item.nom_latin}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={modalStyles.emptyText}>
                {search ? 'Aucun résultat' : 'Chargement...'}
              </Text>
            }
          />
        )}
      </View>
    </Modal>
  );
}

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
          <Text style={modalStyles.headerTitle}>Choisir le jardin</Text>
          <View style={{ width: 28 }} />
        </View>
        <TouchableOpacity
          style={[modalStyles.item, { marginHorizontal: 16, marginTop: 12 }]}
          onPress={() => {
            onSelectNone();
            onClose();
          }}
          activeOpacity={0.7}
        >
          <Text style={modalStyles.itemTitle}>Aucun jardin</Text>
          <Text style={modalStyles.itemSubtitle}>Optionnel</Text>
        </TouchableOpacity>
        <FlatList
          data={gardens}
          keyExtractor={(item) => String(item.id)}
          style={modalStyles.list}
          contentContainerStyle={modalStyles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={modalStyles.item}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={modalStyles.itemTitle}>{item.nom}</Text>
              <Text style={modalStyles.itemSubtitle}>
                {[item.ville, item.adresse].filter(Boolean).join(' — ') || '—'}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

export default function SpecimenEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [specimen, setSpecimen] = useState<SpecimenDetail | null>(null);
  const [organisme, setOrganisme] = useState<OrganismMinimal | null>(null);
  const [nom, setNom] = useState('');
  const [garden, setGarden] = useState<GardenMinimal | null>(null);
  const [zoneJardin, setZoneJardin] = useState('');
  const [nfcTagUid, setNfcTagUid] = useState('');
  const [statut, setStatut] = useState<SpecimenStatut>('planifie');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ organisme?: string; nom?: string }>({});
  const [organismModalVisible, setOrganismModalVisible] = useState(false);
  const [gardenModalVisible, setGardenModalVisible] = useState(false);
  const [nfcScanModalVisible, setNfcScanModalVisible] = useState(false);
  const [gardens, setGardens] = useState<GardenMinimal[]>([]);

  useEffect(() => {
    if (!id) return;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      setLoading(false);
      return;
    }
    getSpecimen(numId)
      .then((s) => {
        setSpecimen(s);
        setOrganisme(s.organisme);
        setNom(s.nom);
        setGarden(s.garden);
        setZoneJardin(s.zone_jardin ?? '');
        setNfcTagUid(s.nfc_tag_uid ?? '');
        setStatut(s.statut);
        setNotes(s.notes ?? '');
      })
      .catch(() => setSpecimen(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    getGardens()
      .then(setGardens)
      .catch(() => setGardens([]));
  }, []);

  const validate = (): boolean => {
    const err: { organisme?: string; nom?: string } = {};
    if (!organisme) err.organisme = 'Choisir une espèce est obligatoire';
    if (!nom.trim()) err.nom = 'Le nom est obligatoire';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async () => {
    if (!specimen || !validate()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const data: Partial<SpecimenCreateUpdate> = {
        organisme: organisme!.id,
        garden: garden?.id ?? null,
        nom: nom.trim(),
        statut,
      };
      if (zoneJardin.trim()) data.zone_jardin = zoneJardin.trim();
      else data.zone_jardin = '';
      if (notes.trim()) data.notes = notes.trim();
      else data.notes = '';
      if (nfcTagUid.trim()) data.nfc_tag_uid = nfcTagUid.trim();
      else data.nfc_tag_uid = '';

      await updateSpecimen(specimen.id, data);
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la modification';
      Alert.alert('Erreur', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a3c27" />
      </View>
    );
  }

  if (!specimen) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Spécimen introuvable</Text>
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Champs obligatoires</Text>

          <Text style={styles.label}>Espèce *</Text>
          <TouchableOpacity
            style={[styles.picker, errors.organisme && styles.pickerError]}
            onPress={() => setOrganismModalVisible(true)}
            activeOpacity={0.7}
          >
            {organisme ? (
              <View>
                <Text style={styles.pickerText}>{organisme.nom_commun}</Text>
                <Text style={styles.pickerSubtext}>{organisme.nom_latin}</Text>
              </View>
            ) : (
              <Text style={styles.pickerPlaceholder}>Choisir l&apos;espèce</Text>
            )}
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          {errors.organisme ? <Text style={styles.errorText}>{errors.organisme}</Text> : null}

          <Text style={styles.label}>Nom *</Text>
          <TextInput
            style={[styles.input, errors.nom && styles.inputError]}
            placeholder="Ex: Pommier Dolgo #1, Basilic du balcon"
            value={nom}
            onChangeText={(t) => {
              setNom(t);
              setErrors((e) => ({ ...e, nom: undefined }));
            }}
            placeholderTextColor="#888"
          />
          {errors.nom ? <Text style={styles.errorText}>{errors.nom}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détails (optionnel)</Text>

          <Text style={styles.label}>Jardin</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setGardenModalVisible(true)}
            activeOpacity={0.7}
          >
            {garden ? (
              <View>
                <Text style={styles.pickerText}>{garden.nom}</Text>
                <Text style={styles.pickerSubtext}>
                  {[garden.ville, garden.adresse].filter(Boolean).join(' — ') || '—'}
                </Text>
              </View>
            ) : (
              <Text style={styles.pickerPlaceholder}>Aucun jardin</Text>
            )}
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <Text style={styles.label}>Zone jardin</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Zone Nord, Près du ruisseau"
            value={zoneJardin}
            onChangeText={setZoneJardin}
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>Tag NFC</Text>
          <View style={styles.nfcRow}>
            <TextInput
              style={[styles.input, styles.nfcInput]}
              placeholder="UID du tag (ex: 04A1B2C3D4E5F6)"
              value={nfcTagUid}
              onChangeText={setNfcTagUid}
              placeholderTextColor="#888"
              editable
            />
            <TouchableOpacity
              style={styles.scanTagButton}
              onPress={() => setNfcScanModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="scan-outline" size={24} color="#fff" />
              <Text style={styles.scanTagButtonText}>Scanner</Text>
            </TouchableOpacity>
          </View>
          {nfcTagUid ? (
            <TouchableOpacity
              style={styles.clearTagButton}
              onPress={() => setNfcTagUid('')}
            >
              <Text style={styles.clearTagText}>Effacer le tag</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.label}>Statut</Text>
          <Text style={styles.statutValue}>{SPECIMEN_STATUT_LABELS[statut]}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statutScroll}>
            {(['planifie', 'commande', 'transplanter', 'jeune', 'etabli', 'mature', 'declin', 'mort', 'enleve'] as SpecimenStatut[]).map(
              (s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statutChip, statut === s && styles.statutChipSelected]}
                  onPress={() => setStatut(s)}
                >
                  <Text style={[styles.statutChipText, statut === s && styles.statutChipTextSelected]}>
                    {SPECIMEN_STATUT_LABELS[s]}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </ScrollView>

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Notes supplémentaires"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholderTextColor="#888"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Enregistrer les modifications</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <OrganismPickerModal
        visible={organismModalVisible}
        onSelect={setOrganisme}
        onClose={() => setOrganismModalVisible(false)}
      />
      <GardenPickerModal
        visible={gardenModalVisible}
        gardens={gardens}
        onSelect={setGarden}
        onClose={() => setGardenModalVisible(false)}
        onSelectNone={() => setGarden(null)}
      />
      <NfcScanModal
        visible={nfcScanModalVisible}
        onSuccess={(uid) => setNfcTagUid(uid)}
        onClose={() => setNfcScanModalVisible(false)}
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
  error: { fontSize: 16, color: '#c44' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a3c27',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  inputError: {
    borderColor: '#c44',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
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
  pickerError: {
    borderColor: '#c44',
  },
  pickerText: { fontSize: 16, color: '#1a3c27', fontWeight: '500' },
  pickerSubtext: { fontSize: 14, color: '#666', marginTop: 2 },
  pickerPlaceholder: { fontSize: 16, color: '#888' },
  errorText: { fontSize: 12, color: '#c44', marginTop: -12, marginBottom: 12 },
  statutValue: { fontSize: 14, color: '#666', marginBottom: 8 },
  statutScroll: { marginBottom: 12 },
  statutChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0eb',
    marginRight: 8,
  },
  statutChipSelected: {
    backgroundColor: '#1a3c27',
  },
  statutChipText: { fontSize: 14, color: '#333' },
  statutChipTextSelected: { fontSize: 14, color: '#fff', fontWeight: '600' },
  nfcRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  nfcInput: { flex: 1, marginBottom: 0 },
  scanTagButton: {
    backgroundColor: '#1a3c27',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  scanTagButtonText: { fontSize: 14, fontWeight: '600', color: '#fff', marginTop: 4 },
  clearTagButton: { marginBottom: 12 },
  clearTagText: { fontSize: 14, color: '#666' },
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
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    margin: 16,
    backgroundColor: '#fff',
  },
  list: { flex: 1 },
  listContent: { padding: 16, paddingTop: 0 },
  item: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#1a3c27' },
  itemSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
