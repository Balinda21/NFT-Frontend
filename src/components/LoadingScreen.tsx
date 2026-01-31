import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const LoadingScreen: React.FC = () => {
  useEffect(() => {
    console.log('LoadingScreen mounted');
    // Fallback timeout - if loading takes more than 5 seconds, something is wrong
    const timeout = setTimeout(() => {
      console.warn('Loading screen timeout - taking too long');
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>DB</Text>
        <Text style={styles.title}>Business</Text>
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 32,
  },
  loader: {
    marginTop: 24,
  },
});

export default LoadingScreen;
