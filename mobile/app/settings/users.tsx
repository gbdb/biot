/**
 * Gestion des utilisateurs : liste et promotion en administrateur (is_staff).
 * Visible aux staff, modification is_staff réservée aux superusers.
 */
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Switch } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { getAdminUsers, updateAdminUser, getMe } from '@/api/client';
import type { AdminUser } from '@/api/client';

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [me, setMe] = useState<{ is_superuser?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [userList, profile] = await Promise.all([getAdminUsers(), getMe()]);
      setUsers(userList);
      setMe(profile);
    } catch {
      setUsers([]);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const onToggleStaff = async (user: AdminUser, isStaff: boolean) => {
    if (!me?.is_superuser) return;
    setUpdatingId(user.id);
    try {
      const updated = await updateAdminUser(user.id, { is_staff: isStaff });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a3c27" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.hint}>
        Seul un superutilisateur peut attribuer ou retirer le statut administrateur. Les administrateurs peuvent lancer les imports (VASCAN, USDA, etc.) depuis Paramètres → Avancé.
      </Text>
      <View style={styles.list}>
        {users.map((user) => (
          <View key={user.id} style={styles.row}>
            <View style={styles.userInfo}>
              <Text style={styles.username}>{user.username}</Text>
              {user.email ? <Text style={styles.email}>{user.email}</Text> : null}
              {(user.is_staff || user.is_superuser) && (
                <Text style={styles.badges}>
                  {user.is_superuser ? 'Superadmin' : ''}
                  {user.is_superuser && user.is_staff ? ' · ' : ''}
                  {user.is_staff ? 'Administrateur' : ''}
                </Text>
              )}
            </View>
            {me?.is_superuser && (
              <View style={styles.toggleWrap}>
                {updatingId === user.id ? (
                  <ActivityIndicator size="small" color="#1a3c27" />
                ) : (
                  <>
                    <Text style={styles.toggleLabel}>Admin</Text>
                    <Switch
                      value={user.is_staff}
                      onValueChange={(v) => onToggleStaff(user, v)}
                      trackColor={{ false: '#ccc', true: '#a8d4b0' }}
                      thumbColor={user.is_staff ? '#1a3c27' : '#f4f3f4'}
                    />
                  </>
                )}
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f5f5f0' },
  container: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f0' },
  hint: { fontSize: 14, color: '#666', marginBottom: 16 },
  list: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e8e8e8' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userInfo: { flex: 1 },
  username: { fontSize: 16, fontWeight: '600', color: '#333' },
  email: { fontSize: 14, color: '#666', marginTop: 2 },
  badges: { fontSize: 12, color: '#1a3c27', marginTop: 4 },
  toggleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel: { fontSize: 14, color: '#666' },
});
