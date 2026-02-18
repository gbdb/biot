import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { getSpecimenByNfc } from '@/api/client';

export default function ScanScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const handleScan = async () => {
    try {
      if (Platform.OS === 'web') {
        setStatus('error');
        setMessage('Le scan NFC n\'est pas disponible sur le web. Utilisez l\'app sur téléphone.');
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

      const specimen = await getSpecimenByNfc(uid);
      setStatus('success');
      setMessage(`${specimen.nom} — ${specimen.organisme.nom_commun}`);
      router.push(`/specimen/${specimen.id}`);
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan NFC</Text>
      <Text style={styles.instruction}>
        Scannez un tag NFC associé à un spécimen pour ouvrir sa fiche instantanément.
      </Text>
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
    marginBottom: 32,
    lineHeight: 24,
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
});
