// Forward declaration - IExchange is defined in exchange/core.ts
interface IExchange {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  placeOrder(request: any): Promise<any>;
  cancelOrder(request: any): Promise<any>;
  getOpenOrders(symbol?: string): Promise<any[]>;
  getBalance(asset?: string): Promise<any[]>;
  getPosition(symbol: string): Promise<any>;
  subscribeToPriceUpdates(
    symbol: string,
    callback: (update: any) => void
  ): Promise<void>;
  subscribeToOrderFills(callback: (fill: any) => void): Promise<void>;
}

export interface StrategyConfig {
  symbol: string;
  [key: string]: any; // Allow strategy-specific config
}

export interface StrategyState {
  isActive: boolean;
  currentPrice: number;
  totalPosition: number;
  profits: number;
  trades: number;
  strategyType: string;
  [key: string]: any; // Allow strategy-specific state
}

export interface ITradingStrategy {
  start(): Promise<void>;
  stop(): Promise<void>;
  getState(): StrategyState;
  handlePriceUpdate(price: number): Promise<void>;
  handleOrderFill(fill: any): Promise<void>;
}

export abstract class BaseTradingStrategy implements ITradingStrategy {
  protected exchange: IExchange;
  protected config: StrategyConfig;
  protected state: StrategyState;

  constructor(exchange: IExchange, config: StrategyConfig) {
    this.exchange = exchange;
    this.config = config;
    this.state = {
      isActive: false,
      currentPrice: 0,
      totalPosition: 0,
      profits: 0,
      trades: 0,
      strategyType: this.getStrategyType(),
    };
  }

  abstract getStrategyType(): string;
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract handlePriceUpdate(price: number): Promise<void>;
  abstract handleOrderFill(fill: any): Promise<void>;

  getState(): StrategyState {
    return { ...this.state };
  }
}

// Trading bot configuration for strategy factory
export interface TradingBotConfig {
  botType: BotType;
  symbol: string;
  metadata: any; // Strategy-specific metadata
}

// Bot type constants and types
export const BOT_TYPE = {
  GRID: "grid",
  MARTINGALE: "martingale",
  DCA: "dca",
  ARBITRAGE: "arbitrage",
  PORTFOLIO: "portfolio",
  FLYWHEEL: "flywheel",
  TWAP_VWAP: "twap_vwap",
  SIGNAL: "signal",
} as const;

export type BotType = (typeof BOT_TYPE)[keyof typeof BOT_TYPE];
