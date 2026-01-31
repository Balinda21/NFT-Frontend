import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { api } from '../services/apiClient';
import { API_ENDPOINTS } from '../config/api';

type TermOption = {
  days: string;
  ror: string;
};

const TERM_OPTIONS: TermOption[] = [
  { days: '1 Days', ror: '0.65-0.80%' },
  { days: '5 Days', ror: '0.80-1.00%' },
  { days: '30 Days', ror: '1.00-1.50%' },
  { days: '90 Days', ror: '1.50-2.00%' },
  { days: '120 Days', ror: '2.00-3.50%' },
];

const AIQuantificationScreen: React.FC = () => {
  const [selectedTerm, setSelectedTerm] = useState<TermOption>(TERM_OPTIONS[0]);
  const [amount, setAmount] = useState('0');
  const [showTermDropdown, setShowTermDropdown] = useState(false);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await api.get(API_ENDPOINTS.AUTH.ME);
        // Backend returns { data: { user: { accountBalance, ... } } }
        if (response.success && response.data?.user?.accountBalance !== undefined) {
          setBalance(parseFloat(response.data.user.accountBalance) || 0);
        }
      } catch (error) {
        // Silently fail
      }
    };
    fetchBalance();
  }, []);

  const handleMaxAmount = () => {
    const maxAllowed = Math.min(balance, 18000);
    setAmount(maxAllowed.toFixed(2));
  };

  const handleConfirm = async () => {
    const amountNum = parseFloat(amount);
    if (amountNum < 1000) {
      Alert.alert('Error', 'Minimum amount is $1000');
      return;
    }
    if (amountNum > 18000) {
      Alert.alert('Error', 'Maximum amount is $18000');
      return;
    }
    if (amountNum > balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(API_ENDPOINTS.ORDERS.AI_QUANTIFICATION, {
        amount: amountNum,
        termDays: parseInt(selectedTerm.days),
        ror: selectedTerm.ror,
      });

      if (response.success) {
        Alert.alert('Success', 'AI Quantification order created successfully!');
        setAmount('0');
        // Refresh balance
        const balanceResponse = await api.get(API_ENDPOINTS.AUTH.ME);
        if (balanceResponse.success && balanceResponse.data?.accountBalance !== undefined) {
          setBalance(parseFloat(balanceResponse.data.accountBalance) || 0);
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to create order');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>AI Quantitative Trading</Text>

        {/* AI Quantification Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountHeaderRow}>
            <View style={styles.amountTitleRow}>
              <View style={styles.amountIcon}>
                <View style={styles.amountIconLine} />
              </View>
              <Text style={styles.amountTitle}>AI Quantification Amount</Text>
            </View>
          </View>

          <View style={styles.amountMainRow}>
            <Text style={styles.amountValue}>${balance.toFixed(4)}</Text>
            <Text style={styles.amountChange}>0.00%</Text>
          </View>

          <View style={styles.amountDivider} />

          <View style={styles.amountFooterRow}>
            <View style={styles.amountFooterItem}>
              <Text style={styles.amountFooterLabel}>Today's Earnings</Text>
              <Text style={styles.amountFooterValue}>$0.0000</Text>
            </View>
            <View style={styles.amountFooterItem}>
              <Text style={styles.amountFooterLabel}>Total revenue</Text>
              <Text style={styles.amountFooterValue}>$0.0000</Text>
            </View>
          </View>
        </View>

        {/* Feature Cards */}
        <View style={styles.featureRow}>
          <View style={styles.featureCard}>
            <Ionicons name="shield-checkmark" size={32} color={colors.accent} />
            <Text style={styles.featureText}>Financial security</Text>
          </View>
          <View style={styles.featureCard}>
            <Ionicons name="cash" size={32} color={colors.accent} />
            <Text style={styles.featureText}>Stable income</Text>
          </View>
          <View style={styles.featureCard}>
            <Ionicons name="code-working" size={32} color={colors.accent} />
            <Text style={styles.featureText}>Easy to use</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionRow}>
          <Text style={styles.descriptionText}>
            Automated trading is a method of automatically executing trading strategi
          </Text>
          <Text style={styles.exploreLink}>Explore more</Text>
        </View>

        {/* Create Section */}
        <View style={styles.createCard}>
          <Text style={styles.createTitle}>Create</Text>

          {/* Term Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>The term</Text>
            <TouchableOpacity
              style={[
                styles.termInput,
                showTermDropdown && styles.termInputActive,
              ]}
              onPress={() => setShowTermDropdown(true)}
            >
              <Text style={styles.termInputText}>{selectedTerm.days}</Text>
              <Ionicons
                name={showTermDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Amount</Text>
            <View style={styles.amountInputRow}>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.maxButton} onPress={handleMaxAmount}>
                <Text style={styles.maxButtonText}>MAX</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ROR and Limited Info */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>ROR</Text>
              <Text style={styles.infoValue}>{selectedTerm.ror}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Limited</Text>
              <Text style={styles.infoValue}>1000-18000</Text>
            </View>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={loading}
          >
            <Text style={styles.confirmButtonText}>{loading ? 'Processing...' : 'Confirm'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Term Dropdown Modal */}
      <Modal
        visible={showTermDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTermDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTermDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            {TERM_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dropdownItem,
                  selectedTerm.days === option.days && styles.dropdownItemSelected,
                ]}
                onPress={() => {
                  setSelectedTerm(option);
                  setShowTermDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{option.days}</Text>
                <Text style={styles.dropdownItemRor}>{option.ror}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  amountCard: {
    borderRadius: 20,
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 24,
  },
  amountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountIcon: {
    width: 22,
    height: 16,
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: '#202020',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  amountIconLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.textPrimary,
    width: '60%',
  },
  amountTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  amountMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  amountValue: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
  },
  amountChange: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  amountDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  amountFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountFooterItem: {
    flex: 1,
  },
  amountFooterLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  amountFooterValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  featureCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  featureText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  descriptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 32,
  },
  descriptionText: {
    color: colors.textMuted,
    fontSize: 14,
    flex: 1,
  },
  exploreLink: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  createCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginTop: 24,
  },
  createTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 8,
  },
  termInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  termInputActive: {
    borderColor: colors.accent,
  },
  termInputText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  maxButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  maxButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 280,
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: '#1a1a1a',
  },
  dropdownItemText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownItemRor: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AIQuantificationScreen;
