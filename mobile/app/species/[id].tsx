import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  getOrganism,
  getSpecimens,
  addOrganismFavorite,
  removeOrganismFavorite,
  uploadOrganismPhoto,
  uploadOrganismPhotoFromUrl,
  setOrganismDefaultPhoto,
} from '@/api/client';
import { PhotoCarousel, type PhotoCarouselItem } from '@/components/PhotoCarousel';
import type { OrganismDetail, SpecimenList } from '@/types/api';

const TYPE_LABELS: Record<string, string> = {
  arbre_fruitier: '🌳 Arbre fruitier',
  arbre_noix: '🌰 Arbre à noix',
  arbre_ornement: "🌲 Arbre d'ornement",
  arbre_bois: '🪵 Arbre forestier',
  arbuste_fruitier: '🫐 Arbuste fruitier',
  arbuste_baies: '🫐 Arbuste à baies',
  arbuste: '🌿 Arbuste',
  vivace: '🌸 Vivace',
  annuelle: '🌻 Annuelle',
  bisannuelle: '🌷 Bisannuelle',
  herbe_aromatique: '🌿 Herbe aromatique',
  legume: '🥕 Légume',
  grimpante: '🌿 Grimpante',
  couvre_sol: '🌱 Couvre-sol',
  champignon_comestible: '🍄 Champignon comestible',
  champignon_mycorhize: '🍄 Champignon mycorhizien',
  mousse: '🟢 Mousse',
};

const BESOIN_SOLEIL_LABELS: Record<string, string> = {
  ombre_complete: '🌑 Ombre complète',
  ombre: '☁️ Ombre',
  mi_ombre: '⛅ Mi-ombre',
  soleil_partiel: '🌤️ Soleil partiel',
  plein_soleil: '☀️ Plein soleil',
};

const BESOIN_EAU_LABELS: Record<string, string> = {
  tres_faible: 'Très faible',
  faible: 'Faible',
  moyen: 'Moyen',
  eleve: 'Élevé',
  tres_eleve: 'Très élevé',
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value && value.trim() ? value : '—'}</Text>
    </View>
  );
}

function formatZone(zoneRusticite: { zone: string; source?: string }[] | undefined): string {
  if (!zoneRusticite || !Array.isArray(zoneRusticite) || zoneRusticite.length === 0) return '—';
  const zones = zoneRusticite
    .map((z) => (typeof z === 'object' && z?.zone ? z.zone : null))
    .filter(Boolean) as string[];
  return zones.length ? zones.join(', ') : '—';
}

function formatList(arr: string[] | null | undefined): string {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '—';
  const items = arr.filter((x) => x && String(x).trim());
  return items.length ? items.join(', ') : '—';
}

const SOL_DRAINAGE_LABELS: Record<string, string> = {
  tres_draine: 'Très drainé/sec',
  bien_draine: 'Bien drainé',
  humide: 'Humide',
  demarais: 'Détrempé/marécageux',
};

const SOL_RICHESSE_LABELS: Record<string, string> = {
  pauvre: 'Pauvre',
  moyen: 'Moyen',
  riche: 'Riche/Fertile',
};

