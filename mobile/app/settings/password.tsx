/**
 * Changer le mot de passe.
 */
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { changePassword } from '@/api/client';

export default function PasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (!currentPassword.trim()) {
      setError('Indiquez votre mot de passe actuel.');
      return;
    }
    if (!newPassword) {
      setError('Indiquez le nouveau mot de passe.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du changement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.label}>Mot de passe actuel</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={(t) => { setCurrentPassword(t); setError(null); }}
          placeholder="••••••••"
          placeholderTextColor="#999"
          secureTextEntry
          autoCapitalize="none"
        />
        <Text style={styles.label}>Nouveau mot de passe</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={(t) => { setNewPassword(t); setError(null); }}
          placeholder="••••••••"
          placeholderTextColor="#999"
          secureTextEntry
          autoCapitalize="none"
        />
        <Text style={styles.label}>Confirmer le nouveau mot de passe</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
          placeholder="••••••••"
          placeholderTextColor="#999"
          secureTextEntry
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.btnLabel}>Changer le mot de passe</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  scroll: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  error: { color: '#c00', marginBottom: 12, fontSize: 14 },
  btn: {
    backgroundColor: '#1a3c27',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.7 },
  btnLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
