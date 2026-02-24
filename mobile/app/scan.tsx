import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, Link } from 'expo-router';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getSpecimenByNfcOrNull, getSpecimens, updateSpecimen } from '@/api/client';
import type { SpecimenList } from '@/types/api';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function AssignTagModal({
  visible,
  uid,
  onClose,
  onAssigned,
}: {
  visible: boolean;
  uid: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [specimens, setSpecimens] = useState<SpecimenList[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      getSpecimens()
        .then(setSpecimens)
        .catch(() => setSpecimens([]))
        .finally(() => setLoading(false));
    }
  }, [visible]);

  const handleSelect = async (specimen: SpecimenList) => {
    setAssigning(true);
    try {
      await updateSpecimen(specimen.id, { nfc_tag_uid: uid });
      Alert.alert('Tag assigné', `Le tag a été associé à « ${specimen.nom} ».`);
      onAssigned();
      onClose();
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible d\'assigner le tag.');
    } finally {
      setAssigning(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={assignModalStyles.container}>
        <View style={assignModalStyles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={assignModalStyles.closeBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={assignModalStyles.headerTitle}>Assigner le tag à un spécimen</Text>
          <View style={{ width: 28 }} />
        </View>
        <Text style={assignModalStyles.uid}>Tag : {uid}</Text>
        {loading ? (
          <View style={assignModalStyles.centered}>
            <ActivityIndicator size="large" color="#1a3c27" />
          </View>
        ) : (
          <FlatList
            data={specimens}
            keyExtractor={(item) => String(item.id)}
            style={assignModalStyles.list}
            contentContainerStyle={assignModalStyles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={assignModalStyles.item}
                onPress={() => handleSelect(item)}
                disabled={assigning}
                activeOpacity={0.7}
              >
                <Text style={assignModalStyles.itemTitle}>{item.nom}</Text>
                <Text style={assignModalStyles.itemSubtitle}>{item.organisme_nom}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={assignModalStyles.emptyText}>Aucun spécimen. Créez-en un d&apos;abord.</Text>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const assignModalStyles = StyleSheet.create({
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
  uid: { fontSize: 14, color: '#666', padding: 16, fontFamily: 'monospace' },
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
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default function ScanScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error' | 'new_tag'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [scannedUid, setScannedUid] = useState<string | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);

  const handleScan = async () => {
    try {
      if (Platform.OS === 'web') {
        setStatus('error');
        setMessage('Le scan NFC n\'est pas disponible sur le web. Utilisez l\'app sur téléphone.');
        return;
      }
      if (isExpoGo) {
        setStatus('error');
        setMessage(
          'Le scan NFC nécessite un build natif. Lancez "npx expo run:ios" (ou run:android) au lieu d\'Expo Go.',
        );
        return;
      }
      let NfcManager: typeof import('react-native-nfc-manager').default;
      let NfcTech: typeof import('react-native-nfc-manager').NfcTech;
      try {
        const mod = await import('react-native-nfc-manager');
        NfcManager = mod.default;
        NfcTech = mod.NfcTech;
      } catch {
        setStatus('error');
        setMessage('NFC non disponible (ex: simulateur). Utilisez un appareil physique.');
        return;
      }

      setStatus('scanning');
      setMessage('Approchez le téléphone du tag NFC...');

      const isSupported = await NfcManager.isSupported();
      if (!isSupported) {
        setStatus('error');
        setMessage('NFC non supporté sur cet appareil.');
        return;
      }

      await NfcManager.requestTechnology(NfcTech.NfcA);
      const tag = await NfcManager.getTag();
      const uid = tag?.id;
      await NfcManager.cancelTechnologyRequest();

      if (!uid) {
        setStatus('error');
        setMessage('Impossible de lire le tag.');
        return;
      }

      const specimen = await getSpecimenByNfcOrNull(uid);
      if (specimen) {
        setStatus('success');
        setMessage(`${specimen.nom} — ${specimen.organisme.nom_commun}`);
        router.push(`/specimen/${specimen.id}`);
      } else {
        setStatus('new_tag');
        setScannedUid(uid);
        setMessage(`Tag inconnu (${uid}). Ce tag n'a jamais été scanné.`);
      }
    } catch (err) {
      try {
        const { default: M } = await import('react-native-nfc-manager');
        await M.cancelTechnologyRequest().catch(() => {});
      } catch {
        /* ignore */
      }
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Erreur de scan.');
    }
  };

  const handleCreateWithTag = () => {
    if (scannedUid) {
      router.push(`/specimen/create?nfc_tag_uid=${encodeURIComponent(scannedUid)}`);
      setStatus('idle');
      setMessage(null);
      setScannedUid(null);
    }
  };

  const handleAssignToExisting = () => {
    setAssignModalVisible(true);
  };

  const handleAssignModalClose = () => {
    setAssignModalVisible(false);
    setStatus('idle');
    setMessage(null);
    setScannedUid(null);
  };

  const handleAssigned = () => {
    setStatus('idle');
    setMessage(null);
    setScannedUid(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan NFC</Text>
      <Text style={styles.instruction}>
        Scannez un tag NFC associé à un spécimen pour ouvrir sa fiche instantanément.
      </Text>
      <Link href="/observation/quick" asChild>
        <TouchableOpacity style={styles.quickObsLink}>
          <Text style={styles.quickObsLinkText}>
            Plante non identifiée ? Faire une observation rapide
          </Text>
        </TouchableOpacity>
      </Link>
      <TouchableOpacity
        style={[styles.button, status === 'scanning' && styles.buttonScanning]}
        onPress={handleScan}
        disabled={status === 'scanning'}
      >
        <Text style={styles.buttonText}>
          {status === 'scanning' ? '⏳ En attente du tag...' : '📱 Scanner'}
        </Text>
      </TouchableOpacity>
      {message && (
        <Text style={[styles.message, status === 'error' && styles.messageError]}>{message}</Text>
      )}
      {status === 'new_tag' && scannedUid && (
        <View style={styles.newTagActions}>
          <Text style={styles.newTagTitle}>Que voulez-vous faire ?</Text>
          <TouchableOpacity
            style={[styles.button, styles.newTagButton]}
            onPress={handleCreateWithTag}
          >
            <Text style={styles.buttonText}>Créer un spécimen avec ce tag</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.assignButton]}
            onPress={handleAssignToExisting}
          >
            <Text style={styles.buttonText}>Assigner à un spécimen existant</Text>
          </TouchableOpacity>
        </View>
      )}
      <AssignTagModal
        visible={assignModalVisible}
        uid={scannedUid ?? ''}
        onClose={handleAssignModalClose}
        onAssigned={handleAssigned}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f5f5f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a3c27',
    marginBottom: 12,
  },
  instruction: {
    fontSize: 16,
    color: '#4a6741',
    marginBottom: 16,
    lineHeight: 24,
  },
  quickObsLink: {
    marginBottom: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  quickObsLinkText: {
    fontSize: 14,
    color: '#4a6741',
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: '#1a3c27',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 56,
  },
  buttonScanning: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  message: {
    marginTop: 24,
    fontSize: 16,
    color: '#4a6741',
    textAlign: 'center',
  },
  messageError: {
    color: '#c44',
  },
  newTagActions: {
    marginTop: 24,
  },
  newTagTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a3c27',
    marginBottom: 8,
  },
  newTagButton: {
    marginBottom: 12,
  },
  assignButton: {
    backgroundColor: '#4a6741',
    marginBottom: 0,
  },
});
