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
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { API_ENDPOINTS } from '../config/api';
import { api } from '../services/apiClient';
// Google OAuth - uncomment when you have Google OAuth credentials configured
// import * as Google from 'expo-auth-session/providers/google';
// import * as WebBrowser from 'expo-web-browser';
// WebBrowser.maybeCompleteAuthSession();

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Google OAuth - uncomment when you have Google OAuth credentials
  // const [request, response, promptAsync] = Google.useAuthRequest({
  //   iosClientId: 'YOUR_IOS_CLIENT_ID',
  //   androidClientId: 'YOUR_ANDROID_CLIENT_ID',
  //   webClientId: 'YOUR_WEB_CLIENT_ID',
  // });

  // React.useEffect(() => {
  //   if (response?.type === 'success') {
  //     handleGoogleLogin(response.authentication?.idToken || '');
  //   }
  // }, [response]);

  const handleGoogleLogin = async (googleToken: string) => {
    if (!googleToken) return;

    setLoading(true);
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.LOGIN_GOOGLE, {
        token: googleToken,
      }, { skipAuth: true });

      if (response.success) {
        const token = response.data.accessToken;
        const user = response.data.user;
        // Call login and wait for it to complete
        try {
          await onLoginSuccess(token, user);
          // Navigation will happen automatically via AuthContext state update
          // State update triggers AppNavigator to re-render and show main app
        } catch (loginError: any) {
          Alert.alert('Error', loginError.message || 'Failed to save login data');
        }
      } else {
        Alert.alert('Error', response.message || 'Google login failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.LOGIN_PASSWORD, {
        email,
        password,
      }, { skipAuth: true });

      if (response.success) {
        const token = response.data.accessToken;
        const user = response.data.user;
        
        console.log('Login successful, calling onLoginSuccess...', { 
          token: token?.substring(0, 20), 
          user: user?.email,
          userObject: user 
        });
        
        // Ensure user object has all required fields
        if (!token || !user || !user.id) {
          Alert.alert('Error', 'Invalid response from server');
          return;
        }
        
        // Call login and wait for it to complete
        try {
          await onLoginSuccess(token, user);
          console.log('onLoginSuccess completed successfully');
          // Navigation will happen automatically via AuthContext state update
          // State update triggers AppNavigator to re-render and show main app
        } catch (loginError: any) {
          console.error('Error in onLoginSuccess:', loginError);
          Alert.alert('Error', loginError.message || 'Failed to save login data');
        }
      } else {
        Alert.alert('Error', response.message || 'Login failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
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
        Alert.alert('Error', response.message || 'Sign up failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Network error');
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo/Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>DB</Text>
            </View>
            <Text style={styles.title}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? 'Sign up to get started'
                : 'Sign in to continue'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {isSignUp && (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="First Name (Optional)"
                    placeholderTextColor={colors.textSecondary}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Last Name (Optional)"
                    placeholderTextColor={colors.textSecondary}
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                  />
                </View>
              </>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete={isSignUp ? 'password-new' : 'password'}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {!isSignUp && (
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={isSignUp ? handleSignUp : handleEmailLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.buttonText}>
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleButton, loading && styles.buttonDisabled]}
              onPress={() => {
                Alert.alert('Coming Soon', 'Google login will be available soon');
              }}
              disabled={loading}
            >
              <Ionicons name="logo-google" size={20} color="#fff" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              </Text>
              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} disabled={loading}>
                <Text style={styles.switchLink}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: colors.accent,
    fontSize: 14,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2a2a2a',
  },
  dividerText: {
    color: colors.textSecondary,
    marginHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#4285F4',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  switchLink: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
