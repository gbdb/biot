import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  getOrganism,
  addOrganismFavorite,
  removeOrganismFavorite,
} from '@/api/client';
import type { OrganismDetail } from '@/types/api';

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

export default function SpeciesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [organism, setOrganism] = useState<OrganismDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
});
