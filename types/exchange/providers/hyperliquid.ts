import type { OrderFill } from "../core";

export interface HyperliquidConfig {
  privateKey?: string;
  testnet?: boolean;
  baseURL?: string;
}

export interface HyperliquidOrderFill extends OrderFill {
  // Hyperliquid-specific fields
  exchangeTradeId?: string;
  exchangeHash?: string;
  startPosition?: string;
  direction?: string;
  crossed?: boolean;
}
