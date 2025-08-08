import { EventEmitter } from "events";
import { IExchange, OrderFill } from "../../interfaces/IExchange";
import { HyperliquidOrderFill } from "../../exchanges/HyperliquidExchange";

export interface StrategyConfig {
  symbol: string;
  investmentSize: number;
  investmentType?: "usd" | "asset"; // Default: "usd"
  maxPosition: number;
  stopLoss?: number;
  takeProfit?: number;
  metadata?: any; // Bot-specific configuration
}

export interface StrategyState {
  isActive: boolean;
  currentPrice: number;
  totalPosition: number;
  profits: number;
  trades: number;
  volume: {
    totalVolume: number;
    buyVolume: number;
    sellVolume: number;
    totalVolumeUSD: number;
    buyVolumeUSD: number;
    sellVolumeUSD: number;
  };
}

export interface ITradingStrategy extends EventEmitter {
  /**
   * Initialize the strategy
   */
  initialize(): Promise<void>;

  /**
   * Start the trading strategy
   */
  start(): Promise<void>;

  /**
   * Stop the trading strategy
   */
  stop(): Promise<void>;

  /**
   * Handle order fills
   */
  handleOrderFill(fill: OrderFill | HyperliquidOrderFill): Promise<void>;

  /**
   * Handle price updates
   */
  handlePriceUpdate?(price: number): Promise<void>;

  /**
   * Get current strategy state
   */
  getState(): StrategyState;

  /**
   * Check if strategy is active
   */
  isActive(): boolean;

  /**
   * Update strategy configuration
   */
  updateConfig(newConfig: Partial<StrategyConfig>): Promise<void>;

  /**
   * Get strategy statistics
   */
  getStatistics(): any;

  /**
   * Get exchange instance
   */
  getExchange(): IExchange;
}

export abstract class BaseTradingStrategy
  extends EventEmitter
  implements ITradingStrategy
{
  protected exchange: IExchange;
  protected config: StrategyConfig;
  protected state: StrategyState;
  protected isRunning = false;
  protected botId?: string;
  protected userId?: string;

  constructor(
    exchange: IExchange,
    config: StrategyConfig,
    botId?: string,
    userId?: string
  ) {
    super();
    this.exchange = exchange;
    this.config = config;
    this.botId = botId;
    this.userId = userId;

    this.state = {
      isActive: false,
      currentPrice: 0,
      totalPosition: 0,
      profits: 0,
      trades: 0,
      volume: {
        totalVolume: 0,
        buyVolume: 0,
        sellVolume: 0,
        totalVolumeUSD: 0,
        buyVolumeUSD: 0,
        sellVolumeUSD: 0,
      },
    };
  }

  abstract initialize(): Promise<void>;
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract handleOrderFill(
    fill: OrderFill | HyperliquidOrderFill
  ): Promise<void>;

  getState(): StrategyState {
    return { ...this.state };
  }

  isActive(): boolean {
    return this.isRunning && this.state.isActive;
  }

  getExchange(): IExchange {
    return this.exchange;
  }

  async updateConfig(newConfig: Partial<StrategyConfig>): Promise<void> {
    if (this.isRunning) {
      await this.stop();
    }

    this.config = { ...this.config, ...newConfig };

    if (this.isRunning) {
      await this.start();
    }
  }

  getStatistics(): any {
    return {
      totalTrades: this.state.trades,
      totalProfits: this.state.profits,
      currentPosition: this.state.totalPosition,
      volume: this.state.volume,
    };
  }

  protected updateVolumeMetrics(fill: OrderFill | HyperliquidOrderFill): void {
    const volumeUSD = fill.size * fill.price;
    this.state.volume.totalVolume += fill.size;
    this.state.volume.totalVolumeUSD += volumeUSD;

    if (fill.side === "buy") {
      this.state.volume.buyVolume += fill.size;
      this.state.volume.buyVolumeUSD += volumeUSD;
    } else {
      this.state.volume.sellVolume += fill.size;
      this.state.volume.sellVolumeUSD += volumeUSD;
    }

    this.state.trades++;
  }
}
