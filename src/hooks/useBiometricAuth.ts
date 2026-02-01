import { useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Keys for secure storage
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_EMAIL_KEY = 'biometric_email';
const BIOMETRIC_TOKEN_KEY = 'biometric_token';

export type BiometricType = 'faceid' | 'touchid' | 'fingerprint' | 'iris' | 'none';

interface UseBiometricAuthReturn {
  // Status
  isAvailable: boolean;
  isEnabled: boolean;
  biometricType: BiometricType;
  isLoading: boolean;
  error: string | null;

  // Actions
  authenticate: () => Promise<boolean>;
  enableBiometric: (email: string, token: string) => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  getStoredCredentials: () => Promise<{ email: string; token: string } | null>;
  clearError: () => void;
}

export function useBiometricAuth(): UseBiometricAuthReturn {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      // Check if hardware supports biometrics
      const compatible = await LocalAuthentication.hasHardwareAsync();

      if (!compatible) {
        setIsAvailable(false);
        setIsLoading(false);
        return;
      }

      // Check if biometrics are enrolled
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsAvailable(enrolled);

      // Get supported authentication types
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType(Platform.OS === 'ios' ? 'faceid' : 'fingerprint');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType(Platform.OS === 'ios' ? 'touchid' : 'fingerprint');
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        setBiometricType('iris');
      }

      // Check if biometric login is enabled for this app
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(enabled === 'true');

    } catch (err) {
      console.error('Error checking biometric availability:', err);
      setIsAvailable(false);
    } finally {
      setIsLoading(false);
    }
  };

  const authenticate = useCallback(async (): Promise<boolean> => {
    setError(null);

    if (!isAvailable) {
      setError('Biometric authentication is not available');
      return false;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login with biometrics',
        fallbackLabel: 'Use password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return true;
      } else {
        if (result.error === 'user_cancel') {
          // User cancelled, not an error
          return false;
        }
        setError(result.error || 'Authentication failed');
        return false;
      }
    } catch (err: any) {
      console.error('Biometric authentication error:', err);
      setError(err.message || 'Authentication failed');
      return false;
    }
  }, [isAvailable]);

  const enableBiometric = useCallback(async (email: string, token: string): Promise<boolean> => {
    setError(null);

    if (!isAvailable) {
      setError('Biometric authentication is not available on this device');
      return false;
    }

    try {
      // First authenticate to confirm user identity
      const authenticated = await authenticate();

      if (!authenticated) {
        return false;
      }

      // Store credentials securely
      await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
      await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token);
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');

      setIsEnabled(true);
      return true;
    } catch (err: any) {
      console.error('Error enabling biometric:', err);
      setError(err.message || 'Failed to enable biometric login');
      return false;
    }
  }, [isAvailable, authenticate]);

  const disableBiometric = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(false);
    } catch (err: any) {
      console.error('Error disabling biometric:', err);
      setError(err.message || 'Failed to disable biometric login');
    }
  }, []);

  const getStoredCredentials = useCallback(async (): Promise<{ email: string; token: string } | null> => {
    try {
      const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
      const token = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);

      if (email && token) {
        return { email, token };
      }
      return null;
    } catch (err) {
      console.error('Error getting stored credentials:', err);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isAvailable,
    isEnabled,
    biometricType,
    isLoading,
    error,
    authenticate,
    enableBiometric,
    disableBiometric,
    getStoredCredentials,
    clearError,
  };
}

// Helper to get display name for biometric type
export function getBiometricDisplayName(type: BiometricType): string {
  switch (type) {
    case 'faceid':
      return 'Face ID';
    case 'touchid':
      return 'Touch ID';
    case 'fingerprint':
      return 'Fingerprint';
    case 'iris':
      return 'Iris Scan';
    default:
      return 'Biometrics';
  }
}

// Helper to get icon name for biometric type
export function getBiometricIcon(type: BiometricType): string {
  switch (type) {
    case 'faceid':
      return 'scan-outline';
    case 'touchid':
    case 'fingerprint':
      return 'finger-print-outline';
    case 'iris':
      return 'eye-outline';
    default:
      return 'lock-closed-outline';
  }
}

export default useBiometricAuth;