export default function SpeciesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [organism, setOrganism] = useState<OrganismDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specimens, setSpecimens] = useState<SpecimenList[]>([]);
  const [loadingSpecimens, setLoadingSpecimens] = useState(false);
  const [addPhotoModalVisible, setAddPhotoModalVisible] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fetchOrganism = useCallback(async () => {
    const orgId = id ? parseInt(id, 10) : NaN;
    if (isNaN(orgId)) {
      setError('ID invalide');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getOrganism(orgId)
      .then(setOrganism)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchOrganism();
    }, [fetchOrganism])
  );

  const fetchSpecimens = useCallback(async (organismeId: number) => {
    setSpecimens([]);
    setLoadingSpecimens(true);
    getSpecimens({ organisme: organismeId })
      .then(setSpecimens)
      .catch(() => setSpecimens([]))
      .finally(() => setLoadingSpecimens(false));
  }, []);

  useEffect(() => {
    if (organism?.id) {
      fetchSpecimens(organism.id);
    } else {
      setSpecimens([]);
    }
  }, [organism?.id, fetchSpecimens]);

  const handleCreateSpecimen = () => {
    if (organism) {
      router.push(`/specimen/create?organisme=${organism.id}`);
    }
  };

  const handleToggleFavori = async () => {
    if (!organism) return;
    const wasFavori = organism.is_favori ?? false;
    try {
      if (wasFavori) {
        await removeOrganismFavorite(organism.id);
        setOrganism((o) => (o ? { ...o, is_favori: false } : null));
      } else {
        await addOrganismFavorite(organism.id);
        setOrganism((o) => (o ? { ...o, is_favori: true } : null));
      }
    } catch {
      /* ignore */
    }
  };

  const handleAddPhotoFromGallery = async () => {
    if (!organism) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'Accès à la galerie requis pour ajouter une photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploadingPhoto(true);
    try {
      await uploadOrganismPhoto(organism.id, {
        image: { uri: asset.uri, type: 'image/jpeg', name: 'photo.jpg' },
      });
      await fetchOrganism();
      setAddPhotoModalVisible(false);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible d\'ajouter la photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddPhotoFromUrl = async () => {
    if (!organism) return;
    const url = photoUrlInput.trim();
    if (!url) {
      Alert.alert('Lien requis', 'Indiquez l\'URL de l\'image.');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      Alert.alert('URL invalide', 'L\'URL doit commencer par http:// ou https://');
      return;
    }
    setUploadingPhoto(true);
    try {
      await uploadOrganismPhotoFromUrl(organism.id, { image_url: url });
      setPhotoUrlInput('');
      await fetchOrganism();
      setAddPhotoModalVisible(false);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de télécharger l\'image.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading && !organism) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a3c27" />
      </View>
    );
  }

  if (error || !organism) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? 'Espèce introuvable'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.nomCommun}>{organism.nom_commun}</Text>
            <Text style={styles.nomLatin}>{organism.nom_latin}</Text>
            <Text style={styles.type}>
              {TYPE_LABELS[organism.type_organisme] ?? organism.type_organisme}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleToggleFavori}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.favoriBtn}
          >
            <Ionicons
              name={(organism.is_favori ?? false) ? 'star' : 'star-outline'}
              size={28}
              color={(organism.is_favori ?? false) ? '#f0c040' : '#666'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <PhotoCarousel
            items={(() => {
              const list = organism.photos && organism.photos.length > 0
                ? organism.photos
                : organism.photo_principale_url
                  ? [{ id: 'main', image_url: organism.photo_principale_url, source_author: null, source_url: null } as PhotoCarouselItem]
                  : [];
              return list.map((p: { id?: number; image_url?: string | null; source_author?: string | null; source_url?: string | null }, i: number) => ({
                id: (p as { id?: number }).id ?? `fallback-${i}`,
                image_url: (p.image_url || organism.photo_principale_url) ?? '',
                source_author: p.source_author ?? null,
                source_url: p.source_url ?? null,
                meta: typeof (p as { id?: number }).id === 'number' ? { photoId: (p as { id: number }).id } : undefined,
              }));
            })()}
            renderFullscreenActions={
              organism.photos && organism.photos.length > 0
                ? (item, close) => {
                    const photoId = item.meta?.photoId;
                    if (typeof photoId !== 'number') return null;
                    return (
                      <TouchableOpacity
                        style={styles.setDefaultPhotoButton}
                        onPress={async () => {
                          try {
                            await setOrganismDefaultPhoto(organism.id, photoId);
                            await fetchOrganism();
                            close();
                          } catch (e) {
                            Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de définir l\'image par défaut.');
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="image" size={20} color="#1a3c27" />
                        <Text style={styles.setDefaultPhotoButtonText}>Définir comme image par défaut</Text>
                      </TouchableOpacity>
                    );
                  }
                : undefined
            }
            extraContent={
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={() => setAddPhotoModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={22} color="#1a3c27" />
                <Text style={styles.addPhotoButtonText}>Ajouter une photo</Text>
              </TouchableOpacity>
            }
          />
        </View>

        <Modal
          visible={addPhotoModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => !uploadingPhoto && setAddPhotoModalVisible(false)}
        >
          <View style={styles.addPhotoModalOverlay}>
            <TouchableOpacity
              style={styles.addPhotoModalBackdrop}
              activeOpacity={1}
              onPress={() => !uploadingPhoto && setAddPhotoModalVisible(false)}
            />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.addPhotoModalContent}
            >
              <View style={styles.addPhotoModalHeader}>
                <Text style={styles.addPhotoModalTitle}>Ajouter une photo</Text>
                <TouchableOpacity
                  onPress={() => !uploadingPhoto && setAddPhotoModalVisible(false)}
                  disabled={uploadingPhoto}
                >
                  <Ionicons name="close" size={28} color="#1a3c27" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.addPhotoModalOption, uploadingPhoto && styles.addPhotoModalOptionDisabled]}
                onPress={handleAddPhotoFromGallery}
                disabled={uploadingPhoto}
                activeOpacity={0.7}
              >
                <Ionicons name="images-outline" size={28} color="#1a3c27" />
                <Text style={styles.addPhotoModalOptionText}>Depuis la galerie</Text>
              </TouchableOpacity>
              <View style={styles.addPhotoModalUrlRow}>
                <TextInput
                  style={styles.addPhotoModalInput}
                  placeholder="URL de l'image (https://...)"
                  placeholderTextColor="#888"
                  value={photoUrlInput}
                  onChangeText={setPhotoUrlInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!uploadingPhoto}
                />
                <TouchableOpacity
                  style={[styles.addPhotoModalUrlButton, uploadingPhoto && styles.addPhotoModalOptionDisabled]}
                  onPress={handleAddPhotoFromUrl}
                  disabled={uploadingPhoto}
                  activeOpacity={0.7}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.addPhotoModalUrlButtonText}>Télécharger</Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Classification</Text>
          <Field label="Famille" value={organism.famille} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Besoins</Text>
          <Field
            label="Soleil"
            value={organism.besoin_soleil ? BESOIN_SOLEIL_LABELS[organism.besoin_soleil] ?? organism.besoin_soleil : null}
          />
          <Field
            label="Eau"
            value={organism.besoin_eau ? BESOIN_EAU_LABELS[organism.besoin_eau] ?? organism.besoin_eau : null}
          />
          <Field label="Zone USDA" value={formatZone(organism.zone_rusticite)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sol</Text>
          <Field label="Textures" value={formatList(organism.sol_textures)} />
          <Field label="pH" value={formatList(organism.sol_ph)} />
          <Field
            label="Drainage"
            value={organism.sol_drainage ? SOL_DRAINAGE_LABELS[organism.sol_drainage] ?? organism.sol_drainage : null}
          />
          <Field
            label="Richesse"
            value={organism.sol_richesse ? SOL_RICHESSE_LABELS[organism.sol_richesse] ?? organism.sol_richesse : null}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Caractéristiques</Text>
          <Field
            label="Hauteur max"
            value={organism.hauteur_max != null ? `${organism.hauteur_max} m` : null}
          />
          <Field
            label="Largeur max"
            value={organism.largeur_max != null ? `${organism.largeur_max} m` : null}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comestibilité</Text>
          <Field label="Comestible" value={organism.comestible ? 'Oui' : 'Non'} />
          <Field label="Parties comestibles" value={organism.parties_comestibles} />
          <Field label="Toxicité / précautions" value={organism.toxicite} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Field label="Description générale" value={organism.description} />
          <Field label="Notes" value={organism.notes} />
          <Field label="Usages autres" value={organism.usages_autres} />
        </View>
      </View>

      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreateSpecimen}
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.createButtonText}>Créer un spécimen de cette espèce</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => router.push(`/species/edit/${organism.id}`)}
        activeOpacity={0.7}
      >
        <Ionicons name="pencil" size={24} color="#1a3c27" />
        <Text style={styles.editButtonText}>Modifier l&apos;espèce</Text>
      </TouchableOpacity>

      {specimens.length > 0 && (
        <View style={styles.specimensSection}>
          <Text style={styles.sectionTitle}>Spécimens de cette espèce</Text>
          {loadingSpecimens ? (
            <ActivityIndicator size="small" color="#1a3c27" style={styles.specimensLoader} />
          ) : (
            specimens.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.specimenRow}
                onPress={() => router.push(`/specimen/${s.id}`)}
                activeOpacity={0.7}
              >
                {s.photo_principale_url ? (
                  <Image
                    source={{ uri: s.photo_principale_url }}
                    style={styles.specimenThumb}
                  />
                ) : (
                  <View style={[styles.specimenThumb, styles.specimenThumbPlaceholder]}>
                    <Ionicons name="leaf-outline" size={24} color="#888" />
                  </View>
                )}
                <View style={styles.specimenRowText}>
                  <Text style={styles.specimenRowTitle}>{s.nom}</Text>
                  {s.garden_nom && (
                    <Text style={styles.specimenRowSubtitle}>{s.garden_nom}</Text>
                  )}
                  {s.zone_jardin && (
                    <Text style={styles.specimenRowSubtitle}>Zone : {s.zone_jardin}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={22} color="#888" />
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f0',
  },
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: { flex: 1 },
  nomCommun: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a3c27',
  },
  nomLatin: {
    fontSize: 16,
    color: '#4a6741',
    fontStyle: 'italic',
    marginTop: 8,
  },
  type: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  favoriBtn: { padding: 8 },
  section: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a3c27',
    marginBottom: 12,
  },
  field: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  error: {
    color: '#c44',
    fontSize: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1a3c27',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#1a3c27',
  },
  editButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a3c27',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a3c27',
    borderStyle: 'dashed',
  },
  setDefaultPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  setDefaultPhotoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a3c27',
  },
  addPhotoButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a3c27',
  },
  addPhotoModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  addPhotoModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  addPhotoModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  addPhotoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  addPhotoModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a3c27',
  },
  addPhotoModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#f5f5f0',
    borderRadius: 12,
  },
  addPhotoModalOptionDisabled: {
    opacity: 0.6,
  },
  addPhotoModalOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a3c27',
  },
  addPhotoModalUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  addPhotoModalInput: {
    flex: 1,
    backgroundColor: '#f5f5f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 15,
    color: '#1a3c27',
  },
  addPhotoModalUrlButton: {
    backgroundColor: '#1a3c27',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: 'center',
  },
  addPhotoModalUrlButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  specimensSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  specimensLoader: {
    marginVertical: 12,
  },
  specimenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  specimenThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#eee',
    marginRight: 14,
  },
  specimenThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  specimenRowText: {
    flex: 1,
  },
  specimenRowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a3c27',
  },
  specimenRowSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
