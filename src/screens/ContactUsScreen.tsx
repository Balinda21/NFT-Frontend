import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

const ContactUsScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleBackToChat = () => {
    navigation.navigate('Chat' as never);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#F0F4FF', '#F5E6FF']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {/* Chat Icon */}
          <View style={styles.chatIconContainer}>
            <View style={styles.chatBubble}>
              <View style={styles.chatBubbleInner} />
            </View>
          </View>

          {/* Welcome Text */}
          <Text style={styles.welcomeText}>Welcome!</Text>
          <Text style={styles.subText}>Text us</Text>

          {/* Chat Message Box */}
          <View style={styles.messageBox}>
            <View style={styles.messageHeader}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Text style={styles.logoText}>DB</Text>
                </View>
              </View>
              <View style={styles.messageHeaderText}>
                <Text style={styles.senderName}>Business</Text>
                <Text style={styles.timestamp}>23:39</Text>
              </View>
            </View>
            <Text style={styles.messageText}>Hello. How may I help you?</Text>
          </View>

          {/* Back to Chat Button */}
          <TouchableOpacity style={styles.backToChatButton} onPress={handleBackToChat}>
            <Text style={styles.backToChatText}>Back to chat</Text>
            <Ionicons name="paper-plane" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by</Text>
          <View style={styles.liveChatLogo}>
            <View style={styles.liveChatSquare} />
            <Text style={styles.liveChatText}>LiveChat</Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  chatIconContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  chatBubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBubbleInner: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  subText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 48,
  },
  messageBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoContainer: {
    marginRight: 12,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
  },
  messageHeaderText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  timestamp: {
    fontSize: 14,
    color: '#666666',
  },
  messageText: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 22,
  },
  backToChatButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  backToChatText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIcon: {
    transform: [{ rotate: '45deg' }],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#666666',
    marginRight: 8,
  },
  liveChatLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveChatSquare: {
    width: 16,
    height: 16,
    backgroundColor: '#FF6B35',
    borderRadius: 2,
    marginRight: 6,
  },
  liveChatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
});

export default ContactUsScreen;
