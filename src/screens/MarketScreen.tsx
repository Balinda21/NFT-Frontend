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
  image?: string;
  flag1?: string; // First flag for forex pairs
  flag2?: string; // Second flag for forex pairs
};

type TabType = 'Crypto' | 'Futures' | 'Forex' | 'US stock' | 'ETF';

// Empty fallback - all data fetched from API
const CRYPTO_PAIRS: MarketPair[] = [];

// Futures data - NO icons per reference design
const FUTURES_PAIRS: MarketPair[] = [
  { id: 'wti', symbol: 'WTI', name: 'West Texas Oil', price: 65.75, change24h: -23.48 },
  { id: 'brent', symbol: 'BRENT', name: 'Brent Crude Oil', price: 69.77, change24h: -23.29 },
  { id: 'ng', symbol: 'NG', name: 'Natural Gas', price: 4.48, change24h: 152.82 },
  { id: 'ho', symbol: 'HO', name: 'Heating Oil', price: 2.46, change24h: -8.75 },
  { id: 'rbob', symbol: 'RBOB', name: 'Gasoline', price: 2.05, change24h: -26.21 },
  { id: 'gc', symbol: 'GC', name: 'Gold', price: 4886.83, change24h: 106.25 },
  { id: 'xpt', symbol: 'XPT', name: 'Platinum', price: 83.94, change24h: 197.66 },
  { id: 'hg', symbol: 'HG', name: 'Copper', price: 595.14, change24h: 36.74 },
];

// Forex pairs data with dual flags (matching reference design)
const FOREX_PAIRS: MarketPair[] = [
  { id: 'usdcnh', symbol: 'USD/CNH', name: 'China', price: 6.9576, change24h: -4.47, flag1: 'https://flagcdn.com/w80/us.png', flag2: 'https://flagcdn.com/w80/cn.png' },
  { id: 'usdjpy', symbol: 'USD/JPY', name: 'Japan', price: 154.6285, change24h: -0.98, flag1: 'https://flagcdn.com/w80/us.png', flag2: 'https://flagcdn.com/w80/jp.png' },
  { id: 'eurusd', symbol: 'EUR/USD', name: 'Us Dollar', price: 1.1832, change24h: 13.61, flag1: 'https://flagcdn.com/w80/eu.png', flag2: 'https://flagcdn.com/w80/us.png' },
  { id: 'usdchf', symbol: 'USD/CHF', name: 'Switzerland', price: 0.7726, change24h: -14.76, flag1: 'https://flagcdn.com/w80/us.png', flag2: 'https://flagcdn.com/w80/ch.png' },
  { id: 'usdhkd', symbol: 'USD/HKD', name: 'USDHKD', price: 7.8097, change24h: 0.02, flag1: 'https://flagcdn.com/w80/us.png', flag2: 'https://flagcdn.com/w80/hk.png' },
  { id: 'usdsgd', symbol: 'USD/SGD', name: 'USDSGD', price: 1.2680, change24h: -6.48, flag1: 'https://flagcdn.com/w80/us.png', flag2: 'https://flagcdn.com/w80/sg.png' },
  { id: 'gbpusd', symbol: 'GBP/USD', name: 'Us Dollar', price: 1.3674, change24h: 10.72, flag1: 'https://flagcdn.com/w80/gb.png', flag2: 'https://flagcdn.com/w80/us.png' },
  { id: 'hkdcny', symbol: 'HKD/CNY', name: 'Chinaese', price: 0.8925, change24h: -4.38, flag1: 'https://flagcdn.com/w80/hk.png', flag2: 'https://flagcdn.com/w80/cn.png' },
  { id: 'audusd', symbol: 'AUD/USD', name: 'Australia', price: 0.6750, change24h: -1.20, flag1: 'https://flagcdn.com/w80/au.png', flag2: 'https://flagcdn.com/w80/us.png' },
];

