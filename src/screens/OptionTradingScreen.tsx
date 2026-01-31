import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { api } from '../services/apiClient';
import { API_ENDPOINTS } from '../config/api';

type OptionPeriod = {
  seconds: number;
  label: string;
  ror: number;
};

const OPTION_PERIODS: OptionPeriod[] = [
  { seconds: 60, label: '60 s', ror: 20.0 },
  { seconds: 120, label: '120 s', ror: 30.0 },
  { seconds: 180, label: '180 s', ror: 40.0 },
  { seconds: 360, label: '360 s', ror: 50.0 },
  { seconds: 7200, label: '7200 s', ror: 60.0 },
  { seconds: 21600, label: '21600 s', ror: 80.0 },
];

type RouteParams = {
  symbol: string;
  price: number;
  change24h: number;
};

const OptionTradingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { symbol, price, change24h } = (route.params as RouteParams) || {
    symbol: '',
    price: 0,
    change24h: 0,
  };

  const [selectedPeriod, setSelectedPeriod] = useState<OptionPeriod>(OPTION_PERIODS[0]);
  const [amount, setAmount] = useState('0');
  const [balance, setBalance] = useState(0.0);
  const [activeTab, setActiveTab] = useState<'Option' | 'Contract'>('Option');

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

  const handleMax = () => {
    setAmount(balance.toFixed(2));
  };

  const calculateExpected = () => {
    const amountNum = parseFloat(amount) || 0;
    const profit = (amountNum * selectedPeriod.ror) / 100;
    return profit;
  };

  const calculateFee = () => {
    const amountNum = parseFloat(amount) || 0;
    // 0.2% fee
    return amountNum * 0.002;
  };

  const handleConfirm = async () => {
    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (amountNum > balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      const response = await api.post(API_ENDPOINTS.ORDERS.OPTION, {
        symbol,
        amount: amountNum,
        duration: selectedPeriod.seconds,
        ror: selectedPeriod.ror,
        entryPrice: price,
      });

      if (response.success) {
        Alert.alert('Success', 'Option order placed successfully!');
        navigation.goBack();
      } else {
        Alert.alert('Error', response.message || 'Failed to place order');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to place order');
    }
  };

  const expectedProfit = calculateExpected();
  const fee = calculateFee();
  const isNegative = change24h < 0;

  return (
    <View style={styles.root}>
      <View style={styles.modal}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'Option' && styles.tabActive]}
              onPress={() => setActiveTab('Option')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'Option' && styles.tabTextActive,
                ]}
              >
                Option
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'Contract' && styles.tabActive]}
              onPress={() => {
                navigation.navigate('ContractTrading' as never, {
                  symbol,
                  price,
                  change24h,
                } as never);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'Contract' && styles.tabTextActive,
                ]}
              >
                Contract
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Trading Pair Info */}
        <View style={styles.pairSection}>
          <View style={styles.pairLeft}>
            <View style={styles.pairBar} />
            <Text style={styles.pairSymbol}>{symbol}</Text>
          </View>
          <View style={styles.pairRight}>
            <Text style={styles.pairPrice}>{price.toFixed(2)}</Text>
            <View style={styles.pairChangeContainer}>
              <View style={styles.pairChangeIcon}>
                <Text style={styles.pairChangeIconText}>
                  {isNegative ? '↓' : '↑'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ROR Options Grid */}
        <View style={styles.rorSection}>
          <View style={styles.rorGrid}>
            {OPTION_PERIODS.map((period) => (
              <TouchableOpacity
                key={period.seconds}
                style={[
                  styles.rorButton,
                  selectedPeriod.seconds === period.seconds &&
                    styles.rorButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text
                  style={[
                    styles.rorLabel,
                    selectedPeriod.seconds === period.seconds &&
                      styles.rorLabelActive,
                  ]}
                >
                  {period.label}
                </Text>
                <Text
                  style={[
                    styles.rorValue,
                    selectedPeriod.seconds === period.seconds &&
                      styles.rorValueActive,
                  ]}
                >
                  ROR:{period.ror.toFixed(2)}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.amountSection}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountInputContainer}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#666"
            />
            <TouchableOpacity style={styles.maxButton} onPress={handleMax}>
              <Text style={styles.maxButtonText}>MAX</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Balance:</Text>
            <Text style={styles.summaryValue}>{balance.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Expected:</Text>
            <Text style={[styles.summaryValue, styles.summaryExpected]}>
              +${expectedProfit.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Fee(Usd):</Text>
            <Text style={styles.summaryValue}>${fee.toFixed(3)}</Text>
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#2a2a2a',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '300',
  },
  pairSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 12,
  },
  pairLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pairBar: {
    width: 3,
    height: 18,
    backgroundColor: colors.accent,
    borderRadius: 1.5,
  },
  pairSymbol: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  pairRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pairPrice: {
    color: '#ff8800',
    fontSize: 18,
    fontWeight: '700',
  },
  pairChangeContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pairChangeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pairChangeIconText: {
    color: '#888',
    fontSize: 10,
    fontWeight: '600',
  },
  rorSection: {
    marginBottom: 24,
  },
  rorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  rorButton: {
    width: '30%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rorButtonActive: {
    borderColor: colors.accent,
    backgroundColor: '#1a1a1a',
  },
  rorLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  rorLabelActive: {
    color: colors.accent,
  },
  rorValue: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  rorValueActive: {
    color: colors.accent,
  },
  amountSection: {
    marginBottom: 20,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amountInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  maxButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 8,
  },
  maxButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  summarySection: {
    marginBottom: 24,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#888',
    fontSize: 14,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryExpected: {
    color: colors.accent,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default OptionTradingScreen;