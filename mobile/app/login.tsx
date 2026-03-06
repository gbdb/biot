import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { login } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { FAB } from '@/components/FAB';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      setAuthenticated(true);
      router.replace('/(tabs)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion';
      // Timeout ou connexion refusée → message explicite pour le dev local
      const isNetwork =
        /aborted|network request failed|failed to fetch|connection refused|econnrefused/i.test(msg) ||
        msg === 'Aborted';
      setError(
        isNetwork
          ? 'Serveur injoignable. Vérifiez que Django tourne sur ce Mac (runserver 0.0.0.0:8000) et que l’IP dans .env est correcte (ex. http://192.168.0.143:8000).'
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
        <Text style={styles.title}>🌳 Jardin Biot</Text>
        <Text style={styles.subtitle}>Connectez-vous pour accéder aux spécimens</Text>

        <TextInput
          style={styles.input}
          placeholder="Nom d'utilisateur"
          placeholderTextColor="#999"
          value={username}
          onChangeText={(t) => {
            setUsername(t);
            setError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#999"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setError(null);
          }}
          secureTextEntry
          editable={!loading}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <FAB
          label={loading ? 'Connexion...' : 'Se connecter'}
          variant="primary"
          size="large"
          onPress={handleLogin}
          disabled={loading}
          style={styles.loginFAB}
        />

        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => router.push('/register')}
          disabled={loading}
        >
          <Text style={styles.registerLinkText}>Nouvel utilisateur ? Créer un compte</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  form: {
    width: '100%',
    maxWidth: 320,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a3c27',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4a6741',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
    color: '#333',
  },
  error: {
    color: '#c44',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  loginFAB: {
    marginTop: 24,
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerLinkText: {
    fontSize: 16,
    color: '#1a3c27',
    textDecorationLine: 'underline',
  },
});
