import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Sparkline } from '../components/Sparkline';

type MarketPair = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  image?: string; // Crypto logo URL
};

type TabType = 'Crypto' | 'Futures' | 'Forex' | 'US stock' | 'ETF';

// Empty fallback - all data fetched from API
const CRYPTO_PAIRS: MarketPair[] = [];

// Futures data
const FUTURES_PAIRS: MarketPair[] = [
  { id: 'wti', symbol: 'WTI', name: 'West Texas Oil', price: 58.32, change24h: -32.13 },
  { id: 'brent', symbol: 'BRENT', name: 'Brent Crude Oil', price: 62.41, change24h: -31.38 },
  { id: 'ng', symbol: 'NG', name: 'Natural Gas', price: 3.88, change24h: 118.96 },
  { id: 'ho', symbol: 'HO', name: 'Heating Oil', price: 2.29, change24h: -15.06 },
  { id: 'rbob', symbol: 'RBOB', name: 'Gasoline', price: 1.72, change24h: -38.08 },
  { id: 'gc', symbol: 'GC', name: 'Gold', price: 4257.08, change24h: 79.67 },
  { id: 'xpt', symbol: 'XPT', name: 'Platinum', price: 57.20, change24h: 102.84 },
  { id: 'hg', symbol: 'HG', name: 'Copper', price: 528.25, change24h: 21.37 },
];

// Forex pairs data
const FOREX_PAIRS: MarketPair[] = [
  { id: 'usdcnh', symbol: 'USD/CNH', name: 'China', price: 7.0714, change24h: -2.90 },
  { id: 'usdjpy', symbol: 'USD/JPY', name: 'Japan', price: 156.1109, change24h: -0.03 },
  { id: 'eurusd', symbol: 'EUR/USD', name: 'Us Dollar', price: 1.1607, change24h: 11.45 },
  { id: 'usdchf', symbol: 'USD/CHF', name: 'Switzerland', price: 0.8032, change24h: -11.38 },
  { id: 'usdhkd', symbol: 'USD/HKD', name: 'USDHKD', price: 7.7882, change24h: -0.25 },
  { id: 'usdsgd', symbol: 'USD/SGD', name: 'USDSGD', price: 1.2983, change24h: -4.24 },
  { id: 'gbpusd', symbol: 'GBP/USD', name: 'Us Dollar', price: 1.3259, change24h: 7.36 },
  { id: 'hkdny', symbol: 'HKD/CNY', name: 'Chinaese', price: 0.9133, change24h: -2.15 },
  { id: 'audusd', symbol: 'AUD/USD', name: 'Australia', price: 0.6750, change24h: -1.20 },
];

// US Stocks data
const US_STOCKS: MarketPair[] = [
  { id: 'sohu', symbol: 'Sohu.com Ltd', name: 'Sohu.com Ltd', price: 15.420, change24h: 0.52 },
  { id: 'alphabet', symbol: 'Alphabet', name: 'GOOGL', price: 320.180, change24h: -0.98 },
  { id: 'microsoft', symbol: 'Microsoft', name: 'MSFT', price: 492.010, change24h: 0.91 },
  { id: 'apple', symbol: 'Apple Inc', name: 'AAPL', price: 278.850, change24h: 0.57 },
  { id: 'netease', symbol: 'NetEase Inc', name: 'NetEase Inc', price: 138.050, change24h: 0.20 },
  { id: 'toyota', symbol: 'Toyota Motor', name: 'Toyota Motor', price: 201.870, change24h: 0.90 },
  { id: 'amazon', symbol: 'Amazon.com', name: 'AMZN', price: 233.220, change24h: 0.86 },
  { id: 'berkshire', symbol: 'Berkshire Hathaway Inc', name: 'Berkshire Hathaway Inc', price: 770100.000, change24h: 0.34 },
  { id: 'nvidia', symbol: 'NVIDIA Corp', name: 'NVDA', price: 125.50, change24h: 1.25 },
];

