import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import Slider from '@react-native-community/slider';
import { api } from '../services/apiClient';
import { API_ENDPOINTS } from '../config/api';

type RouteParams = {
  symbol: string;
  price: number;
  change24h: number;
};

const ContractTradingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { symbol, price, change24h } = (route.params as RouteParams) || {
    symbol: '',
    price: 0,
    change24h: 0,
  };

  const [leverage, setLeverage] = useState(500);
  const [limitOrder, setLimitOrder] = useState(false);
  const [buyPrice, setBuyPrice] = useState(price.toFixed(2));
  const [buyVolume, setBuyVolume] = useState('0');
  const [setProfitStopLoss, setSetProfitStopLoss] = useState(false);
  const [activeTab, setActiveTab] = useState<'Option' | 'Contract'>('Contract');

  const calculateRequiredMargin = () => {
    const volume = parseFloat(buyVolume) || 0;
    const priceNum = parseFloat(buyPrice) || 0;
    return (volume * priceNum) / leverage;
  };

  const calculateCommissionFee = () => {
    const volume = parseFloat(buyVolume) || 0;
    const priceNum = parseFloat(buyPrice) || 0;
    // 0.1% commission
    return (volume * priceNum) * 0.001;
  };

  const handleVolumeChange = (delta: number) => {
    const current = parseFloat(buyVolume) || 0;
    const newValue = Math.max(0, current + delta);
    setBuyVolume(newValue.toString());
  };

  const handleConfirm = async () => {
    const volume = parseFloat(buyVolume);
    if (volume <= 0) {
      Alert.alert('Error', 'Please enter a valid volume');
      return;
    }

    try {
      const response = await api.post(API_ENDPOINTS.ORDERS.CONTRACT, {
        symbol,
        volume,
        leverage,
        buyPrice: parseFloat(buyPrice),
        isLimitOrder: limitOrder,
        hasProfitStopLoss: setProfitStopLoss,
      });

      if (response.success) {
        Alert.alert('Success', 'Contract order placed successfully!');
        navigation.goBack();
      } else {
        Alert.alert('Error', response.message || 'Failed to place order');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to place order');
    }
  };

  const requiredMargin = calculateRequiredMargin();
  const commissionFee = calculateCommissionFee();

  return (
    <View style={styles.root}>
      <View style={styles.modal}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'Option' && styles.tabActive]}
              onPress={() => {
                navigation.navigate('OptionTrading' as never, {
                  symbol,
                  price,
                  change24h,
                } as never);
              }}
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
              onPress={() => setActiveTab('Contract')}
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

        {/* Leverage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leverage: {leverage.toFixed(2)}X</Text>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={500}
              step={1}
              value={leverage}
              onValueChange={setLeverage}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor="#333"
              thumbTintColor={colors.accent}
            />
            <View style={styles.leverageMarkers}>
              <View style={[styles.marker, leverage >= 1 && styles.markerActive]} />
              <View style={[styles.marker, leverage >= 125 && styles.markerActive]} />
              <View style={[styles.marker, leverage >= 250 && styles.markerActive]} />
              <View style={[styles.marker, leverage >= 375 && styles.markerActive]} />
              <View style={[styles.marker, leverage >= 500 && styles.markerActive]} />
            </View>
          </View>
          <View style={styles.leverageLabels}>
            <Text style={styles.leverageLabel}>1X</Text>
            <Text style={styles.leverageLabel}>125X</Text>
            <Text style={styles.leverageLabel}>250X</Text>
            <Text style={styles.leverageLabel}>375X</Text>
            <Text style={styles.leverageLabel}>500X</Text>
          </View>
        </View>

        {/* Limit Order Toggle */}
        <View style={styles.toggleSection}>
          <Text style={styles.toggleLabel}>Limit Order</Text>
          <Switch
            value={limitOrder}
            onValueChange={setLimitOrder}
            trackColor={{ false: '#333', true: colors.accent }}
            thumbColor="#fff"
          />
        </View>

        {/* Buy Price Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Buy Price</Text>
          <View style={styles.priceInputContainer}>
            <TextInput
              style={styles.priceInput}
              value={buyPrice}
              onChangeText={setBuyPrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#666"
            />
            <View style={styles.symbolBadge}>
              <Text style={styles.symbolText}>{symbol}</Text>
            </View>
          </View>
        </View>

        {/* Buy Volume Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Buy Volume</Text>
          <View style={styles.volumeInputContainer}>
            <TextInput
              style={styles.volumeInput}
              value={buyVolume}
              onChangeText={setBuyVolume}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#666"
            />
            <View style={styles.volumeButtons}>
              <TouchableOpacity
                style={styles.volumeButton}
                onPress={() => handleVolumeChange(-10)}
              >
                <Text style={styles.volumeButtonText}>-10</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.volumeButton}
                onPress={() => handleVolumeChange(10)}
              >
                <Text style={styles.volumeButtonText}>+10</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Financial Details */}
        <View style={styles.financialDetails}>
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Required Margin:</Text>
            <Text style={styles.financialValue}>
              ${requiredMargin.toFixed(2)}
            </Text>
          </View>
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Commission Fee:</Text>
            <Text style={styles.financialValue}>
              ${commissionFee.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Set Profit and Stop Loss Toggle */}
        <View style={styles.toggleSection}>
          <Text style={styles.toggleLabel}>Set Profit and Stop Loss</Text>
          <Switch
            value={setProfitStopLoss}
            onValueChange={setSetProfitStopLoss}
            trackColor={{ false: '#333', true: colors.accent }}
            thumbColor="#fff"
          />
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
    marginBottom: 24,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sliderContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  leverageMarkers: {
    position: 'absolute',
    top: 18,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    pointerEvents: 'none',
  },
  marker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  markerActive: {
    backgroundColor: colors.accent,
  },
  leverageLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  leverageLabel: {
    color: '#888',
    fontSize: 12,
  },
  toggleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  toggleLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    color: colors.textPrimary,
    fontSize: 16,
  },
  symbolBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 8,
  },
  symbolText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  volumeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  volumeInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    color: colors.textPrimary,
    fontSize: 16,
  },
  volumeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  volumeButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 8,
  },
  volumeButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  financialDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingVertical: 12,
  },
  financialRow: {
    flex: 1,
  },
  financialLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  financialValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default ContractTradingScreen;