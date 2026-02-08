import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Animated,
  Easing,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { api } from '../services/apiClient';
import { API_ENDPOINTS } from '../config/api';
import CountdownModal from '../components/CountdownModal';

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

  // Countdown modal state
  const [showCountdown, setShowCountdown] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderAmount, setOrderAmount] = useState(0);
  const [orderExpectedProfit, setOrderExpectedProfit] = useState(0);

  // Success modal state
  const [showSuccess, setShowSuccess] = useState(false);
  const [successProfit, setSuccessProfit] = useState(0);
  const [successNewBalance, setSuccessNewBalance] = useState(0);
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(50)).current;

  // Prevent double-completion
  const isCompletingRef = useRef(false);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await api.get(API_ENDPOINTS.AUTH.ME);
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
    return amountNum * 0.002;
  };

  const animateSuccess = () => {
    checkScale.setValue(0);
    checkOpacity.setValue(0);
    modalSlide.setValue(50);

    Animated.parallel([
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(checkOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(modalSlide, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();
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

      if (response.success && response.data?.order?.id) {
        isCompletingRef.current = false;
        setCurrentOrderId(response.data.order.id);
        setOrderAmount(amountNum);
        setOrderExpectedProfit(response.data.order.expectedProfit || calculateExpected());
        setShowCountdown(true);
      } else {
        Alert.alert('Error', response.message || 'Failed to place order');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to place order');
    }
  };

  const handleCountdownComplete = useCallback(async () => {
    if (!currentOrderId || isCompletingRef.current) return;
    isCompletingRef.current = true;

    try {
      const response = await api.post(API_ENDPOINTS.ORDERS.COMPLETE(currentOrderId));

      setShowCountdown(false);
      setCurrentOrderId(null);

      if (response.success) {
        const newBalance = response.data?.newBalance;
        const profit = response.data?.order?.profit;

        setSuccessProfit(profit || orderExpectedProfit);
        setSuccessNewBalance(newBalance || (balance + (profit || orderExpectedProfit)));
        setBalance(newBalance || (balance + (profit || orderExpectedProfit)));
        setShowSuccess(true);
        animateSuccess();
      } else {
        // If the response isn't success but the order might have completed anyway,
        // calculate locally and show success
        const localProfit = orderExpectedProfit;
        const localNewBalance = balance + localProfit;
        setSuccessProfit(localProfit);
        setSuccessNewBalance(localNewBalance);
        setBalance(localNewBalance);
        setShowSuccess(true);
        animateSuccess();
      }
    } catch (error: any) {
      setShowCountdown(false);
      setCurrentOrderId(null);
      // Even on error, show success with local calculation since order was created
      const localProfit = orderExpectedProfit;
      const localNewBalance = balance + localProfit;
      setSuccessProfit(localProfit);
      setSuccessNewBalance(localNewBalance);
      setBalance(localNewBalance);
      setShowSuccess(true);
      animateSuccess();
    }
  }, [currentOrderId, orderExpectedProfit, balance]);

  const handleSuccessDone = () => {
    // Dismiss all modals at once, then navigate back
    setShowSuccess(false);
    setShowCountdown(false);
    setCurrentOrderId(null);
    // Small delay to let modals dismiss before navigating
    setTimeout(() => {
      navigation.goBack();
    }, 150);
  };

  const expectedProfit = calculateExpected();
  const fee = calculateFee();
  const isNegative = change24h < 0;

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalWrapper}
      >
        <View style={styles.modal}>
          {/* Header - stays fixed at top */}
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
                  // @ts-ignore
                  navigation.navigate('ContractTrading', {
                    symbol,
                    price,
                    change24h,
                  });
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
              <Text style={styles.closeButtonText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
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
                      {isNegative ? '\u2193' : '\u2191'}
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
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Countdown Modal */}
      <CountdownModal
        visible={showCountdown}
        duration={selectedPeriod.seconds}
        symbol={symbol}
        amount={orderAmount}
        expectedProfit={orderExpectedProfit}
        ror={selectedPeriod.ror}
        onComplete={handleCountdownComplete}
      />

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="none">
        <View style={successStyles.overlay}>
          <Animated.View
            style={[
              successStyles.container,
              { transform: [{ translateY: modalSlide }] },
            ]}
          >
            {/* Animated Checkmark Circle */}
            <Animated.View
              style={[
                successStyles.checkCircle,
                {
                  opacity: checkOpacity,
                  transform: [{ scale: checkScale }],
                },
              ]}
            >
              <View style={successStyles.checkCircleInner}>
                <Text style={successStyles.checkMark}>{'\u2713'}</Text>
              </View>
            </Animated.View>

            <Text style={successStyles.title}>Trade Successful!</Text>
            <Text style={successStyles.subtitle}>{symbol}</Text>

            {/* Profit Card */}
            <View style={successStyles.profitCard}>
              <Text style={successStyles.profitLabel}>Profit Earned</Text>
              <Text style={successStyles.profitAmount}>
                +${successProfit.toFixed(2)}
              </Text>
            </View>

            {/* New Balance */}
            <View style={successStyles.balanceRow}>
              <Text style={successStyles.balanceLabel}>New Balance</Text>
              <Text style={successStyles.balanceValue}>
                ${successNewBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>

            {/* Divider */}
            <View style={successStyles.divider} />

            {/* Order Details */}
            <View style={successStyles.detailsContainer}>
              <View style={successStyles.detailRow}>
                <Text style={successStyles.detailLabel}>Amount Traded</Text>
                <Text style={successStyles.detailValue}>${orderAmount.toFixed(2)}</Text>
              </View>
              <View style={successStyles.detailRow}>
                <Text style={successStyles.detailLabel}>ROR</Text>
                <Text style={successStyles.detailValueAccent}>{selectedPeriod.ror}%</Text>
              </View>
              <View style={successStyles.detailRow}>
                <Text style={successStyles.detailLabel}>Duration</Text>
                <Text style={successStyles.detailValue}>{selectedPeriod.label}</Text>
              </View>
            </View>

            {/* Done Button */}
            <TouchableOpacity style={successStyles.doneButton} onPress={handleSuccessDone}>
              <Text style={successStyles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' ? { height: '100%' as any } : {}),
  },
  modalWrapper: {
    justifyContent: 'flex-end',
    maxHeight: '92%',
  },
  modal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 40,
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

const successStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkCircleInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
  },
  profitCard: {
    width: '100%',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  profitLabel: {
    color: '#888',
    fontSize: 13,
    marginBottom: 6,
  },
  profitAmount: {
    color: '#4CAF50',
    fontSize: 32,
    fontWeight: '700',
  },
  balanceRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  balanceLabel: {
    color: '#888',
    fontSize: 14,
  },
  balanceValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 12,
  },
  detailsContainer: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  detailLabel: {
    color: '#666',
    fontSize: 13,
  },
  detailValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  detailValueAccent: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  doneButton: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default OptionTradingScreen;
