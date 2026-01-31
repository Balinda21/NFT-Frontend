import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';

const SplashScreen: React.FC = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // Navigate to login after a short delay
    const timer = setTimeout(() => {
      navigation.navigate('Login' as never);
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.logo}>D3</Text>
        <Text style={styles.title}>NFT Marketplace</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

export default SplashScreen;





