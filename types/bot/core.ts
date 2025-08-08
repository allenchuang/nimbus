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

// Forward declaration - GridConfig is defined in trading/grid.ts
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
