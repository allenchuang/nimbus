import { EventEmitter } from "events";
import type {
  IExchange,
  OrderFill,
  GridConfig,
  GridState,
  TradeMetricsLogger,
  OrderMetadataUpdater,
  HyperliquidOrderFill,
} from "../types";
import {
  ITradingStrategy,
  StrategyConfig,
} from "./strategies/ITradingStrategy";
import {
  StrategyFactory,
  TradingBotConfig,
  BotType,
  BOT_TYPE,
} from "./strategies/StrategyFactory";

/**
 * TradingBot - A generic trading bot that supports multiple strategies
 *
 * It uses the strategy pattern to support different trading algorithms:
 * - Grid trading (fully implemented)
 * - Martingale, DCA, Arbitrage, etc. (placeholders for now)
 */
export class TradingBot extends EventEmitter {
  private strategy: ITradingStrategy;
  private metricsLogger?: TradeMetricsLogger;
  private orderMetadataUpdater?: OrderMetadataUpdater;
  private botId?: string;
  private userId?: string;

  // Legacy compatibility properties
  private legacyConfig?: GridConfig;

  constructor(
    exchange: IExchange,
    config: GridConfig | TradingBotConfig,
    metricsLogger?: TradeMetricsLogger,
    botId?: string,
    userId?: string,
    orderMetadataUpdater?: OrderMetadataUpdater
  ) {
    super();

    this.metricsLogger = metricsLogger;
    this.orderMetadataUpdater = orderMetadataUpdater;
    this.botId = botId;
    this.userId = userId;

    // Determine if this is a legacy GridConfig or new TradingBotConfig
    const strategyConfig = this.normalizeConfig(config);

    // Create the appropriate strategy
    this.strategy = StrategyFactory.createStrategy(
      exchange,
      strategyConfig,
      botId,
      userId
    );

    // Forward strategy events
    this.setupStrategyEventHandlers();
  }

  /**
   * Convert legacy GridConfig to new TradingBotConfig format
   * This ensures backward compatibility with existing grid bots
   */
  private normalizeConfig(
    config: GridConfig | TradingBotConfig
  ): TradingBotConfig {
    // Check if it's already a TradingBotConfig
    if ("botType" in config) {
      return config as TradingBotConfig;
    }

    // Convert legacy GridConfig to TradingBotConfig
    const gridConfig = config as GridConfig;
    this.legacyConfig = gridConfig; // Store for compatibility

    console.log("🔄 Converting legacy GridConfig to TradingBotConfig format");

    return {
      botType: BOT_TYPE.GRID,
      symbol: gridConfig.symbol,
      investmentSize: gridConfig.investmentSize,
      maxPosition: gridConfig.maxPosition,
      stopLoss: gridConfig.stopLoss,
      takeProfit: gridConfig.takeProfit,
      metadata: {
        // Grid-specific metadata
        grid_spacing: gridConfig.gridSpacing,
        grid_quantity: gridConfig.gridQuantity,
        grid_mode: gridConfig.gridMode,
        upper_bound: gridConfig.upperBound,
        lower_bound: gridConfig.lowerBound,
        active_levels: gridConfig.activeLevels,
        base_price: gridConfig.basePrice,

        // Legacy compatibility fields
        gridSpacing: gridConfig.gridSpacing,
        gridQuantity: gridConfig.gridQuantity,
        gridMode: gridConfig.gridMode,
        upperBound: gridConfig.upperBound,
        lowerBound: gridConfig.lowerBound,
        activeLevels: gridConfig.activeLevels,
        basePrice: gridConfig.basePrice,
      },
    };
  }

  private setupStrategyEventHandlers(): void {
    // Forward all strategy events to maintain compatibility
    this.strategy.on("initialized", () => this.emit("initialized"));
    this.strategy.on("started", () => this.emit("started"));
    this.strategy.on("stopped", () => this.emit("stopped"));
    this.strategy.on("error", (error) => this.emit("error", error));
    this.strategy.on("orderFilled", (data) => {
      // Add logging and metadata updates for backward compatibility
      this.handleOrderFillLogging(data.fill);
      this.emit("orderFilled", data);
    });
  }

  /**
   * Initialize the trading bot
   */
  async initialize(): Promise<void> {
    try {
      console.log(`🚀 Initializing Trading Bot (${this.getBotType()})...`);
      await this.strategy.initialize();
    } catch (error) {
      console.error("❌ Failed to initialize trading bot:", error);
      throw error;
    }
  }

  /**
   * Start the trading bot
   */
  async start(): Promise<void> {
    try {
      await this.strategy.start();
    } catch (error) {
      console.error("❌ Failed to start trading bot:", error);
      throw error;
    }
  }

  /**
   * Stop the trading bot
   */
  async stop(): Promise<void> {
    try {
      await this.strategy.stop();
    } catch (error) {
      console.error("❌ Failed to stop trading bot:", error);
      throw error;
    }
  }

