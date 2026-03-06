import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getGarden, getUserPreferences, updateUserPreferences } from '@/api/client';
import type { GardenMinimal } from '@/types/api';

export default function GardenDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [garden, setGarden] = useState<GardenMinimal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);

  useEffect(() => {
    if (!id) return;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      setError('ID invalide');
      setLoading(false);
      return;
    }
    getGarden(numId)
      .then(setGarden)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [id]);

  const refreshIsDefault = useCallback(() => {
    if (!id || !garden) return;
    const numId = parseInt(id, 10);
    getUserPreferences()
      .then((prefs) => setIsDefault(prefs.default_garden_id === numId))
      .catch(() => setIsDefault(false));
  }, [id, garden]);

  useFocusEffect(refreshIsDefault);

  const handleSetDefault = async () => {
    if (!garden || settingDefault) return;
    setSettingDefault(true);
    try {
      await updateUserPreferences({ default_garden_id: garden.id });
      setIsDefault(true);
    } catch {
      // ignore
    } finally {
      setSettingDefault(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a3c27" />
      </View>
    );
  }

  if (error || !garden) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error || 'Jardin introuvable'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{garden.nom}</Text>
      {(garden.ville || garden.adresse) && (
        <Text style={styles.subtitle}>
          {[garden.ville, garden.adresse].filter(Boolean).join(' — ')}
        </Text>
      )}
      {garden.latitude != null && garden.longitude != null && (
        <Text style={styles.info}>
          Coordonnées : {garden.latitude.toFixed(4)}, {garden.longitude.toFixed(4)}
        </Text>
      )}

      <View style={styles.defaultSection}>
        {isDefault ? (
          <View style={styles.defaultBadge}>
            <Ionicons name="checkmark-circle" size={22} color="#1a3c27" />
            <Text style={styles.defaultBadgeText}>Jardin par défaut</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.defaultButton, settingDefault && styles.defaultButtonDisabled]}
            onPress={handleSetDefault}
            disabled={settingDefault}
            activeOpacity={0.7}
          >
            {settingDefault ? (
              <ActivityIndicator size="small" color="#1a3c27" />
            ) : (
              <>
                <Ionicons name="star-outline" size={22} color="#1a3c27" />
                <Text style={styles.defaultButtonText}>Définir comme jardin par défaut</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        <Text style={styles.defaultHint}>
          Le jardin par défaut sera présélectionné lors de la création de spécimens et autres contenus.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  content: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a3c27',
  },
  subtitle: {
    fontSize: 16,
    color: '#4a6741',
    marginTop: 8,
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
  },
  defaultSection: {
    marginTop: 28,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  defaultBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a3c27',
  },
  defaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1a3c27',
  },
  defaultButtonDisabled: {
    opacity: 0.7,
  },
  defaultButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a3c27',
  },
  defaultHint: {
    fontSize: 13,
    color: '#666',
    marginTop: 12,
    lineHeight: 18,
  },
  error: {
    color: '#c44',
    fontSize: 16,
  },
});
