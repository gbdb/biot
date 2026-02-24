import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { useState } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type NfcScanResult = { uid: string } | { error: string };

async function performNfcScan(): Promise<NfcScanResult> {
  if (Platform.OS === 'web') {
    return { error: "Le scan NFC n'est pas disponible sur le web." };
  }
  if (isExpoGo) {
    return {
      error: 'Le scan NFC nécessite un build natif (npx expo run:ios ou run:android).',
    };
  }
  let NfcManager: typeof import('react-native-nfc-manager').default;
  let NfcTech: typeof import('react-native-nfc-manager').NfcTech;
  try {
    const mod = await import('react-native-nfc-manager');
    NfcManager = mod.default;
    NfcTech = mod.NfcTech;
  } catch {
    return { error: 'NFC non disponible (ex: simulateur). Utilisez un appareil physique.' };
  }

  const isSupported = await NfcManager.isSupported();
  if (!isSupported) {
    return { error: 'NFC non supporté sur cet appareil.' };
  }

  try {
    await NfcManager.requestTechnology(NfcTech.NfcA);
    const tag = await NfcManager.getTag();
    const uid = tag?.id;
    await NfcManager.cancelTechnologyRequest();

    if (!uid) {
      return { error: 'Impossible de lire le tag.' };
    }
    return { uid };
  } catch (err) {
    try {
      await NfcManager.cancelTechnologyRequest().catch(() => {});
    } catch {
      /* ignore */
    }
    return { error: err instanceof Error ? err.message : 'Erreur de scan.' };
  }
}

type NfcScanModalProps = {
  visible: boolean;
  onSuccess: (uid: string) => void;
  onClose: () => void;
};

export function NfcScanModal({ visible, onSuccess, onClose }: NfcScanModalProps) {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const handleScan = async () => {
    setStatus('scanning');
    setMessage('Approchez le téléphone du tag NFC...');

    const result = await performNfcScan();

    if ('uid' in result) {
      setStatus('success');
      setMessage(`Tag lu : ${result.uid}`);
      onSuccess(result.uid);
      onClose();
    } else {
      setStatus('error');
      setMessage(result.error);
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setMessage(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scanner le tag NFC</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.content}>
          <Text style={styles.instruction}>
            {status === 'idle' && 'Appuyez sur le bouton pour lancer le scan.'}
            {status === 'scanning' && 'Approchez le téléphone du tag NFC...'}
            {status === 'success' && 'Tag enregistré !'}
            {status === 'error' && message}
          </Text>
          {status === 'idle' && (
            <TouchableOpacity style={styles.scanButton} onPress={handleScan} activeOpacity={0.8}>
              <Text style={styles.scanButtonText}>📱 Lancer le scan</Text>
            </TouchableOpacity>
          )}
          {status === 'scanning' && (
            <Text style={styles.scanningText}>En attente du tag...</Text>
          )}
          {status === 'error' && (
            <TouchableOpacity style={styles.retryButton} onPress={handleScan} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  closeBtn: { fontSize: 24, color: '#1a3c27', fontWeight: '300' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1a3c27' },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instruction: {
    fontSize: 16,
    color: '#4a6741',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  scanButton: {
    backgroundColor: '#1a3c27',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  scanButtonText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  scanningText: { fontSize: 16, color: '#666', fontStyle: 'italic' },
  retryButton: {
    backgroundColor: '#4a6741',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  retryButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
