type CandleData = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type PriceUpdate = {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
};

class MarketDataService {
  private priceWs: WebSocket | null = null;
  private candleWs: WebSocket | null = null;
  private priceReconnectTimeout: NodeJS.Timeout | null = null;
  private candleReconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts: { price: number; candle: number } = { price: 0, candle: 0 };
  private maxReconnectAttempts = 5;
  private currentSymbol: string = '';
  private currentInterval: string = '15m';

  // Map interval to Binance format
  private mapInterval(interval: string): string {
    const map: Record<string, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1H': '1h',
      '1D': '1d',
    };
    return map[interval] || '15m';
  }

  // Convert symbol to Binance format (e.g., "BTC/USD" -> "BTCUSDT")
  private toBinanceSymbol(symbol: string): string | null {
    // Check if we have a mapping
    const binanceSymbolMap: Record<string, string> = {
      'BTC/USD': 'BTCUSDT',
      'ETH/USD': 'ETHUSDT',
      'BNB/USD': 'BNBUSDT',
      'SOL/USD': 'SOLUSDT',
      'ADA/USD': 'ADAUSDT',
      'DOT/USD': 'DOTUSDT',
      'DOGE/USD': 'DOGEUSDT',
      'XRP/USD': 'XRPUSDT',
      'TRX/USD': 'TRXUSDT',
      'LTC/USD': 'LTCUSDT',
      'FIL/USD': 'FILUSDT',
    };
    if (binanceSymbolMap[symbol]) {
      return binanceSymbolMap[symbol];
    }

    // If the symbol looks like a pair (contains '/'), try to convert (e.g. 'BTC/USD' -> 'BTCUSDT')
    if (symbol.includes('/')) {
      return symbol.replace('/', '').replace('USD', 'USDT').toUpperCase();
    }

    // If symbol already appears to be a Binance symbol (ends with USDT), return uppercased
    if (symbol.toUpperCase().endsWith('USDT')) {
      return symbol.toUpperCase();
    }

    // Unknown/non-crypto symbols (e.g. ETF or US stock tickers like 'QQQ') are not supported on Binance
    return null;
  }

  // Convert symbol to Binance stream format (e.g., "BTC/USD" -> "btcusdt")
  private toBinanceStreamSymbol(symbol: string): string | null {
    const binance = this.toBinanceSymbol(symbol);
    return binance ? binance.toLowerCase() : null;
  }

  // Fetch historical candlestick data
  async fetchCandles(
    symbol: string,
    interval: string = '15m',
    limit: number = 100
  ): Promise<CandleData[]> {
    const binanceSymbol = this.toBinanceSymbol(symbol);
    if (!binanceSymbol) {
      console.warn(`Symbol ${symbol} not supported on Binance`);
      return [];
    }
    
    const binanceInterval = this.mapInterval(interval);
    const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${binanceInterval}&limit=${limit}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Binance API error for ${symbol} (${binanceSymbol}):`, response.status, errorText);
        return [];
      }
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.error('Invalid response from Binance API:', data);
        return [];
      }
      
      return data.map((kline: any[]) => ({
        time: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));
    } catch (error) {
      console.error('Error fetching candles:', error);
      return [];
    }
  }

  // Connect to real-time price stream
  connectPriceStream(
    symbol: string,
    callback: (update: PriceUpdate) => void
  ) {
    // Only disconnect if symbol changed
    if (this.currentSymbol !== symbol && this.priceWs) {
      this.disconnectPriceStream();
    }
    
    // Don't reset attempts if we're reconnecting
    if (!this.priceWs) {
      this.reconnectAttempts.price = 0;
    }
    
    const binanceSymbol = this.toBinanceStreamSymbol(symbol);
    if (!binanceSymbol) {
      console.warn(`Cannot connect WebSocket for ${symbol} - symbol not supported`);
      return;
    }
    
    const wsUrl = `wss://stream.binance.com:9443/ws/${binanceSymbol}@ticker`;
    
    try {
      this.priceWs = new WebSocket(wsUrl);
      this.currentSymbol = symbol;
      
      this.priceWs.onopen = () => {
        console.log('Price WebSocket connected');
        this.reconnectAttempts.price = 0;
      };
      
      this.priceWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const currentPrice = parseFloat(data.c);
          const openPrice = parseFloat(data.o);
          const high24h = parseFloat(data.h);
          const low24h = parseFloat(data.l);
          const change24h = ((currentPrice - openPrice) / openPrice) * 100;
          
          callback({
            price: currentPrice,
            change24h,
            high24h,
            low24h,
          });
        } catch (error) {
          console.error('Error parsing price data:', error);
        }
      };
      
      this.priceWs.onerror = (error) => {
        console.error('WebSocket price error:', error);
        // Don't reconnect on error, let onclose handle it
      };
      
      this.priceWs.onclose = (event) => {
        // Don't reconnect if it was a normal closure (code 1000) or if we manually closed it
        if (event.code === 1000 || event.code === 1001) {
          console.log('Price WebSocket closed normally', event.code);
          return;
        }
        
        console.log('Price WebSocket closed unexpectedly', event.code, event.reason);
        if (this.reconnectAttempts.price < this.maxReconnectAttempts) {
          this.reconnectPriceStream(symbol, callback);
        } else {
          console.log('Max reconnection attempts reached for price stream');
        }
      };
    } catch (error) {
      console.error('Error creating price WebSocket:', error);
      if (this.reconnectAttempts.price < this.maxReconnectAttempts) {
        this.reconnectPriceStream(symbol, callback);
      }
    }
  }

  // Connect to real-time candlestick stream
  connectCandleStream(
    symbol: string,
    interval: string,
    callback: (candle: CandleData) => void
  ) {
    // Only disconnect if symbol or interval changed
    if ((this.currentSymbol !== symbol || this.currentInterval !== interval) && this.candleWs) {
      this.disconnectCandleStream();
    }
    
    // Don't reset attempts if we're reconnecting
    if (!this.candleWs) {
      this.reconnectAttempts.candle = 0;
    }
    
    const binanceSymbol = this.toBinanceStreamSymbol(symbol);
    if (!binanceSymbol) {
      console.warn(`Cannot connect WebSocket for ${symbol} - symbol not supported`);
      return;
    }
    
    const binanceInterval = this.mapInterval(interval);
    const wsUrl = `wss://stream.binance.com:9443/ws/${binanceSymbol}@kline_${binanceInterval}`;
    
    try {
      this.candleWs = new WebSocket(wsUrl);
      this.currentSymbol = symbol;
      this.currentInterval = interval;
      
      this.candleWs.onopen = () => {
        console.log('Candle WebSocket connected');
        this.reconnectAttempts.candle = 0;
      };
      
      this.candleWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const kline = data.k;
          
          // Only process closed candles or update current candle
          callback({
            time: kline.t,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
            volume: parseFloat(kline.v),
          });
        } catch (error) {
          console.error('Error parsing candle data:', error);
        }
      };
      
      this.candleWs.onerror = (error) => {
        console.error('WebSocket candle error:', error);
        // Don't reconnect on error, let onclose handle it
      };
      
      this.candleWs.onclose = (event) => {
        // Don't reconnect if it was a normal closure (code 1000) or if we manually closed it
        if (event.code === 1000 || event.code === 1001) {
          console.log('Candle WebSocket closed normally', event.code);
          return;
        }
        
        console.log('Candle WebSocket closed unexpectedly', event.code, event.reason);
        if (this.reconnectAttempts.candle < this.maxReconnectAttempts) {
          this.reconnectCandleStream(symbol, interval, callback);
        } else {
          console.log('Max reconnection attempts reached for candle stream');
        }
      };
    } catch (error) {
      console.error('Error creating candle WebSocket:', error);
      if (this.reconnectAttempts.candle < this.maxReconnectAttempts) {
        this.reconnectCandleStream(symbol, interval, callback);
      }
    }
  }

  private reconnectPriceStream(
    symbol: string,
    callback: (update: PriceUpdate) => void
  ) {
    if (this.priceReconnectTimeout) return;
    
    this.reconnectAttempts.price++;
    const delay = Math.min(3000 * this.reconnectAttempts.price, 30000); // Max 30 seconds
    
    console.log(`Reconnecting price stream (attempt ${this.reconnectAttempts.price}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    this.priceReconnectTimeout = setTimeout(() => {
      this.priceReconnectTimeout = null;
      this.connectPriceStream(symbol, callback);
    }, delay);
  }

  private reconnectCandleStream(
    symbol: string,
    interval: string,
    callback: (candle: CandleData) => void
  ) {
    if (this.candleReconnectTimeout) return;
    
    this.reconnectAttempts.candle++;
    const delay = Math.min(3000 * this.reconnectAttempts.candle, 30000); // Max 30 seconds
    
    console.log(`Reconnecting candle stream (attempt ${this.reconnectAttempts.candle}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    this.candleReconnectTimeout = setTimeout(() => {
      this.candleReconnectTimeout = null;
      this.connectCandleStream(symbol, interval, callback);
    }, delay);
  }

  disconnectPriceStream() {
    if (this.priceReconnectTimeout) {
      clearTimeout(this.priceReconnectTimeout);
      this.priceReconnectTimeout = null;
    }
    if (this.priceWs) {
      // Remove listeners to prevent reconnection
      this.priceWs.onclose = null;
      this.priceWs.onerror = null;
      this.priceWs.close(1000, 'Manual disconnect');
      this.priceWs = null;
    }
    this.reconnectAttempts.price = 0;
  }

  disconnectCandleStream() {
    if (this.candleReconnectTimeout) {
      clearTimeout(this.candleReconnectTimeout);
      this.candleReconnectTimeout = null;
    }
    if (this.candleWs) {
      // Remove listeners to prevent reconnection
      this.candleWs.onclose = null;
      this.candleWs.onerror = null;
      this.candleWs.close(1000, 'Manual disconnect');
      this.candleWs = null;
    }
    this.reconnectAttempts.candle = 0;
  }

  disconnect() {
    this.disconnectPriceStream();
    this.disconnectCandleStream();
  }
}

export const marketDataService = new MarketDataService();
export type { CandleData, PriceUpdate };
