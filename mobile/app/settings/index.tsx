import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert, TextInput, Keyboard } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useApiConfig } from '@/contexts/ApiConfigContext';
import { getGardens, getUserPreferences, updateUserPreferences, runAdminCommand, getMe, getSpeciesStats, uploadVascanFile } from '@/api/client';

function normalizeApiUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '');
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { apiBaseUrl, defaultApiBaseUrl, setApiBaseUrlOverride } = useApiConfig();
  const [serverUrlInput, setServerUrlInput] = useState(apiBaseUrl);
  const [savingServerUrl, setSavingServerUrl] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [gardens, setGardens] = useState<{ id: number; nom: string }[]>([]);
  const [defaultGardenId, setDefaultGardenId] = useState<number | null>(null);
  const [pollinationDistanceM, setPollinationDistanceM] = useState<string>('');
  const [savingPollinationDistance, setSavingPollinationDistance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [me, setMe] = useState<{ username: string; email: string; first_name: string; last_name: string; is_staff?: boolean; is_superuser?: boolean } | null>(null);
  const [organismCount, setOrganismCount] = useState<number | null>(null);
  const [globalEnrichmentScorePct, setGlobalEnrichmentScorePct] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gardenList, prefs, profile] = await Promise.all([
        getGardens(),
        getUserPreferences(),
        getMe(),
      ]);
      setGardens(gardenList);
      setDefaultGardenId(prefs.default_garden_id);
      setPollinationDistanceM(
        prefs.pollination_distance_max_default_m != null
          ? String(prefs.pollination_distance_max_default_m)
          : ''
      );
      setMe(profile);
      setOrganismCount(null);
      setGlobalEnrichmentScorePct(null);
      if (profile?.is_staff) {
        getSpeciesStats()
          .then((s) => {
            setOrganismCount(s.organism_count);
            setGlobalEnrichmentScorePct(s.global_enrichment_score_pct ?? null);
          })
          .catch(() => {
            setOrganismCount(null);
            setGlobalEnrichmentScorePct(null);
          });
      }
    } catch {
      setGardens([]);
      setDefaultGardenId(null);
      setPollinationDistanceM('');
      setMe(null);
      setOrganismCount(null);
      setGlobalEnrichmentScorePct(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setServerUrlInput(apiBaseUrl);
    load();
  }, [load, apiBaseUrl]));

  const setDefault = async (gardenId: number | null) => {
    setSaving(true);
    try {
      await updateUserPreferences({ default_garden_id: gardenId });
      setDefaultGardenId(gardenId);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const savePollinationDistance = async () => {
    const raw = pollinationDistanceM.trim();
    const value = raw === '' ? null : parseFloat(raw);
    if (raw !== '' && (isNaN(value) || value < 0)) return;
    setSavingPollinationDistance(true);
    try {
      await updateUserPreferences({ pollination_distance_max_default_m: value });
      if (value != null) setPollinationDistanceM(String(value));
      Keyboard.dismiss();
    } catch {
      /* ignore */
    } finally {
      setSavingPollinationDistance(false);
    }
  };

  const [runningCommand, setRunningCommand] = useState<string | null>(null);
  const [uploadingVascan, setUploadingVascan] = useState(false);

  const LIMIT_PRESETS = [50, 100, 200, 500];

  type BaseOptions = { enrich?: boolean; limit?: number; dry_run?: boolean; no_input?: boolean; curl?: boolean; delay?: number };

  const showLimitPrompt = (
    command: string,
    label: string,
    baseOptions: BaseOptions
  ) => {
    Alert.alert(
      'Limite',
      'Établir une limite pour cet import ?',
      [
        {
          text: 'Sans limite',
          onPress: () => runCommand(command, label, { ...baseOptions, limit: 0 }),
        },
        {
          text: 'Avec limite',
          onPress: () => {
            Alert.alert(
              'Nombre max',
              'Nombre d\'éléments à traiter :',
              [
                ...LIMIT_PRESETS.map((n) => ({
                  text: String(n),
                  onPress: () => runCommand(command, label, { ...baseOptions, limit: n }),
                })),
                { text: 'Annuler', style: 'cancel' },
              ]
            );
          },
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const runCommandWithLimitPrompt = (
    command: string,
    label: string,
    baseOptions: BaseOptions = {}
  ) => {
    showLimitPrompt(command, label, baseOptions);
  };

  const runCommandWithEnrichAndLimitPrompt = (
    command: string,
    label: string,
    baseOptions: BaseOptions = {}
  ) => {
    Alert.alert(
      'Mode',
      'Enrichir : uniquement les organismes sans cette source. Peupler : tous les organismes.',
      [
        {
          text: 'Enrichir',
          onPress: () => showLimitPrompt(command, label, { ...baseOptions, enrich: true }),
        },
        {
          text: 'Peupler',
          onPress: () => showLimitPrompt(command, label, { ...baseOptions, enrich: false }),
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const runCommand = async (
    command: string,
    label: string,
    options: { enrich?: boolean; limit?: number; dry_run?: boolean; no_input?: boolean; curl?: boolean; delay?: number } = {}
  ) => {
    setRunningCommand(command);
    try {
      const result = await runAdminCommand(command, options);
      const outputText = result.output || result.detail || (result.success ? 'Commande exécutée.' : 'Échec.');
      const copyToClipboard = () => {
        Clipboard.setStringAsync(outputText).then(() => {
          Alert.alert('Copié', 'Sortie copiée dans le presse-papiers.');
        });
      };
      Alert.alert(
        result.success ? 'Terminé' : 'Erreur',
        outputText,
        [
          { text: 'Copier', onPress: copyToClipboard },
          { text: 'OK' },
        ]
      );
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Impossible d'exécuter la commande.";
      Alert.alert('Erreur', errMsg, [
        { text: 'Copier', onPress: () => Clipboard.setStringAsync(errMsg).then(() => Alert.alert('Copié', 'Message copié dans le presse-papiers.')) },
        { text: 'OK' },
      ]);
    } finally {
      setRunningCommand(null);
    }
  };

  const pickAndUploadVascan = async () => {
    try {
      const doc = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'text/csv', 'application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
      });
      if (doc.canceled) return;
      const file = doc.assets[0];
      setUploadingVascan(true);
      const result = await uploadVascanFile({
        uri: file.uri,
        name: file.name ?? 'vascan.txt',
        type: file.mimeType ?? 'text/plain',
      });
      const outputText = result.output || result.detail || (result.success ? 'Import terminé.' : 'Échec.');
      const copyToClipboard = () => {
        Clipboard.setStringAsync(outputText).then(() => Alert.alert('Copié', 'Sortie copiée dans le presse-papiers.'));
      };
      Alert.alert(
        result.success ? 'Import VASCAN (fichier)' : 'Erreur',
        outputText,
        [{ text: 'Copier', onPress: copyToClipboard }, { text: 'OK' }]
      );
      if (result.success && organismCount !== null) {
        getSpeciesStats().then((s) => setOrganismCount(s.organism_count)).catch(() => {});
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Impossible d'importer le fichier.";
      Alert.alert('Erreur', errMsg, [
        { text: 'Copier', onPress: () => Clipboard.setStringAsync(errMsg).then(() => Alert.alert('Copié', 'Message copié.')) },
        { text: 'OK' },
      ]);
    } finally {
      setUploadingVascan(false);
    }
  };

  const saveServerUrl = async () => {
    const raw = serverUrlInput.trim();
    if (!raw) {
      setApiBaseUrlOverride(null);
      setServerUrlInput(defaultApiBaseUrl);
      Keyboard.dismiss();
      return;
    }
    const url = normalizeApiUrl(raw);
    setSavingServerUrl(true);
    try {
      await setApiBaseUrlOverride(url);
      setServerUrlInput(url);
      Keyboard.dismiss();
      Alert.alert('Enregistré', 'L’adresse du serveur a été mise à jour. Les prochains appels utiliseront ce serveur.');
    } catch {
      Alert.alert('Erreur', 'Impossible d’enregistrer l’adresse.');
    } finally {
      setSavingServerUrl(false);
    }
  };

  const resetServerUrl = async () => {
    setSavingServerUrl(true);
    try {
      await setApiBaseUrlOverride(null);
      setServerUrlInput(defaultApiBaseUrl);
      Alert.alert('Rétabli', 'L’adresse par défaut est utilisée.');
    } catch {
      Alert.alert('Erreur', 'Impossible de rétablir l’adresse par défaut.');
    } finally {
      setSavingServerUrl(false);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      await getMe();
      Alert.alert('Connexion réussie', 'Le serveur répond correctement.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Le serveur ne répond pas. Vérifiez l’adresse et que le backend tourne.';
      Alert.alert('Échec', msg);
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Paramètres</Text>

      <Text style={styles.sectionTitle}>Serveur</Text>
      <Text style={styles.hint}>
        Adresse du backend (ex. http://192.168.0.140:8000). Utile si vous changez de réseau (autre maison, autre bureau). L’app utilisera cette adresse pour toutes les requêtes.
      </Text>
      <View style={styles.serverUrlRow}>
        <TextInput
          style={styles.serverUrlInput}
          value={serverUrlInput}
          onChangeText={setServerUrlInput}
          placeholder={defaultApiBaseUrl}
          placeholderTextColor="#888"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!savingServerUrl}
        />
      </View>
      <View style={styles.serverButtonsRow}>
        <TouchableOpacity
          style={[styles.serverBtn, styles.serverBtnPrimary]}
          onPress={saveServerUrl}
          disabled={savingServerUrl}
        >
          {savingServerUrl ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.serverBtnPrimaryText}>Enregistrer</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.serverBtn}
          onPress={resetServerUrl}
          disabled={savingServerUrl}
        >
          <Text style={styles.serverBtnText}>Rétablir par défaut</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.serverBtn}
          onPress={testConnection}
          disabled={testingConnection}
        >
          {testingConnection ? (
            <ActivityIndicator size="small" color="#1a3c27" />
          ) : (
            <Text style={styles.serverBtnText}>Tester la connexion</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Utilisateur</Text>
      <Text style={styles.hint}>
        Gérer votre compte, créer un autre utilisateur ou attribuer le statut administrateur (superutilisateur uniquement).
      </Text>
      <View style={styles.list}>
        {me && (
          <View style={styles.userRow}>
            <Ionicons name="person-outline" size={20} color="#666" />
            <Text style={styles.rowLabel}>Connecté : {me.username}</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/settings/profile')}
        >
          <Ionicons name="create-outline" size={22} color="#1a3c27" />
          <Text style={styles.rowLabel}>Modifier mon profil</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/settings/password')}
        >
          <Ionicons name="lock-closed-outline" size={22} color="#1a3c27" />
          <Text style={styles.rowLabel}>Changer le mot de passe</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.row, styles.rowCreate]}
          onPress={() => router.push('/register')}
        >
          <Ionicons name="person-add-outline" size={22} color="#1a3c27" />
          <Text style={styles.rowLabel}>Créer un compte (nouvel utilisateur)</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        {me?.is_staff && (
          <TouchableOpacity
            style={[styles.row, styles.rowCreate]}
            onPress={() => router.push('/settings/users')}
          >
            <Ionicons name="people-outline" size={22} color="#1a3c27" />
            <Text style={styles.rowLabel}>Gérer les utilisateurs — mettre admin</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Jardin par défaut</Text>
      <Text style={styles.hint}>
        Ce jardin sera utilisé pour les repères de saison et les paramètres liés au jardin.
      </Text>
      {loading ? (
        <ActivityIndicator size="small" color="#1a3c27" style={styles.loader} />
      ) : (
        <View style={styles.list}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setDefault(null)}
            disabled={saving}
          >
            <Ionicons
              name={defaultGardenId === null ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color="#1a3c27"
            />
            <Text style={styles.rowLabel}>Aucun</Text>
          </TouchableOpacity>
          {gardens.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={styles.row}
              onPress={() => setDefault(g.id)}
              disabled={saving}
            >
              <Ionicons
                name={defaultGardenId === g.id ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color="#1a3c27"
              />
              <Text style={styles.rowLabel}>{g.nom}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.row, styles.rowCreate]}
            onPress={() => router.push('/garden/create?returnTo=settings')}
          >
            <Ionicons name="add-circle-outline" size={22} color="#1a3c27" />
            <Text style={styles.rowLabel}>Créer un jardin</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Distance de pollinisation</Text>
      <Text style={styles.hint}>
        Distance maximale (en mètres) entre deux plants pour l&apos;alerte « zone trop loin ». Vide = utiliser la valeur par défaut du serveur. Utilisé pour les groupes de pollinisation (mâle/femelle ou cultivars).
      </Text>
      <View style={styles.pollinationRow}>
        <TextInput
          style={styles.pollinationInput}
          value={pollinationDistanceM}
          onChangeText={setPollinationDistanceM}
          placeholder="ex. 50"
          placeholderTextColor="#888"
          keyboardType="decimal-pad"
          onBlur={savePollinationDistance}
          editable={!savingPollinationDistance}
        />
        <Text style={styles.pollinationUnit}>m</Text>
        {savingPollinationDistance && <ActivityIndicator size="small" color="#1a3c27" style={styles.pollinationLoader} />}
      </View>

      <Text style={[styles.sectionTitle, styles.sectionTitleAdvanced]}>Avancé</Text>
      <Text style={styles.hint}>
        Importations et maintenance des données espèces (réservé aux comptes administrateurs). VASCAN et USDA enrichissent les organismes existants ; Hydro-Québec en crée (~1700). Pour plus d'espèces : importer un fichier VASCAN ci-dessous (noms scientifiques, tab ou texte).
      </Text>
      {me?.is_staff && organismCount !== null && (
        <>
          <Text style={styles.speciesCount}>Total : {organismCount} espèce{organismCount !== 1 ? 's' : ''} dans la base</Text>
          {globalEnrichmentScorePct !== null && globalEnrichmentScorePct !== undefined && (
            <Text style={styles.speciesCount}>Enrichissement de la base : {globalEnrichmentScorePct} %</Text>
          )}
        </>
      )}
      <View style={styles.advancedGrid}>
        <TouchableOpacity
          style={styles.advancedBtn}
          onPress={() => runCommandWithEnrichAndLimitPrompt('import_vascan', 'Import VASCAN', {})}
          disabled={!!runningCommand}
        >
          {runningCommand === 'import_vascan' ? (
            <ActivityIndicator size="small" color="#1a3c27" />
          ) : (
            <Text style={styles.advancedBtnLabel}>Import VASCAN</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.advancedBtn}
          onPress={pickAndUploadVascan}
          disabled={!!runningCommand || uploadingVascan}
        >
          {uploadingVascan ? (
            <ActivityIndicator size="small" color="#1a3c27" />
          ) : (
            <Text style={styles.advancedBtnLabel}>Importer fichier VASCAN</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.advancedBtn}
          onPress={() => runCommandWithEnrichAndLimitPrompt('import_usda', 'Import USDA', {})}
          disabled={!!runningCommand}
        >
          {runningCommand === 'import_usda' ? (
            <ActivityIndicator size="small" color="#1a3c27" />
          ) : (
            <Text style={styles.advancedBtnLabel}>Import USDA</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.advancedBtn}
          onPress={() => runCommandWithLimitPrompt('import_hydroquebec', 'Import Hydro-Québec', { curl: true })}
          disabled={!!runningCommand}
        >
          {runningCommand === 'import_hydroquebec' ? (
            <ActivityIndicator size="small" color="#1a3c27" />
          ) : (
            <Text style={styles.advancedBtnLabel}>Import Hydro-Québec</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.advancedBtn}
          onPress={() => runCommandWithEnrichAndLimitPrompt('import_botanipedia', 'Import Botanipedia', { delay: 1 })}
          disabled={!!runningCommand}
        >
          {runningCommand === 'import_botanipedia' ? (
            <ActivityIndicator size="small" color="#1a3c27" />
          ) : (
            <Text style={styles.advancedBtnLabel}>Import Botanipedia</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.advancedBtn}
          onPress={() => runCommandWithLimitPrompt('populate_proprietes_usage_calendrier', 'Peupler propriétés, usages, calendrier', {})}
          disabled={!!runningCommand}
        >
          {runningCommand === 'populate_proprietes_usage_calendrier' ? (
            <ActivityIndicator size="small" color="#1a3c27" />
          ) : (
            <Text style={styles.advancedBtnLabel}>Peupler propriétés, usages, calendrier</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.advancedBtn}
          onPress={() => runCommand('merge_organism_duplicates', 'Fusionner doublons (simulation)', { dry_run: true, no_input: true })}
          disabled={!!runningCommand}
        >
          {runningCommand === 'merge_organism_duplicates' ? (
            <ActivityIndicator size="small" color="#1a3c27" />
          ) : (
            <Text style={styles.advancedBtnLabel}>Merge doublons (simulation)</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.advancedBtn, styles.advancedBtnMerge]}
          onPress={() => runCommand('merge_organism_duplicates', 'Fusionner doublons', { dry_run: false, no_input: true })}
          disabled={!!runningCommand}
        >
          {runningCommand === 'merge_organism_duplicates' ? (
            <ActivityIndicator size="small" color="#1a3c27" />
          ) : (
            <Text style={styles.advancedBtnLabel}>Fusionner doublons</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.advancedBtn, styles.advancedBtnDanger]}
          onPress={() => {
            Alert.alert(
              'Vider les espèces (dev)',
              'Cela supprimera toutes les espèces (organismes), spécimens, événements, rappels, semences, favoris espèces, etc. Les utilisateurs et jardins sont conservés. Irréversible.',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Vider',
                  style: 'destructive',
                  onPress: () => runCommand('wipe_species', 'Vider les espèces', { no_input: true }),
                },
              ]
            );
          }}
          disabled={!!runningCommand}
        >
          {runningCommand === 'wipe_species' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.advancedBtnLabelDanger}>Vider les espèces (dev)</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f5f5f0' },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#1a3c27', marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
  sectionTitleSpaced: { marginTop: 8 },
  sectionTitleAdvanced: { marginTop: 28 },
  hint: { fontSize: 14, color: '#666', marginBottom: 16 },
  speciesCount: { fontSize: 15, color: '#1a3c27', fontWeight: '600', marginBottom: 12 },
  loader: { marginVertical: 20 },
  list: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e8e8e8' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowCreate: {
    borderBottomWidth: 0,
  },
  rowLabel: { fontSize: 16, color: '#333', flex: 1 },
  pollinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  pollinationInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
    minWidth: 60,
  },
  pollinationUnit: { fontSize: 16, color: '#666' },
  pollinationLoader: { marginLeft: 8 },
  serverUrlRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  serverUrlInput: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 4,
  },
  serverButtonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  serverBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serverBtnPrimary: {
    backgroundColor: '#1a3c27',
    borderColor: '#1a3c27',
  },
  serverBtnText: { fontSize: 15, color: '#333', fontWeight: '500' },
  serverBtnPrimaryText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  advancedGrid: { gap: 10 },
  advancedBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    padding: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  advancedBtnMerge: {
    borderColor: '#1a3c27',
    backgroundColor: '#f0f7f2',
  },
  advancedBtnDanger: {
    borderColor: '#b91c1c',
    backgroundColor: '#fef2f2',
    marginTop: 8,
  },
  advancedBtnLabel: { fontSize: 15, color: '#333', fontWeight: '500' },
  advancedBtnLabelDanger: { fontSize: 15, color: '#b91c1c', fontWeight: '600' },
});
