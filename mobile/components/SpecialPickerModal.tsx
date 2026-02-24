import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useState, useEffect } from 'react';
import type { SpecimenStatut } from '@/types/api';
import { SPECIMEN_STATUT_LABELS } from '@/types/api';

const SANTE_OPTIONS = [
  { value: 1, label: '1 - Très malade' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5 - Moyen' },
  { value: 6, label: '6' },
  { value: 7, label: '7' },
  { value: 8, label: '8' },
  { value: 9, label: '9' },
  { value: 10, label: '10 - Excellent' },
];

const STATUT_OPTIONS = Object.entries(SPECIMEN_STATUT_LABELS) as [SpecimenStatut, string][];

export type SpecialFilters = {
  sante?: number;
  statut?: SpecimenStatut;
};

type SpecialPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: SpecialFilters) => void;
  initialFilters?: SpecialFilters;
};

export function SpecialPickerModal({
  visible,
  onClose,
  onApply,
  initialFilters = {},
}: SpecialPickerModalProps) {
  const [sante, setSante] = useState<number | undefined>(initialFilters.sante);
  const [statut, setStatut] = useState<SpecimenStatut | undefined>(initialFilters.statut);

  useEffect(() => {
    if (visible) {
      setSante(initialFilters.sante);
      setStatut(initialFilters.statut);
    }
  }, [visible, initialFilters.sante, initialFilters.statut]);

  const handleApply = () => {
    onApply({ sante, statut });
    onClose();
  };

  const handleClear = () => {
    setSante(undefined);
    setStatut(undefined);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Filtres spéciaux</Text>
          <View style={{ width: 28 }} />
        </View>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          <Text style={styles.sectionTitle}>Santé</Text>
          <View style={styles.optionsRow}>
            {SANTE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionChip, sante === opt.value && styles.optionChipActive]}
                onPress={() => setSante(sante === opt.value ? undefined : opt.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    sante === opt.value && styles.optionChipTextActive,
                  ]}
                >
                  {opt.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Statut</Text>
          <View style={styles.optionsColumn}>
            {STATUT_OPTIONS.map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={[styles.optionRow, statut === value && styles.optionRowActive]}
                onPress={() => setStatut(statut === value ? undefined : value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.optionRowText, statut === value && styles.optionRowTextActive]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear} activeOpacity={0.7}>
              <Text style={styles.clearButtonText}>Effacer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.7}>
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  content: { flex: 1 },
  contentInner: { padding: 16, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a3c27',
    marginTop: 16,
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#e8f0eb',
  },
  optionChipActive: {
    backgroundColor: '#1a3c27',
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a3c27',
  },
  optionChipTextActive: {
    color: '#fff',
  },
  optionsColumn: {
    gap: 6,
  },
  optionRow: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionRowActive: {
    backgroundColor: '#1a3c27',
  },
  optionRowText: {
    fontSize: 15,
    color: '#1a3c27',
  },
  optionRowTextActive: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    justifyContent: 'flex-end',
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#e8f0eb',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a6741',
  },
  applyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#1a3c27',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
