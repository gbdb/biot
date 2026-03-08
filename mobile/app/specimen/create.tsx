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
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { NfcScanModal } from '@/components/NfcScanModal';
import {
  createSpecimen,
  getOrganisms,
  getGardens,
  getOrganism,
  getCultivarsPaginated,
  getCultivar,
  getUserPreferences,
} from '@/api/client';
import type {
  OrganismMinimal,
  GardenMinimal,
  SpecimenCreateUpdate,
  SpecimenStatut,
  CultivarListEntry,
  CultivarPorteGreffeEntry,
} from '@/types/api';
import { SPECIMEN_STATUT_LABELS } from '@/types/api';
import { AddEventModal } from '@/components/AddEventModal';

const DEFAULT_STATUT: SpecimenStatut = 'planifie';

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
  onCreateGarden,
}: {
  visible: boolean;
  gardens: GardenMinimal[];
  onSelect: (garden: GardenMinimal) => void;
  onClose: () => void;
  onSelectNone: () => void;
  onCreateGarden?: () => void;
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
          ListFooterComponent={
            onCreateGarden ? (
              <TouchableOpacity
                style={[modalStyles.item, modalStyles.itemCreate]}
                onPress={() => {
                  onClose();
                  onCreateGarden();
                }}
                activeOpacity={0.7}
              >
                <Text style={modalStyles.itemTitleCreate}>+ Créer un jardin</Text>
              </TouchableOpacity>
            ) : null
          }
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
  itemText: { fontSize: 16, color: '#1a3c27' },
  itemCreate: { borderStyle: 'dashed', borderColor: '#1a3c27' },
  itemTitleCreate: { fontSize: 16, fontWeight: '600', color: '#1a3c27' },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default function SpecimenCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    nfc_tag_uid?: string;
    organisme?: string;
    garden?: string;
    cultivar?: string;
    latitude?: string;
    longitude?: string;
  }>();
  const [organisme, setOrganisme] = useState<OrganismMinimal | null>(null);
  const [cultivar, setCultivar] = useState<CultivarListEntry | null>(null);
  const [cultivarDetail, setCultivarDetail] = useState<{ porte_greffes?: CultivarPorteGreffeEntry[] } | null>(null);
  const [selectedPorteGreffe, setSelectedPorteGreffe] = useState<CultivarPorteGreffeEntry | null | 'unknown'>(null);
  const [cultivarsForOrganism, setCultivarsForOrganism] = useState<CultivarListEntry[]>([]);
  const [cultivarModalVisible, setCultivarModalVisible] = useState(false);
  const [nom, setNom] = useState('');
  const [garden, setGarden] = useState<GardenMinimal | null>(null);
  const [zoneJardin, setZoneJardin] = useState('');
  const [nfcTagUid, setNfcTagUid] = useState<string>(params.nfc_tag_uid ?? '');
  const [statut, setStatut] = useState<SpecimenStatut>(DEFAULT_STATUT);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ organisme?: string; nom?: string }>({});
  const [organismModalVisible, setOrganismModalVisible] = useState(false);
  const [gardenModalVisible, setGardenModalVisible] = useState(false);
  const [nfcScanModalVisible, setNfcScanModalVisible] = useState(false);
  const [gardens, setGardens] = useState<GardenMinimal[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [createdIdForPlantation, setCreatedIdForPlantation] = useState<number | null>(null);
  const [plantationModalVisible, setPlantationModalVisible] = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [eventSubmitting, setEventSubmitting] = useState(false);

  const refreshGardens = useCallback(() => {
    getGardens()
      .then(setGardens)
      .catch(() => setGardens([]));
  }, []);

  useEffect(() => {
    refreshGardens();
  }, [refreshGardens]);

  useFocusEffect(
    useCallback(() => {
      refreshGardens();
    }, [refreshGardens])
  );

  useEffect(() => {
    if (params.nfc_tag_uid) setNfcTagUid(params.nfc_tag_uid);
  }, [params.nfc_tag_uid]);

  useEffect(() => {
    const raw = params.organisme;
    const organismeParam = raw == null ? undefined : Array.isArray(raw) ? raw[0] : raw;
    const orgId = organismeParam ? Number(organismeParam) : NaN;
    if (!isNaN(orgId) && orgId > 0) {
      getOrganism(orgId)
        .then((org) => {
          setOrganisme(org);
          setCultivar(null);
          getCultivarsPaginated({ organism: orgId, page: 1 })
            .then(({ results }) => setCultivarsForOrganism(results))
            .catch(() => setCultivarsForOrganism([]));
        })
        .catch(() => {});
    }
  }, [params.organisme]);

  useEffect(() => {
    const raw = params.garden;
    const gardenParam = raw == null ? undefined : Array.isArray(raw) ? raw[0] : raw;
    const gardenId = gardenParam ? Number(gardenParam) : NaN;
    if (!isNaN(gardenId) && gardenId > 0) {
      getGardens()
        .then((gardensList) => {
          const g = gardensList.find((x) => x.id === gardenId);
          if (g) setGarden(g);
        })
        .catch(() => {});
    }
  }, [params.garden]);

  useEffect(() => {
    if (!cultivar) {
      setCultivarDetail(null);
      setSelectedPorteGreffe(null);
      return;
    }
    getCultivar(cultivar.id)
      .then((detail) => {
        setCultivarDetail(detail);
        if (detail.porte_greffes && detail.porte_greffes.length > 0) {
          setSelectedPorteGreffe('unknown');
        } else {
          setSelectedPorteGreffe(null);
        }
      })
      .catch(() => {
        setCultivarDetail(null);
        setSelectedPorteGreffe(null);
      });
  }, [cultivar?.id]);

  // Présélectionner le jardin par défaut quand aucun jardin n'est passé en paramètre
  useEffect(() => {
    const raw = params.garden;
    const gardenParam = raw == null ? undefined : Array.isArray(raw) ? raw[0] : raw;
    if (gardenParam != null) return;
    Promise.all([getGardens(), getUserPreferences()])
      .then(([gardensList, prefs]) => {
        if (prefs.default_garden_id != null && gardensList.length > 0) {
          const g = gardensList.find((x) => x.id === prefs.default_garden_id);
          if (g) setGarden((current) => (current == null ? g : current));
        }
      })
      .catch(() => {});
  }, [params.garden]);

  useEffect(() => {
    const latRaw = params.latitude == null ? undefined : Array.isArray(params.latitude) ? params.latitude[0] : params.latitude;
    const lngRaw = params.longitude == null ? undefined : Array.isArray(params.longitude) ? params.longitude[0] : params.longitude;
    const lat = latRaw != null ? Number(latRaw) : NaN;
    const lng = lngRaw != null ? Number(lngRaw) : NaN;
    if (!isNaN(lat) && !isNaN(lng)) setLocation({ lat, lng });
  }, [params.latitude, params.longitude]);

  useEffect(() => {
    const raw = params.cultivar;
    const cultivarParam = raw == null ? undefined : Array.isArray(raw) ? raw[0] : raw;
    const cultivarId = cultivarParam ? Number(cultivarParam) : NaN;
    if (!isNaN(cultivarId) && cultivarId > 0 && organisme) {
      getCultivarsPaginated({ organism: organisme.id, page: 1 })
        .then(({ results }) => {
          const c = results.find((x) => x.id === cultivarId);
          if (c) setCultivar(c);
        })
        .catch(() => {});
    }
  }, [params.cultivar, organisme?.id]);

  const validate = (): boolean => {
    const err: { organisme?: string; nom?: string } = {};
    if (!organisme) err.organisme = 'Choisir une espèce est obligatoire';
    if (!nom.trim()) err.nom = 'Le nom est obligatoire';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const data: SpecimenCreateUpdate = {
        organisme: organisme!.id,
        garden: garden?.id ?? null,
        nom: nom.trim(),
        statut,
      };
      if (cultivar?.id) data.cultivar = cultivar.id;
      if (zoneJardin.trim()) data.zone_jardin = zoneJardin.trim();
      let notesFinal = notes.trim();
      if (
        selectedPorteGreffe !== null &&
        selectedPorteGreffe !== 'unknown' &&
        typeof selectedPorteGreffe === 'object' &&
        selectedPorteGreffe.nom_porte_greffe
      ) {
        notesFinal = (notesFinal ? `Porte-greffe: ${selectedPorteGreffe.nom_porte_greffe}\n${notesFinal}` : `Porte-greffe: ${selectedPorteGreffe.nom_porte_greffe}`).trim();
      }
      if (notesFinal) data.notes = notesFinal;
      if (nfcTagUid.trim()) data.nfc_tag_uid = nfcTagUid.trim();
      if (location) {
        data.latitude = location.lat;
        data.longitude = location.lng;
      }

      const created = await createSpecimen(data);
      const createdId = created?.id;
      if (typeof createdId === 'number' && Number.isInteger(createdId)) {
        if (statut === 'planifie') {
          router.replace(`/specimen/${createdId}`);
        } else {
          setCreatedIdForPlantation(createdId);
          setPlantationModalVisible(true);
        }
      } else {
        router.replace('/(tabs)/specimens');
        Alert.alert('Spécimen créé', 'Le spécimen a été créé. Retour à la liste.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création';
      Alert.alert('Erreur', msg);
    } finally {
      setSubmitting(false);
    }
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

          {organisme && cultivarsForOrganism.length > 0 && (
            <>
              <Text style={styles.label}>Variété / cultivar (optionnel)</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setCultivarModalVisible(true)}
                activeOpacity={0.7}
              >
                {cultivar ? (
                  <Text style={styles.pickerText}>{cultivar.nom}</Text>
                ) : (
                  <Text style={styles.pickerPlaceholder}>Aucune variété</Text>
                )}
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
              {cultivarDetail?.porte_greffes && cultivarDetail.porte_greffes.length > 0 && (
                <>
                  <Text style={styles.label}>Porte-greffe (optionnel)</Text>
                  <View style={styles.porteGreffeRow}>
                    <TouchableOpacity
                      style={[
                        styles.porteGreffeChip,
                        selectedPorteGreffe === 'unknown' && styles.porteGreffeChipSelected,
                      ]}
                      onPress={() => setSelectedPorteGreffe('unknown')}
                    >
                      <Text
                        style={[
                          styles.porteGreffeChipText,
                          selectedPorteGreffe === 'unknown' && styles.porteGreffeChipTextSelected,
                        ]}
                      >
                        Je ne sais pas / sans porte-greffe
                      </Text>
                    </TouchableOpacity>
                    {cultivarDetail.porte_greffes.map((pg) => (
                      <TouchableOpacity
                        key={pg.id}
                        style={[
                          styles.porteGreffeChip,
                          selectedPorteGreffe !== null &&
                            selectedPorteGreffe !== 'unknown' &&
                            selectedPorteGreffe.id === pg.id &&
                            styles.porteGreffeChipSelected,
                        ]}
                        onPress={() => setSelectedPorteGreffe(pg)}
                      >
                        <Text
                          style={[
                            styles.porteGreffeChipText,
                            selectedPorteGreffe !== null &&
                              selectedPorteGreffe !== 'unknown' &&
                              selectedPorteGreffe.id === pg.id &&
                              styles.porteGreffeChipTextSelected,
                          ]}
                        >
                          {pg.nom_porte_greffe}
                          {pg.vigueur_display ? ` (${pg.vigueur_display})` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </>
          )}

          <Text style={styles.label}>Nom *</Text>
          <TextInput
            style={[styles.input, errors.nom && styles.inputError]}
            placeholder="Ex: Pommier Dolgo #1, Basilic du balcon"
            value={nom}
            onChangeText={(t) => { setNom(t); setErrors((e) => ({ ...e, nom: undefined })); }}
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

          <Text style={styles.label}>Position GPS</Text>
          <View style={styles.gpsRow}>
            {location ? (
              <Text style={styles.gpsCoords}>
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </Text>
            ) : locationError ? (
              <Text style={styles.gpsError}>{locationError}</Text>
            ) : (
              <Text style={styles.gpsPlaceholder}>Optionnel — utile pour « spécimens à proximité »</Text>
            )}
            <TouchableOpacity
              style={[styles.captureGpsButton, capturingLocation && styles.captureGpsButtonDisabled]}
              onPress={async () => {
                setCapturingLocation(true);
                setLocationError(null);
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status !== 'granted') {
                    setLocationError('Localisation refusée');
                    return;
                  }
                  const pos = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                  });
                  setLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                  });
                } catch (err) {
                  setLocationError(err instanceof Error ? err.message : 'Impossible d\'obtenir la position');
                } finally {
                  setCapturingLocation(false);
                }
              }}
              disabled={capturingLocation}
            >
              {capturingLocation ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="locate" size={20} color="#fff" />
                  <Text style={styles.captureGpsText}>
                    {location ? 'Mettre à jour' : 'Capturer ma position'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          {location ? (
            <TouchableOpacity style={styles.clearGpsButton} onPress={() => setLocation(null)}>
              <Text style={styles.clearGpsText}>Effacer les coordonnées</Text>
            </TouchableOpacity>
          ) : null}

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
            {(['planifie', 'jeune', 'etabli', 'mature'] as SpecimenStatut[]).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.statutChip, statut === s && styles.statutChipSelected]}
                onPress={() => setStatut(s)}
              >
                <Text style={[styles.statutChipText, statut === s && styles.statutChipTextSelected]}>
                  {SPECIMEN_STATUT_LABELS[s]}
                </Text>
              </TouchableOpacity>
            ))}
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
            <Text style={styles.submitButtonText}>Créer le spécimen</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <OrganismPickerModal
        visible={organismModalVisible}
        onSelect={(org) => {
          setOrganismModalVisible(false);
          setOrganisme(org);
          setCultivar(null);
          getCultivarsPaginated({ organism: org.id, page: 1 })
            .then(({ results }) => setCultivarsForOrganism(results))
            .catch(() => setCultivarsForOrganism([]));
        }}
        onClose={() => setOrganismModalVisible(false)}
      />
      <GardenPickerModal
        visible={gardenModalVisible}
        gardens={gardens}
        onSelect={setGarden}
        onClose={() => setGardenModalVisible(false)}
        onSelectNone={() => setGarden(null)}
        onCreateGarden={() => {
          setGardenModalVisible(false);
          router.push('/garden/create');
        }}
      />
      <Modal visible={cultivarModalVisible} animationType="slide" onRequestClose={() => setCultivarModalVisible(false)}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <TouchableOpacity onPress={() => setCultivarModalVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={modalStyles.closeBtn}>✕</Text>
            </TouchableOpacity>
            <Text style={modalStyles.headerTitle}>Variété (optionnel)</Text>
            <View style={{ width: 28 }} />
          </View>
          <FlatList
            data={[{ id: 0, nom: 'Aucune variété' }, ...cultivarsForOrganism]}
            keyExtractor={(item) => (item.id === 0 ? 'none' : `cultivar-${item.id}`)}
            style={modalStyles.list}
            contentContainerStyle={modalStyles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={modalStyles.item}
                onPress={() => {
                  setCultivarModalVisible(false);
                  setCultivar(item.id === 0 ? null : item);
                }}
                activeOpacity={0.7}
              >
                <Text style={modalStyles.itemText}>{item.nom}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
      <NfcScanModal
        visible={nfcScanModalVisible}
        onSuccess={(uid) => setNfcTagUid(uid)}
        onClose={() => setNfcScanModalVisible(false)}
      />
      <Modal
        visible={plantationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPlantationModalVisible(false);
          if (createdIdForPlantation != null) router.replace(`/specimen/${createdIdForPlantation}`);
          setCreatedIdForPlantation(null);
        }}
      >
        <View style={plantationModalStyles.overlay}>
          <View style={plantationModalStyles.box}>
            <Text style={plantationModalStyles.title}>Enregistrer la plantation maintenant ?</Text>
            <View style={plantationModalStyles.buttons}>
              <TouchableOpacity
                style={plantationModalStyles.buttonPrimary}
                onPress={() => {
                  setPlantationModalVisible(false);
                  setEventModalVisible(true);
                }}
              >
                <Text style={plantationModalStyles.buttonPrimaryText}>Oui, enregistrer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={plantationModalStyles.buttonSecondary}
                onPress={() => {
                  setPlantationModalVisible(false);
                  if (createdIdForPlantation != null) router.replace(`/specimen/${createdIdForPlantation}`);
                  setCreatedIdForPlantation(null);
                }}
              >
                <Text style={plantationModalStyles.buttonSecondaryText}>Plus tard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {createdIdForPlantation != null && (
        <AddEventModal
          visible={eventModalVisible}
          specimenId={createdIdForPlantation}
          onClose={() => {
            setEventModalVisible(false);
            router.replace(`/specimen/${createdIdForPlantation}`);
            setCreatedIdForPlantation(null);
          }}
          onSuccess={() => {
            setEventModalVisible(false);
            router.replace(`/specimen/${createdIdForPlantation}`);
            setCreatedIdForPlantation(null);
          }}
          submitting={eventSubmitting}
          setSubmitting={setEventSubmitting}
          initialTypeEvent="plantation"
          initialDate={new Date().toISOString().slice(0, 10)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
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
  gpsRow: { marginBottom: 8 },
  gpsCoords: { fontSize: 13, color: '#4a6741', marginBottom: 8 },
  gpsError: { fontSize: 13, color: '#c44', marginBottom: 8 },
  gpsPlaceholder: { fontSize: 13, color: '#888', marginBottom: 8 },
  captureGpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4a6741',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  captureGpsButtonDisabled: { opacity: 0.7 },
  captureGpsText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  clearGpsButton: { marginBottom: 12 },
  clearGpsText: { fontSize: 14, color: '#666' },
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
  porteGreffeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  porteGreffeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0eb',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  porteGreffeChipSelected: {
    backgroundColor: '#1a3c27',
    borderColor: '#1a3c27',
  },
  porteGreffeChipText: { fontSize: 14, color: '#333' },
  porteGreffeChipTextSelected: { fontSize: 14, color: '#fff', fontWeight: '600' },
});

const plantationModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a3c27',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttons: { gap: 12 },
  buttonPrimary: {
    backgroundColor: '#1a3c27',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonPrimaryText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  buttonSecondary: {
    backgroundColor: '#f0f0eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonSecondaryText: { fontSize: 16, color: '#333' },
});
