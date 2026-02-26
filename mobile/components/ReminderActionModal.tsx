import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  updateSpecimenReminder,
  completeSpecimenReminder,
  deleteSpecimenReminder,
} from '@/api/client';
import type { ReminderUpcoming } from '@/api/client';
import { REMINDER_TYPE_LABELS, REMINDER_RECURRENCE_LABELS } from '@/types/api';
import type { ReminderRecurrenceRule } from '@/types/api';
import { FAB } from '@/components/FAB';

type ReminderActionModalProps = {
  visible: boolean;
  reminder: ReminderUpcoming | null;
  onClose: () => void;
  onAction: () => void;
  onOpenSpecimen?: (specimenId: number) => void;
};

export function ReminderActionModal({
  visible,
  reminder,
  onClose,
  onAction,
  onOpenSpecimen,
}: ReminderActionModalProps) {
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [recurrenceRule, setRecurrenceRule] = useState<ReminderRecurrenceRule>(
    (reminder?.recurrence_rule as ReminderRecurrenceRule) || 'none'
  );

  useEffect(() => {
    if (!reminder) return;
    setRecurrenceRule((reminder.recurrence_rule as ReminderRecurrenceRule) || 'none');
    setRescheduleDate(null);
    setShowDatePicker(false);
  }, [reminder?.id]);

  if (!visible || !reminder) return null;

  const specimenId = reminder.specimen.id;
  const reminderId = reminder.id;
  const typeLabel = REMINDER_TYPE_LABELS[reminder.type_rappel as keyof typeof REMINDER_TYPE_LABELS] ?? reminder.type_rappel;
  const recurrenceLabel = REMINDER_RECURRENCE_LABELS[recurrenceRule] ?? reminder.recurrence_rule;

  const handleReschedule = () => {
    const d = rescheduleDate || new Date(reminder.date_rappel);
    setLoading(true);
    updateSpecimenReminder(specimenId, reminderId, { date_rappel: d.toISOString().slice(0, 10) })
      .then(() => {
        onAction();
        onClose();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const onDateChange = (_: unknown, date?: Date) => {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (date) setRescheduleDate(date);
  };

  const showApplyDate = rescheduleDate != null || (Platform.OS === 'ios' && showDatePicker);

  const handleSetRecurrence = () => {
    setLoading(true);
    updateSpecimenReminder(specimenId, reminderId, { recurrence_rule: recurrenceRule })
      .then(() => {
        onAction();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le rappel',
      'Ce rappel sera définitivement supprimé.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            setLoading(true);
            deleteSpecimenReminder(specimenId, reminderId)
              .then(() => {
                onAction();
                onClose();
              })
              .catch(() => {})
              .finally(() => setLoading(false));
          },
        },
      ]
    );
  };

  const handleComplete = () => {
    const hasRecurrence = reminder.recurrence_rule && reminder.recurrence_rule !== 'none';
    const doComplete = (createNext: boolean) => {
      setLoading(true);
      completeSpecimenReminder(specimenId, reminderId, createNext)
        .then(() => {
          onAction();
          onClose();
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    if (hasRecurrence) {
      Alert.alert(
        'Marquer comme complété',
        'Créer automatiquement le prochain rappel ?',
        [
          { text: 'Non', onPress: () => doComplete(false) },
          { text: 'Oui', onPress: () => doComplete(true) },
        ]
      );
    } else {
      doComplete(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rappel</Text>
          <View style={{ width: 28 }} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.specimenName}>{reminder.specimen.nom}</Text>
            <Text style={styles.typeLabel}>{typeLabel}</Text>
            <Text style={styles.dateText}>📅 {reminder.date_rappel}</Text>
            {reminder.recurrence_rule && reminder.recurrence_rule !== 'none' && (
              <Text style={styles.recurrenceText}>
                Récurrent : {REMINDER_RECURRENCE_LABELS[reminder.recurrence_rule as ReminderRecurrenceRule] ?? reminder.recurrence_rule}
              </Text>
            )}
            {reminder.titre ? <Text style={styles.titre}>{reminder.titre}</Text> : null}
            {reminder.description ? <Text style={styles.description}>{reminder.description}</Text> : null}
            {onOpenSpecimen && (
              <TouchableOpacity
                style={styles.linkSpecimen}
                onPress={() => {
                  onClose();
                  onOpenSpecimen(specimenId);
                }}
              >
                <Ionicons name="leaf-outline" size={18} color="#4a6741" />
                <Text style={styles.linkSpecimenText}>Voir la fiche du spécimen</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Reporter à plus tard */}
          <Text style={styles.sectionLabel}>Reporter à plus tard</Text>
          {showDatePicker && (
            <DateTimePicker
              value={rescheduleDate || new Date(reminder.date_rappel)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
          {!showDatePicker && (
            <FAB
              label={rescheduleDate ? rescheduleDate.toLocaleDateString('fr-CA') : 'Choisir une date'}
              icon="calendar-outline"
              variant="secondary"
              onPress={() => setShowDatePicker(true)}
              disabled={loading}
              style={styles.fabSpacing}
            />
          )}
          {showApplyDate && (
            <FAB
              label="Appliquer la date"
              variant="secondary"
              onPress={handleReschedule}
              disabled={loading}
              style={styles.fabSpacing}
            />
          )}

          {/* Récurrence */}
          <Text style={styles.sectionLabel}>Récurrence</Text>
          <View style={styles.recurrenceRow}>
            {(['none', 'biweekly', 'annual', 'biannual'] as const).map((rule) => (
              <TouchableOpacity
                key={rule}
                style={[styles.recurrenceChip, recurrenceRule === rule && styles.recurrenceChipSelected]}
                onPress={() => setRecurrenceRule(rule)}
              >
                <Text style={[styles.recurrenceChipText, recurrenceRule === rule && styles.recurrenceChipTextSelected]}>
                  {REMINDER_RECURRENCE_LABELS[rule]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <FAB
            label="Appliquer la récurrence"
            variant="secondary"
            onPress={handleSetRecurrence}
            disabled={loading}
            style={styles.fabSpacing}
          />

          {/* Supprimer */}
          <FAB
            label="Supprimer le rappel"
            icon="trash-outline"
            variant="danger"
            onPress={handleDelete}
            disabled={loading}
            style={styles.fabSpacing}
          />

          {/* Marquer comme complété */}
          <FAB
            label="Marquer comme complété"
            icon="checkmark-circle-outline"
            variant="primary"
            size="large"
            onPress={handleComplete}
            disabled={loading}
            style={styles.fabSpacing}
          />
          <Text style={styles.hint}>Crée un événement et supprime ce rappel. Si récurrent, peut créer le prochain.</Text>

          {/* Fermer le rappel — fermer sans action */}
          <FAB
            label="Fermer le rappel"
            icon="close-circle-outline"
            variant="neutral"
            size="large"
            onPress={onClose}
            disabled={loading}
            style={styles.fabSpacing}
          />

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#1a3c27" />
            </View>
          )}
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
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeBtn: { fontSize: 22, color: '#333' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1a3c27' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  specimenName: { fontSize: 18, fontWeight: '600', color: '#1a3c27', marginBottom: 4 },
  typeLabel: { fontSize: 15, color: '#4a6741', marginBottom: 4 },
  dateText: { fontSize: 14, color: '#666', marginBottom: 4 },
  recurrenceText: { fontSize: 13, color: '#888', marginBottom: 8 },
  titre: { fontSize: 14, color: '#333', marginTop: 4 },
  description: { fontSize: 13, color: '#666', marginTop: 4 },
  linkSpecimen: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  linkSpecimenText: { fontSize: 14, color: '#4a6741', fontWeight: '500' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 8 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 10,
  },
  actionButtonText: { fontSize: 15, color: '#1a3c27' },
  actionButtonSecondary: { backgroundColor: '#e8f0ea' },
  actionButtonTextSecondary: { fontSize: 15, color: '#4a6741' },
  actionButtonDanger: { borderColor: '#fcc' },
  actionButtonTextDanger: { fontSize: 15, color: '#c44' },
  actionButtonPrimary: { backgroundColor: '#1a3c27', borderColor: '#1a3c27' },
  actionButtonTextPrimary: { fontSize: 15, color: '#fff', fontWeight: '600' },
  recurrenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  recurrenceChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  recurrenceChipSelected: { backgroundColor: '#1a3c27' },
  recurrenceChipText: { fontSize: 13, color: '#333' },
  recurrenceChipTextSelected: { color: '#fff' },
  hint: { fontSize: 12, color: '#888', marginTop: 4, marginBottom: 16 },
  fabSpacing: { marginBottom: 12, marginTop: 4 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)' },
});
