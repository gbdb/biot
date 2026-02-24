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
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { getOrganism, updateOrganism } from '@/api/client';
import type { OrganismDetail, OrganismUpdate } from '@/types/api';

const TYPE_OPTIONS = [
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

const REGNE_OPTIONS = [
  { value: 'plante', label: 'Plante' },
  { value: 'champignon', label: 'Champignon' },
  { value: 'mousse', label: 'Mousse/Bryophyte' },
];

const BESOIN_EAU_OPTIONS = [
  { value: '', label: '—' },
  { value: 'tres_faible', label: 'Très faible' },
  { value: 'faible', label: 'Faible' },
  { value: 'moyen', label: 'Moyen' },
  { value: 'eleve', label: 'Élevé' },
  { value: 'tres_eleve', label: 'Très élevé' },
];

const BESOIN_SOLEIL_OPTIONS = [
  { value: '', label: '—' },
  { value: 'ombre_complete', label: 'Ombre complète' },
  { value: 'ombre', label: 'Ombre' },
  { value: 'mi_ombre', label: 'Mi-ombre' },
  { value: 'soleil_partiel', label: 'Soleil partiel' },
  { value: 'plein_soleil', label: 'Plein soleil' },
];

const SOL_DRAINAGE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'tres_draine', label: 'Très drainé' },
  { value: 'bien_draine', label: 'Bien drainé' },
  { value: 'humide', label: 'Humide' },
  { value: 'demarais', label: 'Détrempé/marécageux' },
];

const SOL_RICHESSE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'pauvre', label: 'Pauvre' },
  { value: 'moyen', label: 'Moyen' },
  { value: 'riche', label: 'Riche/Fertile' },
];

const VITESSE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'tres_lente', label: 'Très lente' },
  { value: 'lente', label: 'Lente' },
  { value: 'moyenne', label: 'Moyenne' },
  { value: 'rapide', label: 'Rapide' },
  { value: 'tres_rapide', label: 'Très rapide' },
];

