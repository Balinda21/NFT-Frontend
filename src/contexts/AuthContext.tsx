import React, { createContext, useState, useEffect, useContext, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatService } from '../services/chatService';

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  imageUrl: string | null;
  isVerified: boolean;
  accountBalance?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (token: string, user: User, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserBalance: (balance: number) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Add a safety timeout to ensure loading always stops
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    loadStoredAuth()
      .then(() => {
        clearTimeout(safetyTimeout);
      })
      .catch(() => {
        clearTimeout(safetyTimeout);
        setIsLoading(false);
      });
  }, []);

  const loadStoredAuth = async () => {
    try {
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
      let storedRefreshToken: string | null = null;

      try {
        const results = await withTimeout(
          Promise.all([
            AsyncStorage.getItem('auth_token'),
            AsyncStorage.getItem('auth_user'),
            AsyncStorage.getItem('auth_refresh_token')
          ]),
          2000 // 2 second timeout
        );
        storedToken = results[0];
        storedUser = results[1];
        storedRefreshToken = results[2];
      } catch (storageError: any) {
        // Continue with null values - app should work without stored auth
      }

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          if (storedRefreshToken) {
            setRefreshToken(storedRefreshToken);
          }
        } catch (parseError) {
          console.error('Error parsing stored user:', parseError);
          // Clear invalid data (don't await to avoid blocking)
          AsyncStorage.removeItem('auth_token').catch(() => {});
          AsyncStorage.removeItem('auth_user').catch(() => {});
          AsyncStorage.removeItem('auth_refresh_token').catch(() => {});
        }
      }
    } catch (error) {
      console.error('Unexpected error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (newToken: string, newUser: User, newRefreshToken?: string) => {
    try {
      // Persist to storage
      await AsyncStorage.setItem('auth_token', newToken);
      await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));
      if (newRefreshToken) {
        await AsyncStorage.setItem('auth_refresh_token', newRefreshToken);
      }

      // Update state
      setToken(newToken);
      setUser(newUser);
      if (newRefreshToken) {
        setRefreshToken(newRefreshToken);
      }
    } catch (error) {
      console.error('Error in login:', error);
      // Revert state on error
      setToken(null);
      setUser(null);
      setRefreshToken(null);
      throw error;
    }
  };

  const updateUserBalance = (balance: number) => {
    if (user) {
      const updatedUser = { ...user, accountBalance: balance };
      setUser(updatedUser);
      AsyncStorage.setItem('auth_user', JSON.stringify(updatedUser)).catch(() => {});
    }
  };

  const logout = async () => {
    try {
      // Clear storage
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user');
      await AsyncStorage.removeItem('auth_refresh_token');

      // Clear state - socket will be disconnected by the useEffect
      setToken(null);
      setUser(null);
      setRefreshToken(null);
    } catch (error) {
      console.error('Error logging out:', error);
      // Still clear state even if storage fails
      setToken(null);
      setUser(null);
      setRefreshToken(null);
    }
  };

  // Compute isAuthenticated using useMemo to ensure it updates when token or user changes
  const isAuthenticated = useMemo(() => {
    return !!token && !!user;
  }, [token, user]);

  // Connect socket when authenticated (with delay for Render cold starts)
  const socketConnectedRef = useRef(false);
  useEffect(() => {
    if (isAuthenticated && token && !socketConnectedRef.current) {
      console.log('[AuthContext] Will connect socket for real-time updates...');
      // Delay socket connection to allow Render server to wake up
      const connectTimeout = setTimeout(() => {
        try {
          console.log('[AuthContext] Connecting socket now...');
          chatService.connect(token);
          socketConnectedRef.current = true;
        } catch (error) {
          console.warn('[AuthContext] Socket connection failed, will retry:', error);
        }
      }, 1000);
      return () => clearTimeout(connectTimeout);
    } else if (!isAuthenticated && socketConnectedRef.current) {
      console.log('[AuthContext] Disconnecting socket...');
      chatService.disconnect();
      socketConnectedRef.current = false;
    }
  }, [isAuthenticated, token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        isLoading,
        login,
        logout,
        updateUserBalance,
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
