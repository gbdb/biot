import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export type FilterType = 'tous' | 'favoris' | 'zone' | 'special';

type SpecimenFilterBarProps = {
  activeFilter: FilterType;
  selectedZone?: string | null;
  onFilterTous: () => void;
  onFilterFavoris: () => void;
  onFilterZones: () => void;
  onFilterSpecial: () => void;
};

export function SpecimenFilterBar({
  activeFilter,
  selectedZone,
  onFilterTous,
  onFilterFavoris,
  onFilterZones,
  onFilterSpecial,
}: SpecimenFilterBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        style={[styles.button, activeFilter === 'tous' && styles.buttonActive]}
        onPress={onFilterTous}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, activeFilter === 'tous' && styles.buttonTextActive]}>
          Tous
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, activeFilter === 'favoris' && styles.buttonActive]}
        onPress={onFilterFavoris}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, activeFilter === 'favoris' && styles.buttonTextActive]}>
          Mes Favoris
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, (activeFilter === 'zone' || selectedZone) && styles.buttonActive]}
        onPress={onFilterZones}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.buttonText,
            (activeFilter === 'zone' || selectedZone) && styles.buttonTextActive,
          ]}
        >
          {selectedZone ? `Zones: ${selectedZone}` : 'Zones'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, activeFilter === 'special' && styles.buttonActive]}
        onPress={onFilterSpecial}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, activeFilter === 'special' && styles.buttonTextActive]}>
          Special
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#e8f0eb',
  },
  buttonActive: {
    backgroundColor: '#1a3c27',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a3c27',
  },
  buttonTextActive: {
    color: '#fff',
  },
});
