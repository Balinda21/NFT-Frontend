import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { API_ENDPOINTS } from '../../config/api';
import { api } from '../../services/apiClient';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async () => {
    setError(null); // Clear previous errors

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.LOGIN_PASSWORD, {
        email,
        password,
      }, { skipAuth: true });

      // Check for success - API returns status: "success" or success: true
      const isSuccess = response.status === 'success' || response.success === true;

      if (isSuccess && response.data) {
        const token = response.data.accessToken;
        const user = response.data.user;
        const refreshTokenValue = response.data.refreshToken;

        // Ensure user object has all required fields
        if (!token || !user || !user.id) {
          setError('Invalid response from server');
          setLoading(false);
          return;
        }

        // Call login and wait for it to complete
        try {
          await login(token, user, refreshTokenValue);
          // Navigation will happen automatically via AuthContext state update
        } catch (loginError: any) {
          setError(loginError.message || 'Failed to save login data');
        }
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (error: any) {
      // Show error message from server or fallback
      const errorMessage = error.message || 'Network error. Please check your connection.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError(null); // Clear previous errors

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, {
        email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      }, { skipAuth: true });

      if (response.success) {
        // After successful signup, automatically log in
        await handleEmailLogin();
      } else {
        setError(response.message || 'Sign up failed');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Network error. Please check your connection.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>DB</Text>
            </View>
            <Text style={styles.brandText}>Business</Text>
          </View>

          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, isLogin && styles.toggleButtonActive]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
                Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, !isLogin && styles.toggleButtonActive]}
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
        </View>

          {!isLogin && (
            <>
              <TextInput
                style={styles.input}
                placeholder="First Name"
                placeholderTextColor={colors.textMuted}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                placeholderTextColor={colors.textMuted}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </>
          )}

            <TextInput
              style={styles.input}
              placeholder="Email"
            placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null); // Clear error when user types
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
            placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError(null); // Clear error when user types
              }}
              secureTextEntry
              autoCapitalize="none"
            />

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={isLogin ? handleEmailLogin : handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'Login' : 'Sign Up'}
            </Text>
            )}
          </TouchableOpacity>

            <TouchableOpacity 
            style={styles.googleButton}
            onPress={() => {
              Alert.alert('Info', 'Google login coming soon');
            }}
          >
            <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.background,
  },
  brandText: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: colors.accent,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  googleButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger + '15',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.danger + '30',
    gap: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});

