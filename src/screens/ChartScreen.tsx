import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { marketDataService, CandleData, PriceUpdate } from '../services/marketDataService';

type RouteParams = {
  // `symbolId` is the stable identifier used for data fetching (e.g. 'bitcoin')
  symbol?: string; // legacy - may contain a readable label
  symbolId?: string; // preferred for fetching
  displaySymbol?: string; // readable label for UI (e.g. 'BTC/USD')
  price?: number;
  change24h?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
};

type Timeframe = '1m' | '5m' | '15m' | '30m' | '1H' | '1D';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ChartScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params as RouteParams) || {};
  const symbolId = params.symbolId || undefined;
  const displaySymbol = params.displaySymbol || params.symbol || '';
  // Use a readable display symbol for fetching/connections when available.
  // Fallback order: displaySymbol (e.g. 'BTC/USD') -> symbolId (e.g. 'bitcoin') -> raw symbol
  const fetchSymbol = displaySymbol || symbolId || params.symbol || '';
  const price = params.price ?? 0;
  const change24h = params.change24h ?? 0;
  const open = params.open ?? 0;
  const high = params.high ?? price;
  const low = params.low ?? price;
  const close = params.close ?? price;

  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('15m');
  const [isFavorited, setIsFavorited] = useState(false);
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [currentPrice, setCurrentPrice] = useState(price);
  const [currentChange24h, setCurrentChange24h] = useState(change24h);
  const [currentHigh, setCurrentHigh] = useState(high || price);
  const [currentLow, setCurrentLow] = useState(low || price);
  const [isLoading, setIsLoading] = useState(true);
  const priceUpdateRef = useRef<PriceUpdate | null>(null);

  const isNegative = currentChange24h < 0;
  const changeColor = isNegative ? '#cf7635' : '#c0dd2c';
  const changeText = isNegative ? '' : '+';
  const upColor = '#c0dd2c';
  const downColor = '#cf7635';

  const timeframes: Timeframe[] = ['1m', '5m', '15m', '30m', '1H', '1D'];

  const chartHeight = 200;
  const volumeHeight = 60;

  // Calculate price range for chart
  const minPrice = chartData.length > 0 
    ? Math.min(...chartData.map(d => d.low))
    : currentPrice * 0.99;
  const maxPrice = chartData.length > 0
    ? Math.max(...chartData.map(d => d.high))
    : currentPrice * 1.01;
  const priceRange = maxPrice - minPrice || 0.01;

  const handleUpPress = () => {
    navigation.navigate('OptionTrading' as never, {
      symbol: displaySymbol || fetchSymbol,
      price: currentPrice,
      change24h: currentChange24h,
      direction: 'up',
    } as never);
  };

  const handleDownPress = () => {
    navigation.navigate('OptionTrading' as never, {
      symbol: displaySymbol || fetchSymbol,
      price: currentPrice,
      change24h: currentChange24h,
      direction: 'down',
    } as never);
  };

  // Load historical data and connect to real-time streams
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Fetch historical candlestick data using the readable symbol when possible
        const candles = await marketDataService.fetchCandles(
          fetchSymbol,
          selectedTimeframe,
          100
        );

        if (isMounted) {
          setChartData(candles);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading chart data:', error);
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    // Small delay before connecting WebSockets to ensure historical data loads first
    const connectTimeout = setTimeout(() => {
      if (!isMounted) return;

      // Connect to real-time price stream
      marketDataService.connectPriceStream(fetchSymbol, (update: PriceUpdate) => {
        if (isMounted) {
          priceUpdateRef.current = update;
          setCurrentPrice(update.price);
          setCurrentChange24h(update.change24h);
          setCurrentHigh(update.high24h);
          setCurrentLow(update.low24h);
        }
      });

      // Connect to real-time candle stream
      marketDataService.connectCandleStream(
        fetchSymbol,
        selectedTimeframe,
        (newCandle: CandleData) => {
          if (isMounted) {
            setChartData((prev) => {
              if (prev.length === 0) return prev;

              const updated = [...prev];
              const lastCandle = updated[updated.length - 1];

              // Update last candle if same time period, else add new
              if (lastCandle && lastCandle.time === newCandle.time) {
                updated[updated.length - 1] = newCandle;
              } else {
                updated.push(newCandle);
                return updated.slice(-100);
              }

              return updated;
            });
          }
        }
      );
    }, 1000);

    return () => {
      isMounted = false;
      clearTimeout(connectTimeout);
      // Only disconnect when component unmounts or fetchSymbol changes
      marketDataService.disconnect();
    };
  }, [fetchSymbol, selectedTimeframe]);

  // Update price when timeframe changes (re-fetch candles & reconnect candle stream)
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const candles = await marketDataService.fetchCandles(
          fetchSymbol,
          selectedTimeframe,
          100
        );
        if (isMounted) {
          setChartData(candles);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading chart data:', error);
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    // Reconnect candle stream with new interval after a short delay
    const reconnectTimeout = setTimeout(() => {
      if (!isMounted) return;

      marketDataService.disconnectCandleStream();
      marketDataService.connectCandleStream(
        fetchSymbol,
        selectedTimeframe,
        (newCandle: CandleData) => {
          if (isMounted) {
            setChartData((prev) => {
              if (prev.length === 0) return prev;

              const updated = [...prev];
              const lastCandle = updated[updated.length - 1];

              if (lastCandle && lastCandle.time === newCandle.time) {
                updated[updated.length - 1] = newCandle;
              } else {
                updated.push(newCandle);
                return updated.slice(-100);
              }

              return updated;
            });
          }
        }
      );
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
    };
  }, [selectedTimeframe, fetchSymbol]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{displaySymbol || fetchSymbol}</Text>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => setIsFavorited(!isFavorited)}
        >
          <Ionicons
            name={isFavorited ? 'star' : 'star-outline'}
            size={24}
            color={isFavorited ? colors.accent : colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Price Card */}
        <View style={styles.priceCard}>
          <View style={styles.priceLeft}>
            <View style={styles.priceBar} />
            <View style={styles.priceInfo}>
              <Text style={styles.currentPrice}>{currentPrice.toFixed(2)}</Text>
              <View style={styles.changeRow}>
                <Text style={[styles.changePercent, { color: changeColor }]}>
                  {changeText}{currentChange24h.toFixed(2)}%
                </Text>
                <View style={styles.changeIconContainer}>
                  <Ionicons
                    name={isNegative ? 'chevron-down' : 'chevron-up'}
                    size={12}
                    color="#888"
                  />
                </View>
              </View>
            </View>
          </View>
          <View style={styles.priceRight}>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Open</Text>
              <Text style={styles.metricValue}>
                {chartData.length > 0 ? chartData[0].open.toFixed(2) : currentPrice.toFixed(2)}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>LOW</Text>
              <Text style={styles.metricValue}>{currentLow.toFixed(2)}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>High</Text>
              <Text style={styles.metricValue}>{currentHigh.toFixed(2)}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Close</Text>
              <Text style={styles.metricValue}>
                {chartData.length > 0 ? chartData[chartData.length - 1].close.toFixed(2) : currentPrice.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Timeframe Selection */}
        <View style={styles.timeframeContainer}>
          {timeframes.map((tf) => (
            <TouchableOpacity
              key={tf}
              style={[
                styles.timeframeButton,
                selectedTimeframe === tf && styles.timeframeButtonActive,
              ]}
              onPress={() => setSelectedTimeframe(tf)}
            >
              <Text
                style={[
                  styles.timeframeText,
                  selectedTimeframe === tf && styles.timeframeTextActive,
                ]}
              >
                {tf}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart Area */}
        <View style={styles.chartContainer}>
          {/* Candlestick Chart */}
          <View style={styles.candlestickContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading chart data...</Text>
              </View>
            ) : (
              <>
                <View style={styles.chartGrid}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.gridLine,
                        { top: (chartHeight / 8) * i },
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.candlesticks}>
                  {chartData.map((candle, index) => {
                    const isUp = candle.close >= candle.open;
                    const bodyTop = Math.max(candle.open, candle.close);
                    const bodyBottom = Math.min(candle.open, candle.close);
                    const wickTop = candle.high;
                    const wickBottom = candle.low;

                    // Calculate Y positions (inverted because 0 is at top)
                    const wickTopY =
                      chartHeight - ((wickTop - minPrice) / priceRange) * chartHeight;
                    const wickBottomY =
                      chartHeight - ((wickBottom - minPrice) / priceRange) * chartHeight;
                    const bodyTopY =
                      chartHeight - ((bodyTop - minPrice) / priceRange) * chartHeight;
                    const bodyBottomY =
                      chartHeight - ((bodyBottom - minPrice) / priceRange) * chartHeight;

                    const chartWidth = SCREEN_WIDTH - 92; // 16 left + 60 right + 16 padding
                    const candleWidth = Math.max(6, (chartWidth / chartData.length) - 1);
                    const x = 16 + (index * chartWidth) / chartData.length;
                    const bodyWidth = Math.max(4, candleWidth * 0.7);

                    return (
                      <View key={index} style={[styles.candle, { left: x, width: candleWidth }]}>
                        {/* Wick - full height from high to low */}
                        <View
                          style={[
                            styles.wick,
                            {
                              position: 'absolute',
                              top: wickTopY,
                              height: Math.max(1, wickBottomY - wickTopY),
                              width: 1.5,
                              left: candleWidth / 2 - 0.75,
                              backgroundColor: isUp ? upColor : downColor,
                            },
                          ]}
                        />
                        {/* Body - from open to close */}
                        <View
                          style={[
                            styles.candleBody,
                            {
                              position: 'absolute',
                              top: bodyTopY,
                              height: Math.max(2, bodyBottomY - bodyTopY),
                              width: bodyWidth,
                              left: (candleWidth - bodyWidth) / 2,
                              backgroundColor: isUp ? upColor : downColor,
                            },
                          ]}
                        />
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>

          {/* Price Labels - Right Side */}
          {chartData.length > 0 && (
            <View style={styles.priceLabelsRight}>
              {Array.from({ length: 9 }).map((_, i) => {
                // Create 9 evenly spaced price labels matching the 8 grid lines + 1 bottom
                const priceStep = priceRange / 8;
                const price = maxPrice - (priceStep * i);
                const yPosition = (i / 8) * chartHeight;
                
                return (
                  <View
                    key={i}
                    style={[
                      styles.priceLabelContainer,
                      { top: yPosition - 8 }, // Center the label on the grid line
                    ]}
                  >
                    <Text style={styles.priceLabel}>
                      {price.toFixed(2)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Horizontal Price Line - Yellow-Green at bottom */}
          {chartData.length > 0 && (
            <View style={[
              styles.priceLine,
              {
                top: chartHeight - 1, // Position at the bottom
              }
            ]}>
              <Text style={styles.priceLineText}>{currentPrice.toFixed(4)}</Text>
            </View>
          )}
        </View>

        {/* Volume Chart */}
        {!isLoading && (
          <View style={styles.volumeContainer}>
            {chartData.map((candle, index) => {
              const isUp = candle.close >= candle.open;
              const maxVolume = Math.max(...chartData.map(d => d.volume));
              const barHeight = maxVolume > 0 ? (candle.volume / maxVolume) * volumeHeight : 0;
              const chartWidth = SCREEN_WIDTH - 92;
              const barWidth = Math.max(2, chartWidth / chartData.length - 2);
              const x = 16 + (index * chartWidth) / chartData.length;

              return (
                <View
                  key={index}
                  style={[
                    styles.volumeBar,
                    {
                      left: x,
                      width: barWidth,
                      height: barHeight,
                      backgroundColor: isUp ? upColor : downColor,
                    },
                  ]}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.upButton]}
          onPress={handleUpPress}
        >
          <Text style={styles.actionButtonText}>Up</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.downButton]}
          onPress={handleDownPress}
        >
          <Text style={styles.actionButtonText}>Down</Text>
        </TouchableOpacity>
      </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
  },
  priceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    margin: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  priceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priceBar: {
    width: 4,
    height: 50,
    backgroundColor: '#c0dd2c',
    borderRadius: 2,
    marginRight: 12,
  },
  priceInfo: {
    flex: 1,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changePercent: {
    fontSize: 16,
    fontWeight: '600',
  },
  changeIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  metricRow: {
    alignItems: 'flex-end',
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timeframeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  timeframeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  timeframeButtonActive: {
    backgroundColor: colors.card,
  },
  timeframeText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  timeframeTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  chartContainer: {
    height: 250,
    marginHorizontal: 16,
    marginBottom: 16,
    position: 'relative',
  },
  priceLabels: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 200,
    justifyContent: 'space-between',
    width: 50,
    zIndex: 1,
  },
  priceLabelsRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: 200,
    width: 60,
    zIndex: 10,
  },
  priceLabelContainer: {
    position: 'absolute',
    right: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 16,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    textAlign: 'right',
  },
  candlestickContainer: {
    marginLeft: 16,
    marginRight: 60,
    height: 200,
    position: 'relative',
  },
  chartGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#cf7635', // Orange color for grid lines
    borderStyle: 'solid',
    opacity: 0.6,
  },
  candlesticks: {
    position: 'relative',
    height: 200,
  },
  candle: {
    position: 'absolute',
  },
  wick: {
    position: 'absolute',
  },
  candleBody: {
    position: 'absolute',
  },
  priceLine: {
    position: 'absolute',
    left: 16,
    right: 60,
    height: 2,
    backgroundColor: '#c0dd2c', // Yellow-green color
    alignItems: 'flex-end',
    paddingRight: 8,
    zIndex: 5,
  },
  priceLineText: {
    fontSize: 11,
    color: '#c0dd2c',
    fontWeight: '600',
    marginTop: -10,
    backgroundColor: colors.background,
    paddingHorizontal: 4,
  },
  volumeContainer: {
    height: 60,
    marginHorizontal: 16,
    marginBottom: 16,
    marginLeft: 16,
    marginRight: 76,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  volumeBar: {
    position: 'absolute',
    bottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upButton: {
    backgroundColor: '#c0dd2c',
  },
  downButton: {
    backgroundColor: '#cf7635',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
});

export default ChartScreen;
