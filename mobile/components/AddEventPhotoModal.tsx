import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadEventPhoto } from '@/api/client';
import type { Photo } from '@/types/api';

export const PHOTO_TYPE_LABELS: Record<string, string> = {
  avant: '📷 Avant',
  apres: '📷 Après',
  autre: '📷 Autre',
};

export type PhotoOrPending = Photo | { id: string; localUri: string; type_photo: string; titre?: string };

export function getPhotoThumbUri(p: PhotoOrPending, apiBaseUrl: string): string | null {
  if ('localUri' in p) return p.localUri;
  if (p.image_url?.startsWith('http')) return p.image_url;
  if (p.image) return `${apiBaseUrl}${p.image}`;
  return null;
}

async function pickAndUpload(
  source: 'camera' | 'library',
  specimenId: number,
  eventId: number,
  typePhoto: string,
  setUploading: (v: boolean) => void,
  onPendingPick?: (localUri: string, typePhoto: string) => string
): Promise<{ photo: Photo; pendingId: string | null } | null> {
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return null;
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return null;
  }
  const launcher = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  const result = await launcher({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const pendingId = onPendingPick?.(asset.uri, typePhoto) ?? null;
  setUploading(true);
  try {
    const photo = await uploadEventPhoto(specimenId, eventId, {
      image: {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: 'photo.jpg',
      },
      type_photo: typePhoto,
      titre: PHOTO_TYPE_LABELS[typePhoto] || typePhoto,
    });
    return { photo, pendingId };
  } catch {
    return { photo: null, pendingId };
  } finally {
    setUploading(false);
  }
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a3c27',
    marginBottom: 16,
  },
  typeButton: {
    padding: 12,
    backgroundColor: '#f0f0eb',
    borderRadius: 10,
    minWidth: '47%',
  },
  typeButtonSelected: {
    backgroundColor: '#1a3c27',
  },
  typeButtonText: {
    fontSize: 15,
    color: '#333',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0eb',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#333',
  },
});

const photoModalStyles = StyleSheet.create({
  tagLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  tagRow: { flexDirection: 'row' as const, gap: 8, flexWrap: 'wrap' as const, marginBottom: 12 },
  photoSourceRow: { flexDirection: 'row' as const, gap: 16, marginVertical: 16 },
  photoSourceBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f0eb',
    borderRadius: 12,
  },
  photoSourceLabel: { fontSize: 12, color: '#1a3c27', marginTop: 8 },
  successText: { fontSize: 16, color: '#2e7d32', marginTop: 12, textAlign: 'center' as const },
});

export function AddEventPhotoModal({
  visible,
  specimenId,
  eventId,
  onClose,
  onSuccess,
  onPendingPick,
  onUploadFailed,
}: {
  visible: boolean;
  specimenId: number;
  eventId: number;
  onClose: () => void;
  onSuccess: (photo: Photo, pendingId?: string) => void;
  onPendingPick?: (localUri: string, typePhoto: string) => string;
  onUploadFailed?: (pendingId: string) => void;
}) {
  const [typePhoto, setTypePhoto] = useState<string>('avant');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handlePick = async (source: 'camera' | 'library') => {
    const result = await pickAndUpload(source, specimenId, eventId, typePhoto, setUploading, onPendingPick);
    if (result?.photo) {
      setUploadSuccess(true);
      setTimeout(() => {
        onSuccess(result.photo!, result.pendingId ?? undefined);
        onClose();
      }, 1200);
    } else if (result?.pendingId) {
      onUploadFailed?.(result.pendingId);
      Alert.alert('Erreur', 'Impossible d\'envoyer la photo. Vérifiez votre connexion.');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={modalStyles.content} onStartShouldSetResponder={() => true}>
          <Text style={modalStyles.title}>Ajouter une photo</Text>
          <Text style={photoModalStyles.tagLabel}>Tag (avant/après)</Text>
          <View style={photoModalStyles.tagRow}>
            {['avant', 'apres', 'autre'].map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  modalStyles.typeButton,
                  typePhoto === t && modalStyles.typeButtonSelected,
                ]}
                onPress={() => setTypePhoto(t)}
              >
                <Text
                  style={[
                    modalStyles.typeButtonText,
                    typePhoto === t && modalStyles.typeButtonTextSelected,
                  ]}
                >
                  {PHOTO_TYPE_LABELS[t] || t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={photoModalStyles.photoSourceRow}>
            <TouchableOpacity
              style={photoModalStyles.photoSourceBtn}
              onPress={() => handlePick('camera')}
              disabled={uploading}
            >
              <Ionicons name="camera" size={36} color="#1a3c27" />
              <Text style={photoModalStyles.photoSourceLabel}>Prendre une photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={photoModalStyles.photoSourceBtn}
              onPress={() => handlePick('library')}
              disabled={uploading}
            >
              <Ionicons name="images" size={36} color="#1a3c27" />
              <Text style={photoModalStyles.photoSourceLabel}>Galerie</Text>
            </TouchableOpacity>
          </View>
          {uploadSuccess && (
            <Text style={photoModalStyles.successText}>✓ Photo enregistrée !</Text>
          )}
          {uploading && <ActivityIndicator size="small" color="#1a3c27" style={{ marginTop: 12 }} />}
          <TouchableOpacity style={[modalStyles.button, modalStyles.cancelButton]} onPress={onClose}>
            <Text style={modalStyles.cancelButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
