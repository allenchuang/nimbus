export interface VolumeMetrics {
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  totalVolumeUSD: number;
  buyVolumeUSD: number;
  sellVolumeUSD: number;
}

export interface GridState {
  config: GridConfig;
  levels: GridLevel[];
  currentPrice: number;
  totalPosition: number;
  isActive: boolean;
  profits: number;
  trades: number;
  volume: VolumeMetrics;
}

export interface TradeMetricsLogger {
  logTrade?: (data: {
    botId: string;
    userId: string;
    symbol: string;
    side: "buy" | "sell";
    price: number;
    size: number;
    orderId?: string;
    latencyMs?: number;
    pnl?: number;
    fee?: number;
    role?: "maker" | "taker";
    sizeUsd?: number;
    // Hyperliquid-specific fields
    exchangeTradeId?: string;
    exchangeHash?: string;
    startPosition?: string;
    direction?: string;
    crossed?: boolean;
  }) => Promise<void>;
}

export interface OrderMetadataUpdater {
  updateOrderMetadata?: (data: {
    botId: string;
    orders: Array<{
      orderId: string | number;
      symbol: string;
      side?: "buy" | "sell"; // Make side optional
      price: number;
      size: number;
      timestamp: string;
    }>;
    currentPrice: number;
  }) => Promise<void>;
}

// Forward declarations - these are defined in trading/grid.ts
interface GridConfig {
  symbol: string;
  gridSpacing: number;
  gridQuantity: number;
  investmentAmount: number;
  upperBound?: number;
  lowerBound?: number;
  basePrice?: number;
  maxPosition: number;
  stopLoss?: number;
  takeProfit?: number;
  gridMode?: "arithmetic" | "geometric";
  activeLevels?: number;
  metadata?: {
    investment_type?: "usd" | "asset";
    [key: string]: any;
  };
}

interface GridLevel {
  price: number;
  orderId?: string | number;
  filled: boolean;
  size: number;
  filledSize?: number;
  side?: "buy" | "sell";
}
