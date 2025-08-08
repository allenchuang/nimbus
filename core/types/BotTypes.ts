export interface GridConfig {
  symbol: string;
  gridSpacing: number; // Percentage spacing between grid levels (e.g., 0.5 for 0.5%)
  gridQuantity: number; // Total number of grid levels (buy + sell)
  investmentAmount: number; // Total capital to allocate
  upperBound?: number; // Optional upper bound price
  lowerBound?: number; // Optional lower bound price
  basePrice?: number; // Base price to center the grid around
  maxPosition: number; // Maximum position size
  stopLoss?: number; // Stop loss percentage
  takeProfit?: number; // Take profit percentage
  gridMode?: "arithmetic" | "geometric"; // Grid spacing mode (default: arithmetic)
  activeLevels?: number; // NEW: Number of buy/sell grid levels to keep active at once
  metadata?: {
    // Bot configuration metadata
    investment_type?: "usd" | "asset";
    [key: string]: any; // Allow other metadata properties
  };
}

export interface GridLevel {
  price: number;
  orderId?: string | number;
  filled: boolean;
  size: number;
  filledSize?: number;
  side?: "buy" | "sell"; // Added side property for compatibility
}

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

export interface BotConfiguration {
  id: string;
  userId: string;
  exchangeApiId: string;
  gridConfig: GridConfig;
  isTestnet: boolean;
  status: BotStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type BotStatus = "running" | "stopped" | "error";

export interface CreateBotRequest {
  gridConfig: GridConfig;
  exchangeConfig: ExchangeConfiguration;
  userId?: string;
}

export interface ExchangeConfiguration {
  exchange: string;
  config: any;
}

export interface BotError {
  message: string;
  timestamp: Date;
  type: "startup" | "runtime" | "connection" | "order_placement";
  details?: any;
}