const TYPE_NOIX_OPTIONS = [
  { value: '', label: '—' },
  { value: 'noyer', label: 'Noyer' },
  { value: 'noisettier', label: 'Noisetier' },
  { value: 'chataignier', label: 'Châtaignier' },
  { value: 'amandier', label: 'Amandier' },
  { value: 'pecanier', label: 'Pécanier' },
  { value: 'pin_pignon', label: 'Pin à pignons' },
  { value: 'caryer', label: 'Caryer' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.section}>
      <Text style={sectionStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

function PickerRow({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (v: string) => void;
}) {
  return (
    <>
      <Text style={sectionStyles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={sectionStyles.chipRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[sectionStyles.chip, value === opt.value && sectionStyles.chipActive]}
            onPress={() => onSelect(opt.value)}
          >
            <Text style={[sectionStyles.chipText, value === opt.value && sectionStyles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );
}

const sectionStyles = StyleSheet.create({
  section: { marginBottom: 24 },
  title: { fontSize: 16, fontWeight: '700', color: '#1a3c27', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#1a3c27', marginBottom: 6, marginTop: 8 },
  chipRow: { marginBottom: 4 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#e8f0eb',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#1a3c27' },
  chipText: { fontSize: 13, color: '#1a3c27' },
  chipTextActive: { color: '#fff' },
});

export default function SpeciesEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [organism, setOrganism] = useState<OrganismDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nomCommun, setNomCommun] = useState('');
  const [nomLatin, setNomLatin] = useState('');
  const [famille, setFamille] = useState('');
  const [regne, setRegne] = useState('plante');
  const [typeOrganisme, setTypeOrganisme] = useState('vivace');
  const [besoinEau, setBesoinEau] = useState('');
  const [besoinSoleil, setBesoinSoleil] = useState('');
  const [solDrainage, setSolDrainage] = useState('');
  const [solRichesse, setSolRichesse] = useState('');
  const [hauteurMax, setHauteurMax] = useState('');
  const [largeurMax, setLargeurMax] = useState('');
  const [vitesseCroissance, setVitesseCroissance] = useState('');
  const [comestible, setComestible] = useState(true);
  const [partiesComestibles, setPartiesComestibles] = useState('');
  const [toxicite, setToxicite] = useState('');
  const [typeNoix, setTypeNoix] = useState('');
  const [ageFructification, setAgeFructification] = useState('');
  const [periodeRecolte, setPeriodeRecolte] = useState('');
  const [pollinisation, setPollinisation] = useState('');
  const [productionAnnuelle, setProductionAnnuelle] = useState('');
  const [fixateurAzote, setFixateurAzote] = useState(false);
  const [accumulateurDynamique, setAccumulateurDynamique] = useState(false);
  const [mellifere, setMellifere] = useState(false);
  const [produitJuglone, setProduitJuglone] = useState(false);
  const [indigene, setIndigene] = useState(false);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [usagesAutres, setUsagesAutres] = useState('');

  const loadOrganism = useCallback(async () => {
    const orgId = id ? parseInt(id, 10) : NaN;
    if (isNaN(orgId)) {
      setError('ID invalide');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getOrganism(orgId)
      .then((org) => {
        setOrganism(org);
        setNomCommun(org.nom_commun || '');
        setNomLatin(org.nom_latin || '');
        setFamille(org.famille || '');
        setRegne(org.regne || 'plante');
        setTypeOrganisme(org.type_organisme || 'vivace');
        setBesoinEau(org.besoin_eau || '');
        setBesoinSoleil(org.besoin_soleil || '');
        setSolDrainage(org.sol_drainage || '');
        setSolRichesse(org.sol_richesse || '');
        setHauteurMax(org.hauteur_max != null ? String(org.hauteur_max) : '');
        setLargeurMax(org.largeur_max != null ? String(org.largeur_max) : '');
        setVitesseCroissance(org.vitesse_croissance || '');
        setComestible(org.comestible ?? true);
        setPartiesComestibles(org.parties_comestibles || '');
        setToxicite(org.toxicite || '');
        setTypeNoix(org.type_noix || '');
        setAgeFructification(org.age_fructification != null ? String(org.age_fructification) : '');
        setPeriodeRecolte(org.periode_recolte || '');
        setPollinisation(org.pollinisation || '');
        setProductionAnnuelle(org.production_annuelle || '');
        setFixateurAzote(org.fixateur_azote ?? false);
        setAccumulateurDynamique(org.accumulateur_dynamique ?? false);
        setMellifere(org.mellifere ?? false);
        setProduitJuglone(org.produit_juglone ?? false);
        setIndigene(org.indigene ?? false);
        setDescription(org.description || '');
        setNotes(org.notes || '');
        setUsagesAutres(org.usages_autres || '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadOrganism();
    }, [loadOrganism])
  );

  const handleSubmit = async () => {
    if (!organism) return;
    const err: string[] = [];
    if (!nomCommun.trim()) err.push('Nom commun');
    if (!nomLatin.trim()) err.push('Nom latin');
    if (err.length) {
      Alert.alert('Champs requis', `Veuillez remplir : ${err.join(', ')}`);
      return;
    }
    setSubmitting(true);
    try {
      const data: OrganismUpdate = {
        nom_commun: nomCommun.trim(),
        nom_latin: nomLatin.trim(),
        famille: famille.trim() || undefined,
        regne: regne || undefined,
        type_organisme: typeOrganisme,
        besoin_eau: besoinEau || undefined,
        besoin_soleil: besoinSoleil || undefined,
        sol_drainage: solDrainage || undefined,
        sol_richesse: solRichesse || undefined,
        hauteur_max: hauteurMax ? parseFloat(hauteurMax) : null,
        largeur_max: largeurMax ? parseFloat(largeurMax) : null,
        vitesse_croissance: vitesseCroissance || undefined,
        comestible,
        parties_comestibles: partiesComestibles.trim() || undefined,
        toxicite: toxicite.trim() || undefined,
        type_noix: typeNoix || undefined,
        age_fructification: ageFructification ? parseInt(ageFructification, 10) : null,
        periode_recolte: periodeRecolte.trim() || undefined,
        pollinisation: pollinisation.trim() || undefined,
        production_annuelle: productionAnnuelle.trim() || undefined,
        fixateur_azote: fixateurAzote,
        accumulateur_dynamique: accumulateurDynamique,
        mellifere,
        produit_juglone: produitJuglone,
        indigene,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        usages_autres: usagesAutres.trim() || undefined,
      };
      await updateOrganism(organism.id, data);
      Alert.alert('Enregistré', "Les modifications ont été enregistrées.", [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = [sectionStyles.label, { marginTop: 12 }];
  const textInput = (placeholder: string, value: string, setter: (s: string) => void, multiline?: boolean) => (
    <TextInput
      style={[styles.input, multiline && styles.textArea]}
      placeholder={placeholder}
      value={value}
      onChangeText={setter}
      placeholderTextColor="#888"
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
    />
  );

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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Section title="Identification">
          <Text style={sectionStyles.label}>Nom commun *</Text>
          {textInput('Ex: Pommier Dolgo', nomCommun, setNomCommun)}
          <Text style={inputStyle}>Nom latin *</Text>
          {textInput('Ex: Malus × robusta', nomLatin, setNomLatin)}
          <Text style={inputStyle}>Famille botanique</Text>
          {textInput('Ex: Rosacées', famille, setFamille)}
          <PickerRow label="Règne" value={regne} options={REGNE_OPTIONS} onSelect={setRegne} />
          <PickerRow label="Type d'organisme" value={typeOrganisme} options={TYPE_OPTIONS} onSelect={setTypeOrganisme} />
        </Section>

        <Section title="Besoins culturaux">
          <PickerRow label="Besoin en eau" value={besoinEau} options={BESOIN_EAU_OPTIONS} onSelect={setBesoinEau} />
          <PickerRow label="Besoin en soleil" value={besoinSoleil} options={BESOIN_SOLEIL_OPTIONS} onSelect={setBesoinSoleil} />
        </Section>

        <Section title="Sol">
          <PickerRow label="Drainage" value={solDrainage} options={SOL_DRAINAGE_OPTIONS} onSelect={setSolDrainage} />
          <PickerRow label="Richesse" value={solRichesse} options={SOL_RICHESSE_OPTIONS} onSelect={setSolRichesse} />
        </Section>

        <Section title="Caractéristiques physiques">
          <Text style={sectionStyles.label}>Hauteur max (m)</Text>
          {textInput('Ex: 6', hauteurMax, setHauteurMax)}
          <Text style={inputStyle}>Largeur max (m)</Text>
          {textInput('Ex: 4', largeurMax, setLargeurMax)}
          <PickerRow label="Vitesse de croissance" value={vitesseCroissance} options={VITESSE_OPTIONS} onSelect={setVitesseCroissance} />
        </Section>

        <Section title="Comestibilité">
          <View style={styles.switchRow}>
            <Text style={sectionStyles.label}>Comestible</Text>
            <Switch value={comestible} onValueChange={setComestible} trackColor={{ false: '#ccc', true: '#1a3c27' }} />
          </View>
          <Text style={inputStyle}>Parties comestibles</Text>
          {textInput('Ex: fruits, feuilles, racines', partiesComestibles, setPartiesComestibles, true)}
          <Text style={inputStyle}>Toxicité / précautions</Text>
          {textInput('Parties toxiques, préparation nécessaire', toxicite, setToxicite, true)}
        </Section>

        <Section title="Arbres fruitiers / à noix">
          <PickerRow label="Type noix" value={typeNoix} options={TYPE_NOIX_OPTIONS} onSelect={setTypeNoix} />
          <Text style={sectionStyles.label}>Âge fructification (années)</Text>
          {textInput('Ex: 5', ageFructification, setAgeFructification)}
          <Text style={inputStyle}>Période de récolte</Text>
          {textInput('Ex: Juillet-Septembre', periodeRecolte, setPeriodeRecolte)}
          <Text style={inputStyle}>Pollinisation</Text>
          {textInput('Auto-fertile, variétés compatibles', pollinisation, setPollinisation, true)}
          <Text style={inputStyle}>Production annuelle</Text>
          {textInput('Ex: 50-100 kg/an', productionAnnuelle, setProductionAnnuelle)}
        </Section>

        <Section title="Caractéristiques écologiques">
          <View style={styles.switchRow}><Text style={sectionStyles.label}>Fixateur azote</Text><Switch value={fixateurAzote} onValueChange={setFixateurAzote} trackColor={{ false: '#ccc', true: '#1a3c27' }} /></View>
          <View style={styles.switchRow}><Text style={sectionStyles.label}>Accumulateur dynamique</Text><Switch value={accumulateurDynamique} onValueChange={setAccumulateurDynamique} trackColor={{ false: '#ccc', true: '#1a3c27' }} /></View>
          <View style={styles.switchRow}><Text style={sectionStyles.label}>Mellifère</Text><Switch value={mellifere} onValueChange={setMellifere} trackColor={{ false: '#ccc', true: '#1a3c27' }} /></View>
          <View style={styles.switchRow}><Text style={sectionStyles.label}>Produit juglone</Text><Switch value={produitJuglone} onValueChange={setProduitJuglone} trackColor={{ false: '#ccc', true: '#1a3c27' }} /></View>
          <View style={styles.switchRow}><Text style={sectionStyles.label}>Indigène</Text><Switch value={indigene} onValueChange={setIndigene} trackColor={{ false: '#ccc', true: '#1a3c27' }} /></View>
        </Section>

        <Section title="Description">
          <Text style={sectionStyles.label}>Description générale</Text>
          {textInput('Description de l\'espèce', description, setDescription, true)}
          <Text style={inputStyle}>Notes personnelles</Text>
          {textInput('Observations, notes', notes, setNotes, true)}
          <Text style={inputStyle}>Usages autres (médicinal, artisanat...)</Text>
          {textInput('Usages non-comestibles', usagesAutres, setUsagesAutres, true)}
        </Section>

        <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Enregistrer</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  scroll: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f0' },
  error: { color: '#c44', fontSize: 16 },
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  submitBtn: { backgroundColor: '#1a3c27', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 18, fontWeight: '600', color: '#fff' },
});
