import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  imageUrl: string | null;
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load stored auth data on app start
    console.log('AuthProvider mounted, starting loadStoredAuth');
    
    // Add a safety timeout to ensure loading always stops
    const safetyTimeout = setTimeout(() => {
      console.warn('Safety timeout: Force setting isLoading to false');
      setIsLoading(false);
    }, 5000);
    
    loadStoredAuth()
      .then(() => {
        clearTimeout(safetyTimeout);
      })
      .catch(error => {
        console.error('Failed to load stored auth:', error);
        clearTimeout(safetyTimeout);
        setIsLoading(false); // Ensure loading stops even on error
      });
  }, []);

  const loadStoredAuth = async () => {
    try {
      console.log('Loading stored auth...');
      
      // Helper function to add timeout to any promise
      const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
          )
        ]);
      };
      
      // Load auth data with timeout protection
      let storedToken: string | null = null;
      let storedUser: string | null = null;
      
      try {
        const results = await withTimeout(
          Promise.all([
            AsyncStorage.getItem('auth_token'),
            AsyncStorage.getItem('auth_user')
          ]),
          2000 // 2 second timeout
        );
        storedToken = results[0];
        storedUser = results[1];
      } catch (storageError: any) {
        console.warn('AsyncStorage read failed or timed out:', storageError?.message);
        // Continue with null values - app should work without stored auth
      }

      console.log('Stored auth loaded:', { hasToken: !!storedToken, hasUser: !!storedUser });

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          console.log('Auth restored from storage');
        } catch (parseError) {
          console.error('Error parsing stored user:', parseError);
          // Clear invalid data (don't await to avoid blocking)
          AsyncStorage.removeItem('auth_token').catch(() => {});
          AsyncStorage.removeItem('auth_user').catch(() => {});
        }
      } else {
        console.log('No stored auth found');
      }
    } catch (error) {
      console.error('Unexpected error loading stored auth:', error);
    } finally {
      console.log('Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const login = async (newToken: string, newUser: User) => {
    try {
      console.log('AuthContext.login called', { token: newToken?.substring(0, 20), user: newUser?.email });
      
      // First, persist to storage
      await AsyncStorage.setItem('auth_token', newToken);
      await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));
      console.log('Storage updated');
      
      // Update state synchronously - React will batch these and trigger re-render
      // Update both states together to ensure isAuthenticated updates correctly
      setToken(newToken);
      setUser(newUser);
      
      console.log('State updated:', { 
        hasToken: !!newToken, 
        hasUser: !!newUser,
        userEmail: newUser?.email 
      });
      
      // Force a state update by setting a flag that will trigger re-render
      // This ensures the context value updates immediately
    } catch (error) {
      console.error('Error in login:', error);
      // Revert state on error
      setToken(null);
      setUser(null);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Compute isAuthenticated using useMemo to ensure it updates when token or user changes
  const isAuthenticated = useMemo(() => {
    const authenticated = !!token && !!user;
    console.log('isAuthenticated computed:', authenticated, { 
      hasToken: !!token, 
      hasUser: !!user,
      tokenPreview: token?.substring(0, 20),
      userEmail: user?.email 
    });
    return authenticated;
  }, [token, user]);

  // Debug effect to log when auth state changes
  useEffect(() => {
    console.log('Auth state changed:', { 
      isAuthenticated, 
      hasToken: !!token, 
      hasUser: !!user,
      isLoading 
    });
  }, [isAuthenticated, token, user, isLoading]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