  /**
   * Update bot configuration
   */
  async updateConfig(
    newConfig: Partial<GridConfig> | Partial<TradingBotConfig>
  ): Promise<void> {
    try {
      // Convert to strategy config format
      let strategyUpdate: Partial<StrategyConfig>;

      if (this.legacyConfig && !("botType" in newConfig)) {
        // Legacy update - convert GridConfig changes
        const gridUpdate = newConfig as Partial<GridConfig>;
        strategyUpdate = {
          symbol: gridUpdate.symbol,
          investmentSize: gridUpdate.investmentSize,
          maxPosition: gridUpdate.maxPosition,
          stopLoss: gridUpdate.stopLoss,
          takeProfit: gridUpdate.takeProfit,
          metadata: {
            ...gridUpdate,
            // Convert field names for consistency
            grid_spacing: gridUpdate.gridSpacing,
            grid_quantity: gridUpdate.gridQuantity,
            grid_mode: gridUpdate.gridMode,
            upper_bound: gridUpdate.upperBound,
            lower_bound: gridUpdate.lowerBound,
            active_levels: gridUpdate.activeLevels,
          },
        };
      } else {
        // New format update
        strategyUpdate = newConfig as Partial<StrategyConfig>;
      }

      await this.strategy.updateConfig(strategyUpdate);

      // Update legacy config if it exists
      if (this.legacyConfig) {
        this.legacyConfig = {
          ...this.legacyConfig,
          ...(newConfig as Partial<GridConfig>),
        };
      }
    } catch (error) {
      console.error("❌ Failed to update bot config:", error);
      throw error;
    }
  }

  /**
   * Get current bot state - maintains backward compatibility
   */
  getState(): GridState {
    const strategyState = this.strategy.getState();

    // Convert strategy state to legacy GridState format for backward compatibility
    return {
      config: this.legacyConfig || {
        symbol: strategyState.currentPrice ? "UNKNOWN" : "UNKNOWN",
        gridSpacing: 0.01,
        gridQuantity: 10,
        investmentSize: 1000,
        maxPosition: 5000,
      },
      levels: [], // Strategy doesn't expose levels in this format
      currentPrice: strategyState.currentPrice,
      totalPosition: strategyState.totalPosition,
      isActive: strategyState.isActive,
      profits: strategyState.profits,
      trades: strategyState.trades,
      volume: strategyState.volume,
    };
  }

  /**
   * Check if bot is active
   */
  isActive(): boolean {
    return this.strategy.isActive();
  }

  /**
   * Get exchange instance
   */
  getExchange(): IExchange {
    return this.strategy.getExchange();
  }

  /**
   * Update bot ID
   */
  updateBotId(newBotId: string): void {
    console.log(`🔄 Updating bot ID from ${this.botId} to ${newBotId}`);
    this.botId = newBotId;
  }

  /**
   * Get bot statistics
   */
  getStatistics() {
    return this.strategy.getStatistics();
  }

  /**
   * Get bot type
   */
  getBotType(): string {
    const stats = this.strategy.getStatistics();
    return stats.strategyType || "grid";
  }

  /**
   * Handle order fill logging and metadata updates
   * This maintains backward compatibility with existing logging systems
   */
  private async handleOrderFillLogging(
    fill: OrderFill | HyperliquidOrderFill
  ): Promise<void> {
    try {
      // Log trade to database if available
      if (this.metricsLogger?.logTrade && this.botId && this.userId) {
        await this.logTradeToDatabase(fill);
      }

      // Update order metadata if available
      if (
        this.orderMetadataUpdater?.updateOrderMetadata &&
        this.botId &&
        this.userId
      ) {
        await this.updateOrderMetadata();
      }
    } catch (error) {
      console.error("❌ Failed to handle order fill logging:", error);
    }
  }

  private async logTradeToDatabase(
    fill: OrderFill | HyperliquidOrderFill
  ): Promise<void> {
    if (!this.metricsLogger?.logTrade || !this.botId || !this.userId) return;

    try {
      const volumeUSD = fill.size * fill.price;
      let actualFee: number;

      // Check if it's a Hyperliquid fill with fee information
      if ("fee" in fill) {
        actualFee = parseFloat(fill.fee);
      } else {
        actualFee = fill.price * fill.size * 0.0002; // Estimate
      }

      await this.metricsLogger.logTrade({
        botId: this.botId,
        userId: this.userId,
        symbol: fill.symbol,
        side: fill.side,
        price: fill.price,
        size: fill.size,
        orderId: fill.orderId?.toString(),
        fee: actualFee,
        role: "maker",
        sizeUsd: volumeUSD,
        // Add Hyperliquid-specific fields if available
        ...("tid" in fill && {
          exchangeTradeId: fill.tid.toString(),
          exchangeHash: fill.hash,
          startPosition: fill.startPosition,
          direction: fill.dir,
          crossed: fill.crossed,
        }),
      });
    } catch (error) {
      console.error("❌ Failed to log trade:", error);
    }
  }

  private async updateOrderMetadata(): Promise<void> {
    if (
      !this.orderMetadataUpdater?.updateOrderMetadata ||
      !this.botId ||
      !this.userId
    )
      return;

    try {
      const currentState = this.strategy.getState();

      // This is a simplified version - full implementation would need strategy-specific order data
      await this.orderMetadataUpdater.updateOrderMetadata({
        botId: this.botId,
        orders: [], // Strategy doesn't expose order details in this format
        currentPrice: currentState.currentPrice,
      });
    } catch (error) {
      console.error("❌ Failed to update order metadata:", error);
    }
  }
}

// Export GridBot as an alias for backward compatibility
export const GridBot = TradingBot;

// Export for backward compatibility
export { TradingBot as default };