// US Stocks data with company logos
const US_STOCKS: MarketPair[] = [
  { id: 'sohu', symbol: 'Sohu.com Ltd', name: 'SOHU', price: 15.420, change24h: 0.52, image: 'https://logo.clearbit.com/sohu.com' },
  { id: 'alphabet', symbol: 'Alphabet', name: 'GOOGL', price: 320.180, change24h: -0.98, image: 'https://logo.clearbit.com/google.com' },
  { id: 'microsoft', symbol: 'Microsoft', name: 'MSFT', price: 492.010, change24h: 0.91, image: 'https://logo.clearbit.com/microsoft.com' },
  { id: 'apple', symbol: 'Apple Inc', name: 'AAPL', price: 278.850, change24h: 0.57, image: 'https://logo.clearbit.com/apple.com' },
  { id: 'netease', symbol: 'NetEase Inc', name: 'NTES', price: 138.050, change24h: 0.20, image: 'https://logo.clearbit.com/netease.com' },
  { id: 'toyota', symbol: 'Toyota Motor', name: 'TM', price: 201.870, change24h: 0.90, image: 'https://logo.clearbit.com/toyota.com' },
  { id: 'amazon', symbol: 'Amazon.com', name: 'AMZN', price: 233.220, change24h: 0.86, image: 'https://logo.clearbit.com/amazon.com' },
  { id: 'berkshire', symbol: 'Berkshire Hathaway', name: 'BRK.A', price: 770100.000, change24h: 0.34, image: 'https://logo.clearbit.com/berkshirehathaway.com' },
  { id: 'nvidia', symbol: 'NVIDIA Corp', name: 'NVDA', price: 125.50, change24h: 1.25, image: 'https://logo.clearbit.com/nvidia.com' },
];

// ETF data with provider logos
const ETF_PAIRS: MarketPair[] = [
  { id: 'spy', symbol: 'SPY', name: 'SPDR S&P 500', price: 485.32, change24h: 0.85, image: 'https://logo.clearbit.com/ssga.com' },
  { id: 'qqq', symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 432.18, change24h: 1.12, image: 'https://logo.clearbit.com/invesco.com' },
  { id: 'vti', symbol: 'VTI', name: 'Vanguard Total Stock', price: 258.45, change24h: 0.67, image: 'https://logo.clearbit.com/vanguard.com' },
  { id: 'voo', symbol: 'VOO', name: 'Vanguard S&P 500', price: 485.78, change24h: 0.82, image: 'https://logo.clearbit.com/vanguard.com' },
  { id: 'iwm', symbol: 'IWM', name: 'iShares Russell 2000', price: 198.23, change24h: -0.45, image: 'https://logo.clearbit.com/ishares.com' },
  { id: 'dia', symbol: 'DIA', name: 'SPDR Dow Jones', price: 382.56, change24h: 0.34, image: 'https://logo.clearbit.com/ssga.com' },
  { id: 'schw', symbol: 'SCHW', name: 'Schwab US Large-Cap', price: 78.90, change24h: 0.56, image: 'https://logo.clearbit.com/schwab.com' },
  { id: 'arkk', symbol: 'ARKK', name: 'ARK Innovation ETF', price: 52.34, change24h: 2.15, image: 'https://logo.clearbit.com/ark-invest.com' },
  { id: 'xlk', symbol: 'XLK', name: 'Technology Select', price: 198.67, change24h: 1.45, image: 'https://logo.clearbit.com/ssga.com' },
];

