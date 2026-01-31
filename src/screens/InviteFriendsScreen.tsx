import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const InviteFriendsScreen: React.FC = () => {
  const navigation = useNavigation();
  const referralLink = 'https://df-business.life#/...';

  const handleCopy = () => {
    // In a real app, you would use Clipboard API here
    // For now, we'll just show an alert
    Alert.alert('Copied!', 'Referral link copied to clipboard');
  };

  const socialIcons = [
    { id: 'line', name: 'LINE', color: '#00C300', icon: 'chatbubbles' },
    { id: 'whatsapp', name: 'WhatsApp', color: '#25D366', icon: 'logo-whatsapp' },
    { id: 'telegram', name: 'Telegram', color: '#0088cc', icon: 'paper-plane' },
    { id: 'facebook', name: 'Facebook', color: '#1877F2', icon: 'logo-facebook' },
    { id: 'twitter', name: 'X', color: '#000000', icon: 'logo-twitter' },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite friends</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Commission Card */}
        <View style={styles.commissionCard}>
          <Text style={styles.commissionLabel}>Total commission</Text>
          <View style={styles.commissionAmountRow}>
            <Text style={styles.commissionAmount}>0.0</Text>
            <Text style={styles.commissionCurrency}>USD</Text>
          </View>
          <Text style={styles.commissionDescription}>
            Share this link with your friends and join successfully to get cryptocurrency rewards
          </Text>
        </View>

        {/* Referral Link Section */}
        <View style={styles.referralSection}>
          <Text style={styles.referralLabel}>Referral Link</Text>
          <View style={styles.referralLinkRow}>
            <Text style={styles.referralLink} numberOfLines={1}>
              {referralLink}
            </Text>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
              <Text style={styles.copyButtonText}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Share Options */}
        <View style={styles.shareSection}>
          <Text style={styles.shareEmoji}>🎉</Text>
          <Text style={styles.shareText}>
            Share it with your friends through social software
          </Text>
          <View style={styles.socialIconsRow}>
            {socialIcons.map((social) => (
              <TouchableOpacity
                key={social.id}
                style={[styles.socialIcon, { backgroundColor: social.color }]}
              >
                {social.id === 'line' ? (
                  <Text style={styles.socialIconText}>LINE</Text>
                ) : social.id === 'twitter' ? (
                  <Text style={styles.socialIconTextX}>X</Text>
                ) : (
                  <Ionicons
                    name={social.icon as any}
                    size={24}
                    color="#FFFFFF"
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 24,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  commissionCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 24,
  },
  commissionLabel: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 12,
  },
  commissionAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  commissionAmount: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '700',
  },
  commissionCurrency: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 8,
  },
  commissionDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  referralSection: {
    marginBottom: 24,
  },
  referralLabel: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 12,
  },
  referralLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  referralLink: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    marginRight: 12,
  },
  copyButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  copyButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  shareSection: {
    alignItems: 'center',
  },
  shareEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  shareText: {
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 20,
    textAlign: 'center',
  },
  socialIconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIconText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  socialIconTextX: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});

export default InviteFriendsScreen;
