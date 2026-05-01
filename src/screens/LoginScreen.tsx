import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import type { ApiError } from '@/api/http';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Please fill all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login({ username: username.trim().toLowerCase(), password });
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr?.response) {
        setError(apiErr.response.data?.message ?? 'Login failed. Check your credentials.');
      } else {
        setError('Cannot reach server. Please ensure the backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Background layers to simulate gradient */}
      <View style={[StyleSheet.absoluteFill, styles.bgTop]} />
      <View style={[StyleSheet.absoluteFill, styles.bgBottom]} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoiding}>
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconBadge}>
                  <Text style={styles.iconLetter}>H</Text>
                </View>
                <Text style={styles.title}>ALKM Hotel</Text>
                <Text style={styles.subtitle}>MANAGEMENT SYSTEM</Text>
                <Text style={styles.tagline}>Sign in to your account</Text>
              </View>

              {/* Form */}
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your username"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="Enter your password"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                    />
                    <Pressable
                      style={styles.eyeButton}
                      onPress={() => setShowPassword((v) => !v)}
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                      <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                    </Pressable>
                  </View>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Pressable
                  style={({ pressed }) => [
                    styles.loginButton,
                    pressed && styles.loginButtonPressed,
                    loading && styles.loginButtonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#1e293b" />
                  ) : (
                    <Text style={styles.loginButtonText}>Login</Text>
                  )}
                </Pressable>
              </View>

              <Text style={styles.hint}>Demo password for seeded users: Password@123</Text>
            </View>
          </KeyboardAvoidingView>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  bgTop: {
    backgroundColor: '#0f172a',
    bottom: '50%',
  },
  bgBottom: {
    backgroundColor: '#1a2744',
    top: '50%',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  keyboardAvoiding: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    padding: 28,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 6,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f4d28f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#f4d28f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  iconLetter: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1e293b',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 15,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  passwordInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  eyeButton: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: 16,
  },
  error: {
    fontSize: 13,
    color: '#fca5a5',
    backgroundColor: 'rgba(239,68,68,0.15)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    lineHeight: 18,
  },
  loginButton: {
    backgroundColor: '#f4d28f',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#f4d28f',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
});