// Dual flag component for forex pairs
const DualFlag: React.FC<{ flag1: string; flag2: string }> = ({ flag1, flag2 }) => (
  <View style={styles.dualFlagContainer}>
    <View style={styles.flag1Container}>
      <Image source={{ uri: flag1 }} style={styles.flagImage} />
    </View>
    <View style={styles.flag2Container}>
      <Image source={{ uri: flag2 }} style={styles.flagImage} />
    </View>
  </View>
);

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

    if (activeTab === 'Crypto') {
      fetchCryptoData();
    } else if (activeTab === 'Futures') {
      setPairs(FUTURES_PAIRS);
      setPairHistory({});
      setIsLive(false);
    } else if (activeTab === 'Forex') {
      setPairs(FOREX_PAIRS);
      setPairHistory({});
      setIsLive(false);
    } else if (activeTab === 'US stock') {
      setPairs(US_STOCKS);
      setPairHistory({});
      setIsLive(false);
    } else if (activeTab === 'ETF') {
      setPairs(ETF_PAIRS);
      setPairHistory({});
      setIsLive(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'Crypto') return;

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

  const formatPrice = (price: number) => {
    if (activeTab === 'US stock' || activeTab === 'ETF') {
      return price.toFixed(2);
    } else if (activeTab === 'Forex') {
      return price.toFixed(4);
    } else if (activeTab === 'Futures') {
      return price.toFixed(2);
    }
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  const renderIcon = (item: MarketPair) => {
    // Forex: show dual flags
    if (activeTab === 'Forex' && item.flag1 && item.flag2) {
      return <DualFlag flag1={item.flag1} flag2={item.flag2} />;
    }

    // Futures: no icons
    if (activeTab === 'Futures') {
      return null;
    }

    // Crypto, US Stocks, ETF: show single image only if it exists
    if (item.image) {
      return (
        <View style={styles.singleIconContainer}>
          <Image source={{ uri: item.image }} style={styles.singleIcon} />
        </View>
      );
    }

    // No image = no icon (don't show empty placeholder)
    return null;
  };

  const renderPairRow = ({ item, index }: { item: MarketPair; index: number }) => {
    const isNegative = item.change24h < 0;
    const changeColor = isNegative ? '#E57373' : '#81C784';
    const history = pairHistory[item.id] || [];

    const displaySymbol = activeTab === 'US stock' ? item.name : item.symbol;
    const displayName = activeTab === 'US stock' ? item.symbol : item.name;

    // Check if we should show an icon
    const hasIcon = activeTab === 'Forex' ? (item.flag1 && item.flag2) :
                    activeTab === 'Futures' ? false :
                    !!item.image;

    return (
      <TouchableOpacity
        style={styles.pairRow}
        onPress={() => {
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
          {renderIcon(item)}
          <View style={hasIcon ? styles.pairTextWithIcon : undefined}>
            <Text style={styles.pairSymbol}>{displaySymbol}</Text>
            <Text style={styles.pairName}>{displayName}</Text>
          </View>
        </View>

        <View style={styles.pairSparkline}>
          <Sparkline data={history} width={100} height={40} />
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

        {/* Market List - wrapped in card container */}
        <View style={styles.listCard}>
          <FlatList
            data={pairs}
            keyExtractor={(item) => item.id}
            renderItem={renderPairRow}
            ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        </View>
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
    marginBottom: 16,
    flexGrow: 0,
  },
  tabContent: {
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: '#2A2A2A',
  },
  tabText: {
    fontSize: 15,
    color: '#888888',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  listContent: {
    paddingVertical: 8,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pairLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 100,
  },
  pairTextWithIcon: {
    marginLeft: 12,
  },
  // Dual flag styles for Forex
  dualFlagContainer: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  flag1Container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
    borderWidth: 2,
    borderColor: '#1A1A1A',
    zIndex: 2,
  },
  flag2Container: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
    borderWidth: 2,
    borderColor: '#1A1A1A',
    zIndex: 1,
  },
  flagImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  // Single icon styles for Crypto, US Stocks, ETF
  singleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
  },
  singleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  pairSymbol: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  pairName: {
    color: '#666666',
    fontSize: 12,
    marginTop: 2,
  },
  pairSparkline: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  pairRight: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  pairPrice: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  pairChange: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 16,
  },
});

export default MarketScreen;
