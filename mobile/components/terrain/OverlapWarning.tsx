import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CesiumOverlap, SpecimenList } from '@/types/api';

export interface OverlapWarningProps {
  overlap: CesiumOverlap;
  specimens: SpecimenList[];
  onDismiss?: () => void;
}

function specimenName(specimens: SpecimenList[], id: number): string {
  const s = specimens.find((x) => x.id === id);
  return s?.nom ?? s?.organisme_nom ?? `#${id}`;
}

export function OverlapWarning({ overlap, specimens, onDismiss }: OverlapWarningProps) {
  const nameA = specimenName(specimens, overlap.a);
  const nameB = specimenName(specimens, overlap.b);
  const label = `Chevauchement possible : ${nameA} + ${nameB} à ${overlap.distance_m} m`;

  return (
    <View style={[styles.warningCard, styles.overdueCard]}>
      <View style={styles.warningBadgeRow}>
        <View style={styles.badgeRed}>
          <Ionicons name="warning" size={14} color="#fff" />
          <Text style={styles.badgeText}>Emprise</Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} hitSlop={8} style={styles.dismissBtn}>
            <Ionicons name="close" size={18} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.warningTitle}>{label}</Text>
      <Text style={styles.warningSub}>
        Distance recommandée : {overlap.min_recommended} m minimum
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  warningCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    marginHorizontal: 12,
    marginTop: 8,
  },
  overdueCard: { backgroundColor: '#fff0f0' },
  warningBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgeRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#c44',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  dismissBtn: { padding: 4 },
  warningTitle: { fontSize: 16, fontWeight: '600', color: '#1a3c27', marginBottom: 2 },
  warningSub: { fontSize: 14, color: '#555' },
});
