import { Image } from 'expo-image';
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
  const [showPassword] = useState(false);
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
      {/* Light background */}
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
                <Image
                  source={require('../../assets/alkm-logo.png')}
                  style={styles.logoImage}
                  contentFit="contain"
                />
                <Text style={styles.title}>ALAKAMANDA</Text>
                <Text style={styles.subtitle}>HOTEL MANAGEMENT SYSTEM</Text>
                <Text style={styles.tagline}>Sign in to your account</Text>
              </View>

              {/* Form */}
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your username"
                    placeholderTextColor="#94a3b8"
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
                      placeholderTextColor="#94a3b8"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                    />
                   
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
                    <ActivityIndicator color="#ffffff" />
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
    backgroundColor: '#f4f7fb',
  },
  bgTop: {
    backgroundColor: '#f4f7fb',
    bottom: '50%',
  },
  bgBottom: {
    backgroundColor: '#eef5fb',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 24,
    shadowColor: '#0f1f2e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 6,
  },
  header: {
    alignItems: 'center',
    gap: 6,
  },
  logoImage: {
    width: 50,
    height: 50,
    marginTop:12,
    marginBottom: 8,
    borderRadius: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f1f2e',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#486581',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 14,
    color: '#486581',
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
    color: '#486581',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#eef5fb',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0f1f2e',
    fontSize: 15,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  passwordInput: {
    flex: 1,
  },
  eyeButton: {
    backgroundColor: '#eef5fb',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    color: '#c1121f',
    backgroundColor: '#c1121f18',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c1121f33',
    lineHeight: 18,
  },
  loginButton: {
    backgroundColor: '#005f73',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#005f73',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
  },
});