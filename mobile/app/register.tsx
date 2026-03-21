/**
 * Inscription : création d'un nouveau compte utilisateur.
 */
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { register } from '@/api/client';
import { FAB } from '@/components/FAB';

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    setError(null);
    if (!username.trim()) {
      setError("Le nom d'utilisateur est obligatoire.");
      return;
    }
    if (!password) {
      setError('Le mot de passe est obligatoire.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await register({
        username: username.trim(),
        password,
        password_confirm: passwordConfirm,
        email: email.trim() || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'inscription.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.form}>
          <Text style={styles.title}>Compte créé</Text>
          <Text style={styles.subtitle}>
            Vous pouvez maintenant vous connecter avec votre nom d'utilisateur et votre mot de passe.
          </Text>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.backLinkText}>Retour à la connexion</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <Text style={styles.title}>Nouvel utilisateur</Text>
          <Text style={styles.subtitle}>Créez un compte pour utiliser Jardin Biot</Text>

          <TextInput
            style={styles.input}
            placeholder="Nom d'utilisateur *"
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
            placeholder="Mot de passe *"
            placeholderTextColor="#999"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError(null);
            }}
            secureTextEntry
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirmer le mot de passe *"
            placeholderTextColor="#999"
            value={passwordConfirm}
            onChangeText={(t) => {
              setPasswordConfirm(t);
              setError(null);
            }}
            secureTextEntry
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Email (optionnel)"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <FAB
            label={loading ? 'Création...' : 'Créer le compte'}
            variant="primary"
            size="large"
            onPress={handleRegister}
            disabled={loading}
            style={styles.submitFAB}
          />

          <TouchableOpacity
            style={styles.serverLink}
            onPress={() => router.push('/settings')}
            disabled={loading}
          >
            <Text style={styles.serverLinkText}>URL du serveur (Paramètres réseau)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.backLinkText}>Déjà un compte ? Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
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
  submitFAB: {
    marginTop: 24,
  },
  serverLink: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 4,
  },
  serverLinkText: {
    fontSize: 15,
    color: '#2d5a3d',
    textDecorationLine: 'underline',
  },
  backLink: {
    marginTop: 12,
    alignItems: 'center',
  },
  backLinkText: {
    fontSize: 16,
    color: '#1a3c27',
    textDecorationLine: 'underline',
  },
});
