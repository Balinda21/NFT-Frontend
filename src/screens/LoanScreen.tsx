import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

type LoanTermOption = {
  days: string;
  range: string;
};

const LOAN_TERM_OPTIONS: LoanTermOption[] = [
  { days: '15 Days', range: '50000-1000000' },
  { days: '30 Days', range: '50000-1000000' },
  { days: '45 Days', range: '50000-1000000' },
  { days: '60 Days', range: '50000-1000000' },
  { days: '90 Days', range: '50000-1000000' },
];

const LoanScreen: React.FC = () => {
  const [amount, setAmount] = useState('0');
  const [selectedTerm, setSelectedTerm] = useState<LoanTermOption>(LOAN_TERM_OPTIONS[0]);
  const [showTermDropdown, setShowTermDropdown] = useState(false);
  const dailyInterestRate = 0.359;
  const totalInterest = parseFloat(amount) * (dailyInterestRate / 100) * parseInt(selectedTerm.days);

  const handleMaxAmount = () => {
    setAmount('1000000');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>DB</Text>
            </View>
            <Text style={styles.brandText}>Business</Text>
          </View>
          <View style={styles.accountChip}>
            <Text style={styles.accountText}>14e4af59</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textPrimary} />
          </View>
        </View>

        {/* Available Amount Card */}
        <View style={styles.availableCard}>
          <View style={styles.availableHeaderRow}>
            <View style={styles.availableTitleRow}>
              <Ionicons name="card-outline" size={18} color={colors.textPrimary} style={styles.availableIcon} />
              <Text style={styles.availableTitle}>Available amount</Text>
            </View>
            <View style={styles.availableStripe} />
          </View>

          <View style={styles.availableMainRow}>
            <Text style={styles.availableAmount}>$10,000.0000</Text>
            <Text style={styles.availableChange}>0.00%</Text>
          </View>

          <View style={styles.availableDivider} />

          <View style={styles.availableFooterRow}>
            <View style={styles.availableFooterItem}>
              <Text style={styles.availableFooterLabel}>Today's Earnings</Text>
              <Text style={styles.availableFooterValue}>$0.0000</Text>
            </View>
            <View style={styles.availableFooterItem}>
              <Text style={styles.availableFooterLabel}>AI Quantification</Text>
              <Text style={styles.availableFooterValue}>$ 0.0000</Text>
            </View>
            <View style={styles.availableFooterItem}>
              <Text style={styles.availableFooterLabel}>ROR</Text>
              <Text style={styles.availableFooterValue}>0.00%</Text>
            </View>
          </View>
        </View>

        {/* Amount Input Section */}
        <View style={styles.inputSection}>
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

        {/* Loan Term Section */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Loan term (Days)</Text>
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

        {/* Interest Rate Card */}
        <View style={styles.interestCard}>
          <View style={styles.interestRow}>
            <View style={styles.interestItem}>
              <Text style={styles.interestLabel}>Daily interest rate</Text>
              <Text style={styles.interestValue}>{dailyInterestRate}%</Text>
            </View>
            <View style={styles.interestItem}>
              <Text style={styles.interestLabel}>Total interest amount</Text>
              <Text style={styles.interestValue}>
                ${totalInterest.toFixed(2)}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.borrowButton}>
            <Text style={styles.borrowButtonText}>Borrow now</Text>
          </TouchableOpacity>
        </View>

        {/* Loan Record Section */}
        <View style={styles.recordSection}>
          <Text style={styles.recordTitle}>Loan record</Text>
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-text-outline" size={40} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>No loan yet</Text>
            <Text style={styles.emptySubtitle}>
              Could not find your loan information
            </Text>
          </View>
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
            {LOAN_TERM_OPTIONS.map((option, index) => (
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
                <Text style={styles.dropdownItemRange}>{option.range}</Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  brandText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  accountChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1C1C1C',
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountText: {
    color: colors.textPrimary,
    fontSize: 14,
    marginRight: 8,
  },
  availableCard: {
    marginTop: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 20,
  },
  availableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  availableTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availableIcon: {
    marginRight: 8,
  },
  availableStripe: {
    width: 2,
    height: 20,
    backgroundColor: colors.border,
    borderRadius: 1,
  },
  availableTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  availableMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  availableAmount: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
  },
  availableChange: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  availableDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  availableFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  availableFooterItem: {
    flex: 1,
  },
  availableFooterLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  availableFooterValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 8,
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
  interestCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 24,
  },
  interestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  interestItem: {
    flex: 1,
  },
  interestLabel: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 8,
  },
  interestValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  borrowButton: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  borrowButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
  recordSection: {
    marginTop: 8,
  },
  recordTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 14,
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
  dropdownItemRange: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LoanScreen;
