import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/apiClient';
import { API_ENDPOINTS } from '../config/api';
import { chatService } from '../services/chatService';

interface MenuItem {
  id: string;
  label: string;
}

const AccountScreen: React.FC = () => {
  const navigation = useNavigation();
  const { logout, updateUserBalance } = useAuth();
  const [activeAction, setActiveAction] = useState<'Deposit' | 'Wire Transfer' | 'Withdraw'>('Deposit');
  const [selectedCurrency, setSelectedCurrency] = useState('USDT');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [depositNetwork, setDepositNetwork] = useState<'ERC20' | 'TRC20'>('ERC20');
  const [withdrawNetwork, setWithdrawNetwork] = useState<'ERC20' | 'TRC20'>('TRC20');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [accountBalance, setAccountBalance] = useState(0);

  // Fetch user balance when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const fetchBalance = async () => {
        try {
          const response = await api.get(API_ENDPOINTS.AUTH.ME);
          // Backend returns { data: { user: { accountBalance, ... } } }
          if (response.success && response.data?.user?.accountBalance !== undefined) {
            const balance = parseFloat(response.data.user.accountBalance) || 0;
            setAccountBalance(balance);
            updateUserBalance(balance);
          }
        } catch (error) {
          // Silently fail - balance will show 0
        }
      };
      fetchBalance();
    }, [])
  );

  // Listen for real-time balance updates from admin
  useEffect(() => {
    const unsubscribe = chatService.onBalanceUpdated((data) => {
      const newBalance = parseFloat(data.accountBalance) || 0;
      setAccountBalance(newBalance);
      updateUserBalance(newBalance);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const currencies = ['USDT', 'ETH', 'BTC'];
  const walletAddressExample = '0x84f...5a1c80E1dDbFe9';

  const menuItems: MenuItem[] = [
    { id: '1', label: 'Option Order' },
    { id: '2', label: 'Contract order' },
    { id: '3', label: 'AI Quantification Order' },
    { id: '4', label: 'History Record' },
    { id: '5', label: 'Invite friends' },
    { id: '6', label: 'FAQ' },
    { id: '7', label: 'Chat' },
    { id: '8', label: 'Contact to us' },
    { id: '9', label: 'About Us' },
    { id: '10', label: 'Language' },
    { id: '11', label: 'Logout' },
  ];

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.label === 'Invite friends') {
      navigation.navigate('InviteFriends' as never);
    } else if (item.label === 'About Us') {
      navigation.navigate('AboutUs' as never);
    } else if (item.label === 'FAQ') {
      navigation.navigate('FAQ' as never);
    } else if (item.label === 'Chat') {
      navigation.navigate('Chat' as never);
    } else if (item.label === 'Contact to us') {
      navigation.navigate('ContactUs' as never);
    } else if (item.label === 'Logout') {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              await logout();
            },
          },
        ]
      );
    } else {
      // Handle other menu items as needed
      Alert.alert('Coming Soon', `${item.label} feature will be available soon.`);
    }
  };

  const renderMenuItem = (item: MenuItem) => {
    const isLogout = item.label === 'Logout';
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.menuItem, isLogout && styles.logoutMenuItem]}
        activeOpacity={0.7}
        onPress={() => handleMenuItemPress(item)}
      >
        <View style={styles.menuItemLeft}>
          {!isLogout && <View style={styles.menuItemStripe} />}
          {isLogout && (
            <Ionicons
              name="log-out-outline"
              size={20}
              color={colors.danger}
              style={styles.logoutIcon}
            />
          )}
          <Text style={[styles.menuItemText, isLogout && styles.logoutText]}>
            {item.label}
          </Text>
        </View>
        {!isLogout && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>D3</Text>
            </View>
            <Text style={styles.brandText}>Business</Text>
          </View>
          <View style={styles.accountChip}>
            <Text style={styles.accountText}>14e4af59</Text>
            <Text style={styles.accountCaret}>⌵</Text>
          </View>
        </View>

        {/* Account Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeaderRow}>
            <View style={styles.balanceTitleRow}>
              <Ionicons name="card-outline" size={18} color={colors.textPrimary} style={styles.balanceIcon} />
              <Text style={styles.balanceTitle}>Account Balance</Text>
            </View>
            <View style={styles.balanceStripe} />
          </View>

          <View style={styles.balanceMainRow}>
            <Text style={styles.balanceAmount}>
              ${accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </Text>
            <Text style={styles.balanceChange}>0.00%</Text>
          </View>

          <View style={styles.balanceDivider} />

          <View style={styles.balanceFooterRow}>
            <View style={styles.balanceFooterItem}>
              <Text style={styles.balanceFooterLabel}>Today's Earnings</Text>
              <Text style={styles.balanceFooterValue}>$0.0000</Text>
            </View>
            <View style={styles.balanceFooterItem}>
              <Text style={styles.balanceFooterLabel}>AI Quantification</Text>
              <Text style={styles.balanceFooterValue}>$ 0.0000</Text>
            </View>
            <View style={styles.balanceFooterItem}>
              <Text style={styles.balanceFooterLabel}>ROR</Text>
              <Text style={styles.balanceFooterValue}>0.00%</Text>
            </View>
          </View>
        </View>

        {/* Menu Items Section - Moved up for better visibility */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Menu</Text>
          <View style={styles.menuContainer}>
            {menuItems.map((item) => renderMenuItem(item))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.actionButton, activeAction === 'Deposit' && styles.actionButtonActive]}
            onPress={() => setActiveAction('Deposit')}
          >
            <Text style={[styles.actionButtonText, activeAction === 'Deposit' && styles.actionButtonTextActive]}>
              Deposit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, activeAction === 'Wire Transfer' && styles.actionButtonActive]}
            onPress={() => setActiveAction('Wire Transfer')}
          >
            <Text style={[styles.actionButtonText, activeAction === 'Wire Transfer' && styles.actionButtonTextActive]}>
              Wire Transfer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, activeAction === 'Withdraw' && styles.actionButtonActive]}
            onPress={() => setActiveAction('Withdraw')}
          >
            <Text style={[styles.actionButtonText, activeAction === 'Withdraw' && styles.actionButtonTextActive]}>
              Withdraw
            </Text>
          </TouchableOpacity>
        </View>

        {/* Deposit Section */}
        {activeAction === 'Deposit' && (
          <View style={styles.depositCard}>
            <View style={styles.depositHeader}>
              <View style={styles.depositStripe} />
              <Text style={styles.depositTitle}>Deposit</Text>
            </View>

            <TouchableOpacity
              style={styles.currencyButton}
              onPress={() => setShowCurrencyDropdown(true)}
            >
              <Text style={styles.currencyButtonText}>{selectedCurrency}</Text>
              <Ionicons
                name={showCurrencyDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textPrimary}
              />
            </TouchableOpacity>

            {/* Network Selection */}
            <View style={styles.networkSelection}>
              <TouchableOpacity
                style={styles.networkOption}
                onPress={() => setDepositNetwork('ERC20')}
              >
                <View style={styles.radioButton}>
                  {depositNetwork === 'ERC20' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.networkOptionText}>ERC20</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.networkOption}
                onPress={() => setDepositNetwork('TRC20')}
              >
                <View style={styles.radioButton}>
                  {depositNetwork === 'TRC20' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.networkOptionText}>TRC20</Text>
              </TouchableOpacity>
            </View>

            {/* QR Code */}
            <View style={styles.qrCodeContainer}>
              <Image
                source={{ uri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQoXgnU7FduTcy0Z7GyoXnMnCqLBwMwAXdiFw&s' }}
                style={styles.qrCode}
                resizeMode="contain"
              />
            </View>

            {/* Wallet Address */}
            <View style={styles.walletAddressSection}>
              <Text style={styles.walletAddressLabel}>Wallet Address</Text>
              <View style={styles.walletAddressRow}>
                <Text style={styles.walletAddressText}>{walletAddressExample}</Text>
                <TouchableOpacity style={styles.copyButton}>
                  <Text style={styles.copyButtonText}>Copy</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Upload Proof Button */}
            <TouchableOpacity style={styles.uploadProofButton}>
              <Text style={styles.uploadProofButtonText}>Upload Proof</Text>
            </TouchableOpacity>

            {/* Warning Message */}
            <Text style={styles.warningText}>
              Please do not send other types of assets to the above address. This action may result in the loss of your assets. After the transmission is successful, the network node needs to confirm receipt of the corresponding assets. After the transfer is successful, please contact online customer service for confirmation.
            </Text>
          </View>
        )}

        {/* Wire Transfer Section */}
        {activeAction === 'Wire Transfer' && (
          <View style={styles.wireTransferCard}>
            <View style={styles.wireTransferHeader}>
              <View style={styles.depositStripe} />
              <Text style={styles.depositTitle}>Wire Transfer</Text>
            </View>

            <View style={styles.wireTransferContent}>
              <Text style={styles.wireTransferHeading}>Before Initiating the Wire Transfer:</Text>
              <Text style={styles.wireTransferText}>
                Prior to initiating a wire transfer, please contact our customer service team to obtain the accurate wire transfer account information. This step ensures the security and safe arrival of your funds.
              </Text>

              <Text style={styles.wireTransferHeading}>Processing Time for Wire Transfer:</Text>
              <Text style={styles.wireTransferText}>
                Prior to initiating a wire transfer, please contact our customer service team to obtain the accurate wire transfer account information. This step ensures the security and safe arrival of your funds.
              </Text>

              <Text style={styles.wireTransferHeading}>Assistance During Wire Transfer:</Text>
              <Text style={styles.wireTransferText}>
                Should you encounter any issues or have questions during the wire transfer process, please feel free to reach out to our customer service team. We are committed to providing assistance and support to ensure a smooth transaction experience for you.
              </Text>
            </View>

            <TouchableOpacity style={styles.uploadProofButton}>
              <Text style={styles.uploadProofButtonText}>Upload Proof</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Withdraw Section */}
        {activeAction === 'Withdraw' && (
          <View style={styles.withdrawCard}>
            <View style={styles.depositHeader}>
              <View style={styles.depositStripe} />
              <Text style={styles.depositTitle}>Withdraw</Text>
            </View>

            <TouchableOpacity
              style={styles.currencyButton}
              onPress={() => setShowCurrencyDropdown(true)}
            >
              <Text style={styles.currencyButtonText}>{selectedCurrency}</Text>
              <Ionicons
                name={showCurrencyDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textPrimary}
              />
            </TouchableOpacity>

            {/* Network Selection */}
            <View style={styles.networkSelection}>
              <TouchableOpacity
                style={styles.networkOption}
                onPress={() => setWithdrawNetwork('TRC20')}
              >
                <View style={styles.radioButton}>
                  {withdrawNetwork === 'TRC20' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.networkOptionText}>TRC20</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.networkOption}
                onPress={() => setWithdrawNetwork('ERC20')}
              >
                <View style={styles.radioButton}>
                  {withdrawNetwork === 'ERC20' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.networkOptionText}>ERC20</Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Amount</Text>
              <View style={styles.amountInputRow}>
                <TextInput
                  style={styles.amountInput}
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.maxButton}>
                  <Text style={styles.maxButtonText}>MAX</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Withdrawal Currency Display */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>withdrawal currency</Text>
              <View style={styles.withdrawalCurrencyDisplay}>
                <Text style={styles.withdrawalCurrencyText}>
                  {withdrawAmount || '0'} {selectedCurrency}
                </Text>
              </View>
            </View>

            {/* Wallet Address Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Wallet Address</Text>
              <TextInput
                style={styles.walletAddressInput}
                value={walletAddress}
                onChangeText={setWalletAddress}
                placeholder="Enter wallet address"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Confirm Button */}
            <TouchableOpacity style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>confirm</Text>
            </TouchableOpacity>

            {/* Withdrawal Info */}
            <Text style={styles.withdrawalInfoText}>
              Your withdrawal will be sent to your wallet address within the next 24 hours, please be patient and wait for the review to arrive.
            </Text>
            <Text style={styles.withdrawalFeeText}>
              The currency withdrawal fee is 2%
            </Text>
          </View>
        )}

        {/* Currency Dropdown Modal */}
        <Modal
          visible={showCurrencyDropdown}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCurrencyDropdown(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCurrencyDropdown(false)}
          >
            <View style={styles.dropdownContainer}>
              {currencies.map((currency) => (
                <TouchableOpacity
                  key={currency}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedCurrency(currency);
                    setShowCurrencyDropdown(false);
                  }}
                >
                  <View style={styles.dropdownRadio}>
                    {selectedCurrency === currency && (
                      <View style={styles.dropdownRadioInner} />
                    )}
                  </View>
                  <Text style={styles.dropdownItemText}>{currency}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
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
  accountCaret: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  menuSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  menuSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  menuContainer: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemStripe: {
    width: 3,
    height: 20,
    backgroundColor: colors.accent,
    borderRadius: 1.5,
    marginRight: 12,
  },
  menuItemText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  logoutMenuItem: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: 8,
    paddingTop: 20,
  },
  logoutIcon: {
    marginRight: 12,
  },
  logoutText: {
    color: colors.danger,
    fontWeight: '600',
  },
  balanceCard: {
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceIcon: {
    marginRight: 8,
  },
  balanceStripe: {
    width: 2,
    height: 20,
    backgroundColor: colors.border,
    borderRadius: 1,
  },
  balanceTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  balanceMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  balanceAmount: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
  },
  balanceChange: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  balanceDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  balanceFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceFooterItem: {
    flex: 1,
  },
  balanceFooterLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  balanceFooterValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: colors.card,
  },
  actionButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  depositCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 24,
  },
  wireTransferCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 24,
  },
  withdrawCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 24,
  },
  depositHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  wireTransferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  depositStripe: {
    width: 3,
    height: 20,
    backgroundColor: colors.accent,
    borderRadius: 1.5,
    marginRight: 12,
  },
  depositTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  currencyButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  networkSelection: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 16,
  },
  networkOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.accent,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  networkOptionText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrCode: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  walletAddressSection: {
    marginBottom: 16,
  },
  walletAddressLabel: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 8,
  },
  walletAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  walletAddressText: {
    color: colors.textPrimary,
    fontSize: 14,
    flex: 1,
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
  uploadProofButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadProofButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  warningText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  wireTransferContent: {
    marginBottom: 20,
  },
  wireTransferHeading: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  wireTransferText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  amountInput: {
    flex: 1,
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    color: colors.textPrimary,
    fontSize: 15,
  },
  maxButton: {
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  maxButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  withdrawalCurrencyDisplay: {
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  withdrawalCurrencyText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  walletAddressInput: {
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    color: colors.textPrimary,
    fontSize: 15,
  },
  confirmButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  withdrawalInfoText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  withdrawalFeeText: {
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
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.accent,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  dropdownItemText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
});

export default AccountScreen;
