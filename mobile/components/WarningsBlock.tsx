import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGardenWarnings, completeSpecimenReminder } from '@/api/client';
import type {
  GardenWarningsResponse,
  OverdueReminderWarning,
  MissingPollinatorWarning,
  PhenologyAlertWarning,
} from '@/types/api';
import { REMINDER_TYPE_LABELS } from '@/types/api';

const PHENO_TYPE_LABELS: Record<string, string> = {
  floraison: 'Floraison',
  fructification: 'Fructification',
  recolte: 'Récolte',
};

type WarningItem =
  | { kind: 'overdue'; data: OverdueReminderWarning }
  | { kind: 'missing'; data: MissingPollinatorWarning }
  | { kind: 'phenology'; data: PhenologyAlertWarning };

export interface WarningsBlockProps {
  defaultGardenId: number | null;
  onConfirmPhenology?: (specimenId: number, typePeriode: 'floraison' | 'fructification' | 'recolte') => void;
  onWarningsChange?: () => void;
  /** Increment to force refetch (e.g. after adding an event). */
  refreshTrigger?: number;
}

export function WarningsBlock({
  defaultGardenId,
  onConfirmPhenology,
  onWarningsChange,
  refreshTrigger = 0,
}: WarningsBlockProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GardenWarningsResponse | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchWarnings = useCallback(async () => {
    if (defaultGardenId == null) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getGardenWarnings(defaultGardenId);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [defaultGardenId]);

  useEffect(() => {
    fetchWarnings();
  }, [fetchWarnings, refreshTrigger]);

  const dismiss = useCallback((key: string) => {
    setDismissed((prev) => new Set(prev).add(key));
  }, []);

  const handleCompleteReminder = useCallback(
    async (w: OverdueReminderWarning) => {
      const key = `overdue-${w.reminder_id}`;
      setCompletingId(key);
      try {
        await completeSpecimenReminder(w.specimen_id, w.reminder_id);
        dismiss(key);
        onWarningsChange?.();
        fetchWarnings();
      } catch {
        Alert.alert('Erreur', 'Impossible de marquer le rappel comme fait.');
      } finally {
        setCompletingId(null);
      }
    },
    [dismiss, fetchWarnings, onWarningsChange]
  );

  if (defaultGardenId == null) return null;
  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Points d'attention</Text>
        <ActivityIndicator size="small" color="#1a3c27" style={styles.loader} />
      </View>
    );
  }
  if (!data || data.total_count === 0) return null;

  const items: WarningItem[] = [];
  for (const w of data.overdue_reminders) {
    if (dismissed.has(`overdue-${w.reminder_id}`)) continue;
    items.push({ kind: 'overdue', data: w });
    if (items.length >= 5) break;
  }
  if (items.length < 5) {
    for (const w of data.missing_pollinators) {
      if (dismissed.has(`missing-${w.specimen_id}-${w.cultivar_nom}`)) continue;
      items.push({ kind: 'missing', data: w });
      if (items.length >= 5) break;
    }
  }
  if (items.length < 5) {
    for (const w of data.phenology_alerts) {
      if (dismissed.has(`pheno-${w.specimen_id}-${w.type_periode}`)) continue;
      items.push({ kind: 'phenology', data: w });
      if (items.length >= 5) break;
    }
  }

  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Points d'attention</Text>
        {data.total_count > 5 && (
          <TouchableOpacity
            onPress={() => router.push('/reminders')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.seeAllBtn}
          >
            <Text style={styles.seeAllText}>Voir tous ({data.total_count})</Text>
            <Ionicons name="chevron-forward" size={16} color="#4a6741" />
          </TouchableOpacity>
        )}
      </View>
      {items.map((item) => {
        if (item.kind === 'overdue') {
          const w = item.data as OverdueReminderWarning;
          const key = `overdue-${w.reminder_id}`;
          const typeLabel = REMINDER_TYPE_LABELS[w.type_rappel as keyof typeof REMINDER_TYPE_LABELS] ?? w.type_rappel;
          const completing = completingId === key;
          return (
            <View key={key} style={[styles.warningCard, styles.overdueCard]}>
              <View style={styles.warningBadgeRow}>
                <View style={styles.badgeRed}>
                  <Ionicons name="warning" size={14} color="#fff" />
                  <Text style={styles.badgeText}>Rappel en retard</Text>
                </View>
                <TouchableOpacity
                  onPress={() => dismiss(key)}
                  hitSlop={8}
                  style={styles.dismissBtn}
                >
                  <Ionicons name="close" size={18} color="#666" />
                </TouchableOpacity>
              </View>
              <Text style={styles.warningTitle}>{w.specimen_nom}</Text>
              <Text style={styles.warningSub}>{typeLabel} — {w.jours_retard} j. de retard</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => handleCompleteReminder(w)}
                  disabled={completing}
                >
                  {completing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Marquer fait</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => router.push(`/specimen/${w.specimen_id}`)}
                >
                  <Text style={styles.secondaryBtnText}>Voir →</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }
        if (item.kind === 'missing') {
          const w = item.data as MissingPollinatorWarning;
          const key = `missing-${w.specimen_id}-${w.cultivar_nom}`;
          return (
            <View key={key} style={[styles.warningCard, styles.missingCard]}>
              <View style={styles.warningBadgeRow}>
                <View style={styles.badgeYellow}>
                  <Text style={styles.badgeText}>Pollinisateur manquant</Text>
                </View>
                <TouchableOpacity onPress={() => dismiss(key)} hitSlop={8} style={styles.dismissBtn}>
                  <Ionicons name="close" size={18} color="#666" />
                </TouchableOpacity>
              </View>
              <Text style={styles.warningTitle}>{w.cultivar_nom}</Text>
              <Text style={styles.warningSub}>{w.pollinisateurs_manquants.join(', ')}</Text>
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => router.push('/species/library')}
              >
                <Text style={styles.linkBtnText}>Voir les espèces compatibles →</Text>
              </TouchableOpacity>
            </View>
          );
        }
        const w = item.data as PhenologyAlertWarning;
        const key = `pheno-${w.specimen_id}-${w.type_periode}`;
        const typeLabel = PHENO_TYPE_LABELS[w.type_periode] ?? w.type_periode;
        return (
          <View key={key} style={[styles.warningCard, styles.phenoCard]}>
            <View style={styles.warningBadgeRow}>
              <View style={styles.badgeGreen}>
                <Text style={styles.badgeText}>Stade imminent</Text>
              </View>
              <TouchableOpacity onPress={() => dismiss(key)} hitSlop={8} style={styles.dismissBtn}>
                <Ionicons name="close" size={18} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.warningTitle}>{w.specimen_nom}</Text>
            <Text style={styles.warningSub}>{typeLabel} — dans {w.jours_restants} j.</Text>
            {onConfirmPhenology && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() =>
                  onConfirmPhenology(w.specimen_id, w.type_periode as 'floraison' | 'fructification' | 'recolte')
                }
              >
                <Text style={styles.primaryBtnText}>Confirmer →</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a3c27',
  },
  loader: { marginVertical: 12 },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    color: '#4a6741',
    fontWeight: '500',
  },
  warningCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  overdueCard: { backgroundColor: '#fff0f0' },
  missingCard: { backgroundColor: '#fffbe6' },
  phenoCard: { backgroundColor: '#e8f5e9' },
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
  badgeYellow: {
    backgroundColor: '#d4a017',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeGreen: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  dismissBtn: { padding: 4 },
  warningTitle: { fontSize: 16, fontWeight: '600', color: '#1a3c27', marginBottom: 2 },
  warningSub: { fontSize: 14, color: '#555', marginBottom: 10 },
  actionRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  primaryBtn: {
    backgroundColor: '#1a3c27',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  secondaryBtnText: { fontSize: 14, color: '#4a6741', fontWeight: '500' },
  linkBtn: { alignSelf: 'flex-start' },
  linkBtnText: { fontSize: 14, color: '#4a6741', fontWeight: '500' },
});