// ETF data
const ETF_PAIRS: MarketPair[] = [
  { id: 'spy', symbol: 'SPY', name: 'SPDR S&P 500', price: 485.32, change24h: 0.85 },
  { id: 'qqq', symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 432.18, change24h: 1.12 },
  { id: 'vti', symbol: 'VTI', name: 'Vanguard Total Stock', price: 258.45, change24h: 0.67 },
  { id: 'voo', symbol: 'VOO', name: 'Vanguard S&P 500', price: 485.78, change24h: 0.82 },
  { id: 'iwm', symbol: 'IWM', name: 'iShares Russell 2000', price: 198.23, change24h: -0.45 },
  { id: 'dia', symbol: 'DIA', name: 'SPDR Dow Jones', price: 382.56, change24h: 0.34 },
  { id: 'schw', symbol: 'SCHW', name: 'Schwab US Large-Cap', price: 78.90, change24h: 0.56 },
  { id: 'arkk', symbol: 'ARKK', name: 'ARK Innovation ETF', price: 52.34, change24h: 2.15 },
  { id: 'xlk', symbol: 'XLK', name: 'Technology Select Sector', price: 198.67, change24h: 1.45 },
];

const MarketScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('Crypto');
  const [pairs, setPairs] = useState<MarketPair[]>([]);
  const [pairHistory, setPairHistory] = useState<Record<string, number[]>>({});
  const [isLive, setIsLive] = useState(false);

  const tabs: TabType[] = ['Crypto', 'Futures', 'Forex', 'US stock', 'ETF'];

  useEffect(() => {
    const fetchCryptoData = async () => {
      try {
        // Include sparkline=true for real 7-day price history
        const res = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,binancecoin,solana,cardano,polkadot,dogecoin,ripple,tron,litecoin,filecoin&price_change_percentage=24h&sparkline=true',
        );
        const json = await res.json();
        if (Array.isArray(json)) {
          const byId: Record<string, any> = {};
          json.forEach((item: any) => {
            if (item && item.id) {
              byId[item.id] = item;
            }
          });

          const desiredOrder = [
            'bitcoin',
            'ethereum',
            'litecoin',
            'polkadot',
            'filecoin',
            'dogecoin',
            'ripple',
            'tron',
            'binancecoin',
            'solana',
            'cardano',
          ];
          const nextPairs: MarketPair[] = desiredOrder
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
            .filter((item) => item !== null) as MarketPair[];
          setPairs(nextPairs);

          // Extract real 7-day sparkline data from CoinGecko
          const newHistory: Record<string, number[]> = {};
          desiredOrder.forEach((id) => {
            const item = byId[id];
            if (item?.sparkline_in_7d?.price) {
              const prices = item.sparkline_in_7d.price;
              newHistory[id] = prices.slice(-50);
            }
          });
          setPairHistory(newHistory);
          setIsLive(true);
        }
      } catch {
        setIsLive(false);
      }
    };

    // Set data based on active tab
    if (activeTab === 'Crypto') {
      fetchCryptoData();
    } else if (activeTab === 'Futures') {
      setPairs(FUTURES_PAIRS);
      setIsLive(false);
    } else if (activeTab === 'Forex') {
      setPairs(FOREX_PAIRS);
      setIsLive(false);
    } else if (activeTab === 'US stock') {
      setPairs(US_STOCKS);
      setIsLive(false);
    } else if (activeTab === 'ETF') {
      setPairs(ETF_PAIRS);
      setIsLive(false);
    }
  }, [activeTab]);

  // Set up polling for real-time updates when crypto tab is active
  useEffect(() => {
    if (activeTab !== 'Crypto') return;

    // Refresh every 30 seconds (sparkline data doesn't change frequently)
    const interval = setInterval(() => {
      const fetchCryptoData = async () => {
        try {
          const res = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,binancecoin,solana,cardano,polkadot,dogecoin,ripple,tron,litecoin,filecoin&price_change_percentage=24h&sparkline=true',
          );
          const json = await res.json();
          if (Array.isArray(json)) {
            const byId: Record<string, any> = {};
            json.forEach((item: any) => {
              if (item && item.id) {
                byId[item.id] = item;
              }
            });

            const desiredOrder = [
              'bitcoin',
              'ethereum',
              'litecoin',
              'polkadot',
              'filecoin',
              'dogecoin',
              'ripple',
              'tron',
              'binancecoin',
              'solana',
              'cardano',
            ];
            const nextPairs: MarketPair[] = desiredOrder
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
                  image: item.image || '',
                };
              })
              .filter((item) => item !== null) as MarketPair[];
            setPairs(nextPairs);

            // Extract real sparkline data
            const newHistory: Record<string, number[]> = {};
            desiredOrder.forEach((id) => {
              const item = byId[id];
              if (item?.sparkline_in_7d?.price) {
                const prices = item.sparkline_in_7d.price;
                newHistory[id] = prices.slice(-50);
              }
            });
            setPairHistory(newHistory);
            setIsLive(true);
          }
        } catch {
          setIsLive(false);
        }
      };
      fetchCryptoData();
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const renderPairRow = ({ item }: { item: MarketPair }) => {
    const isNegative = item.change24h < 0;
    const changeColor = isNegative ? '#FF6B6B' : colors.accent;
    const isPositive = item.change24h >= 0;
    const history = pairHistory[item.id] || [];

    // Format price based on tab type
    const formatPrice = (price: number) => {
      if (activeTab === 'US stock' || activeTab === 'ETF') {
        return price.toFixed(2).replace(/\.?0+$/, '');
      } else if (activeTab === 'Forex') {
        return price.toFixed(4);
      } else if (activeTab === 'Futures') {
        return price.toFixed(2);
      }
      // Crypto: format based on price magnitude
      if (price >= 1000) return price.toFixed(2);
      if (price >= 1) return price.toFixed(4);
      return price.toFixed(6);
    };

    // For US stocks, swap symbol and name display
    const displaySymbol = activeTab === 'US stock' ? item.name : item.symbol;
    const displayName = activeTab === 'US stock' ? item.symbol : item.name;

    return (
      <TouchableOpacity
        style={styles.pairRow}
        onPress={() => {
          // Navigate to the Chart screen inside the HomeTab stack
          navigation.navigate('HomeTab' as never, {
            screen: 'Chart',
            params: {
              symbolId: item.id,
              displaySymbol,
              price: item.price,
              change24h: item.change24h,
              open: item.price * (1 - Math.abs(item.change24h) / 100),
              high: item.price * (1 + Math.abs(item.change24h) / 200),
              low: item.price * (1 - Math.abs(item.change24h) / 200),
              close: item.price,
            },
          } as never);
        }}
      >
        <View style={styles.pairLeft}>
          <View style={styles.pairIconContainer}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.pairIcon} />
            ) : (
              <View style={styles.pairIconPlaceholder}>
                <Text style={styles.pairIconQuestion}>?</Text>
              </View>
            )}
          </View>
          <View>
            <Text style={styles.pairSymbol}>{displaySymbol}</Text>
            <Text style={styles.pairName}>{displayName}</Text>
          </View>
        </View>

        <View style={styles.pairSparkline}>
          <Sparkline data={history} width={90} height={36} />
        </View>

        <View style={styles.pairRight}>
          <Text style={styles.pairPrice}>{formatPrice(item.price)}</Text>
          <Text style={[styles.pairChange, { color: changeColor }]}>
            {isNegative ? '' : '+'}{item.change24h.toFixed(2)}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>Market</Text>

        {/* Tab Navigation */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabContainer}
          contentContainerStyle={styles.tabContent}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    isActive && styles.tabTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Market List */}
        <FlatList
          data={pairs}
          keyExtractor={(item) => item.id}
          renderItem={renderPairRow}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
        />
      </View>
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
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  tabContainer: {
    marginBottom: 20,
  },
  tabContent: {
    paddingRight: 16,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  tabActive: {
    backgroundColor: '#1a1a1a',
  },
  tabText: {
    fontSize: 15,
    color: '#A0A0A0', // Light gray for inactive tabs
    fontWeight: '400',
  },
  tabTextActive: {
    color: '#FFFFFF', // White text for active tab
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 8,
  },
  pairLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.2,
  },
  pairIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
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
  pairIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2F8BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairIconQuestion: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pairSymbol: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  pairName: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  pairSparkline: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairRight: {
    alignItems: 'flex-end',
    flex: 0.8,
  },
  pairPrice: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  pairChange: {
    fontSize: 13,
    fontWeight: '500',
  },
  rowDivider: {
    height: 0,
  },
});

export default MarketScreen;
