import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Sparkline } from '../components/Sparkline';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/apiClient';
import { API_ENDPOINTS } from '../config/api';
import { chatService } from '../services/chatService';

type PairRow = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  image: string; // Crypto logo URL from CoinGecko
};

type MiniAsset = {
  id: string;
  symbol: string;
  label: string;
  subtitle: string;
  change24h: number;
  image: string; // Crypto logo URL from CoinGecko
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, updateUserBalance } = useAuth();
  const [pairs, setPairs] = useState<PairRow[]>([]);
  const [miniAssets, setMiniAssets] = useState<MiniAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [pairHistory, setPairHistory] = useState<Record<string, number[]>>({});
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
      console.log('[HomeScreen] Real-time balance update:', data.accountBalance);
      const newBalance = parseFloat(data.accountBalance) || 0;
      setAccountBalance(newBalance);
      updateUserBalance(newBalance);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        setLoading(true);
        // Include sparkline=true to get 7-day price history for real charts
        const res = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,filecoin,litecoin,polkadot,dogecoin,ripple,tron&price_change_percentage=24h&sparkline=true',
        );
        const json = await res.json();
        if (Array.isArray(json)) {
          // Map by id for easy lookup
          const byId: Record<string, any> = {};
          json.forEach((item: any) => {
            if (item && item.id) {
              byId[item.id] = item;
            }
          });

          // Mini cards: BTC, ETH, FIL - only set if we have data
          const miniIds = ['bitcoin', 'ethereum', 'filecoin'];
          const nextMini: MiniAsset[] = miniIds
            .map((id) => {
              const item = byId[id];
              if (!item) return null;
              return {
                id: item.id,
                symbol: `${item.symbol.toUpperCase()}/USD`,
                label: `${item.symbol.toUpperCase()}/USD`,
                subtitle: item.name,
                change24h: typeof item.price_change_percentage_24h_in_currency === 'number'
                  ? item.price_change_percentage_24h_in_currency
                  : 0,
                image: item.image || '', // Crypto logo from CoinGecko
              };
            })
            .filter((item): item is MiniAsset => item !== null);
          setMiniAssets(nextMini);

          // Market list: LTC, DOT, DOGE, XRP, TRX in fixed order - only set if we have data
          const desiredOrder = ['litecoin', 'polkadot', 'dogecoin', 'ripple', 'tron'];
          const nextPairs: PairRow[] = desiredOrder
            .map((id) => {
              const item = byId[id];
              if (!item) return null;
              const pctField = item.price_change_percentage_24h_in_currency;
              return {
                id: item.id,
                symbol: `${item.symbol.toUpperCase()}/USD`,
                name: item.name,
                price: typeof item.current_price === 'number' ? item.current_price : 0,
                change24h: typeof pctField === 'number' ? pctField : 0,
                image: item.image || '', // Crypto logo from CoinGecko
              };
            })
            .filter((item): item is PairRow => item !== null);
          setPairs(nextPairs);

          // Extract real 7-day sparkline data from CoinGecko
          const newHistory: Record<string, number[]> = {};
          [...miniIds, ...desiredOrder].forEach((id) => {
            const item = byId[id];
            if (item?.sparkline_in_7d?.price) {
              // Take last 50 points for a cleaner chart
              const prices = item.sparkline_in_7d.price;
              newHistory[id] = prices.slice(-50);
            }
          });
          setPairHistory(newHistory);
          setIsLive(true);
        }
      } catch {
        // Ignore errors, keep initial mock data
        setIsLive(false);
      } finally {
        setLoading(false);
      }
    };

    fetchMarket();

    // Refresh data every 30 seconds (sparkline data doesn't change frequently)
    const interval = setInterval(() => {
      fetchMarket();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const renderTopCard = () => (
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
  );

  const renderMiniCard = (asset: MiniAsset) => {
    const isPositive = asset.change24h >= 0;
    const history = pairHistory[asset.id] || [];

    return (
      <View style={styles.miniCard} key={asset.id}>
        <Text style={styles.miniCardTitle}>{asset.label}</Text>
        <Text style={styles.miniCardSubtitle}>{asset.subtitle}</Text>
        <View style={styles.miniSparkline}>
          <Sparkline data={history} width={60} height={24} isPositive={isPositive} />
        </View>
        <View style={styles.miniCardFooter}>
          <Text style={[styles.miniCardValue, { color: isPositive ? colors.accent : '#E57373' }]}>
            {asset.change24h.toFixed(2)}%
          </Text>
          <View style={[styles.miniCardCircle, { backgroundColor: isPositive ? colors.accent + '20' : '#E5737320' }]}>
            <Ionicons
              name={isPositive ? 'trending-up' : 'trending-down'}
              size={14}
              color={isPositive ? colors.accent : '#E57373'}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderPairRow = ({ item }: { item: PairRow }) => {
    const isNegative = item.change24h < 0;
    const isPositive = !isNegative;
    const changeColor = isNegative ? '#E57373' : '#81C784';
    const history = pairHistory[item.id] || [];

    return (
      <View style={styles.pairRow}>
        <View style={styles.pairLeft}>
          {item.image ? (
            <View style={styles.pairIconContainer}>
              <Image source={{ uri: item.image }} style={styles.pairIcon} />
            </View>
          ) : null}
          <View style={item.image ? styles.pairTextWithIcon : undefined}>
            <Text style={styles.pairSymbol}>{item.symbol}</Text>
            <Text style={styles.pairName}>{item.name}</Text>
          </View>
        </View>

        <View style={styles.pairSparkline}>
          <Sparkline data={history} width={80} height={32} isPositive={isPositive} />
        </View>

        <View style={styles.pairRight}>
          <Text style={styles.pairPrice}>{item.price.toFixed(4)}</Text>
          <Text style={[styles.pairChange, { color: changeColor }]}>
            {isNegative ? '' : '+'}{item.change24h.toFixed(2)}%
          </Text>
        </View>
      </View>
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

        <Text style={[styles.liveBadge, { color: isLive ? colors.accent : colors.danger }]}>
          {isLive ? 'LIVE DATA • CoinGecko' : 'OFFLINE • Using sample data'}
        </Text>

        {renderTopCard()}

        <View style={styles.miniRow}>
          {miniAssets.map((asset) => renderMiniCard(asset))}
            </View>

        <View style={styles.marketHeaderRow}>
          <Text style={styles.marketTitle}>Market</Text>
          <Text style={styles.marketSeeMore}>See more</Text>
            </View>

        <View style={styles.marketCard}>
          <FlatList
            data={pairs}
            keyExtractor={(item) => item.id}
            renderItem={renderPairRow}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
          />
            </View>

        {/* AI Quantitative Trading card */}
        <View style={styles.aiCard}>
          <View style={styles.aiIconWrapper}>
            <Image
              source={require('../../assets/atomic.webp')}
              style={styles.aiIconImage}
              resizeMode="contain"
            />
            </View>
          <Text style={styles.aiTitle}>Easy to use</Text>
          <Text style={styles.aiSubtitle}>AI Quantitative Trading</Text>
          <Text style={styles.aiCaption}>Safe / Stable / Simple</Text>

          <TouchableOpacity
            style={styles.aiButton}
            onPress={() => navigation.navigate('AIQuantification' as never)}
          >
            <Ionicons
              name="add-circle"
              size={18}
              color={colors.background}
              style={styles.aiButtonIcon}
            />
            <Text style={styles.aiButtonText}>Create Transaction</Text>
          </TouchableOpacity>
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
    marginBottom: 16,
  },
  liveBadge: {
    fontSize: 11,
    marginBottom: 8,
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
  balanceCard: {
    marginTop: 8,
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
  miniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  miniCard: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginHorizontal: 4,
  },
  miniCardTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  miniCardSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  miniSparkline: {
    marginVertical: 6,
    alignItems: 'center',
  },
  miniCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  miniCardValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  miniCardCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2B2B2B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketHeaderRow: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marketTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  marketSeeMore: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  marketCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  aiCard: {
    marginTop: 24,
    backgroundColor: '#181818',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 26,
    alignItems: 'center',
  },
  aiIconWrapper: {
    marginBottom: 16,
  },
  aiIconImage: {
    width: 64,
    height: 64,
  },
  aiTitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 6,
  },
  aiSubtitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  aiCaption: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 22,
  },
  aiButton: {
    marginTop: 4,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 26,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiButtonIcon: {
    marginRight: 8,
  },
  aiButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  pairLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.2,
  },
  pairTextWithIcon: {
    marginLeft: 12,
  },
  pairIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pairIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  pairSymbol: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  pairName: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  pairSparkline: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairRight: {
    alignItems: 'flex-end',
    flex: 0.7,
  },
  pairPrice: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  pairChange: {
    fontSize: 12,
    marginTop: 2,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});

export default HomeScreen;

