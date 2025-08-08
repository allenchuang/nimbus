import type { IExchange } from "../../types";
import { ITradingStrategy, StrategyConfig } from "./ITradingStrategy";
import { GridStrategy } from "./GridStrategy";
import { MartingaleStrategy } from "./MartingaleStrategy";
import { DCAStrategy } from "./DCAStrategy";
import { PortfolioStrategy } from "./PortfolioStrategy";

// Bot type constants
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

export interface TradingBotConfig extends StrategyConfig {
  botType: BotType;
}

export class StrategyFactory {
  static createStrategy(
    exchange: IExchange,
    config: TradingBotConfig,
    botId?: string,
    userId?: string
  ): ITradingStrategy {
    console.log(`🏭 Creating ${config.botType} strategy for ${config.symbol}`);

    switch (config.botType) {
      case BOT_TYPE.GRID:
        return new GridStrategy(exchange, config, botId, userId);

      case BOT_TYPE.MARTINGALE:
        return new MartingaleStrategy(exchange, config, botId, userId);

      case BOT_TYPE.DCA:
        return new DCAStrategy(exchange, config, botId, userId);

      case BOT_TYPE.ARBITRAGE:
        console.log(
          "⚠️ Arbitrage strategy not yet implemented, using placeholder"
        );
        return new PlaceholderStrategy(
          exchange,
          config,
          "Arbitrage",
          botId,
          userId
        );

      case BOT_TYPE.PORTFOLIO:
        return new PortfolioStrategy(exchange, config, botId, userId);

      case BOT_TYPE.FLYWHEEL:
        console.log(
          "⚠️ Flywheel strategy not yet implemented, using placeholder"
        );
        return new PlaceholderStrategy(
          exchange,
          config,
          "Flywheel",
          botId,
          userId
        );

      case BOT_TYPE.TWAP_VWAP:
        console.log(
          "⚠️ TWAP/VWAP strategy not yet implemented, using placeholder"
        );
        return new PlaceholderStrategy(
          exchange,
          config,
          "TWAP/VWAP",
          botId,
          userId
        );

      case BOT_TYPE.SIGNAL:
        console.log(
          "⚠️ Signal strategy not yet implemented, using placeholder"
        );
        return new PlaceholderStrategy(
          exchange,
          config,
          "Signal",
          botId,
          userId
        );

      default:
        throw new Error(`Unsupported bot type: ${config.botType}`);
    }
  }

  static getSupportedStrategies(): {
    type: BotType;
    name: string;
    implemented: boolean;
  }[] {
    return [
      { type: BOT_TYPE.GRID, name: "Grid Trading", implemented: true },
      {
        type: BOT_TYPE.MARTINGALE,
        name: "Martingale (Trailing Buy)",
        implemented: true,
      },
      { type: BOT_TYPE.DCA, name: "Dollar Cost Averaging", implemented: true },
      { type: BOT_TYPE.ARBITRAGE, name: "Smart Arbitrage", implemented: false },
      { type: BOT_TYPE.PORTFOLIO, name: "Smart Portfolio", implemented: true },
      { type: BOT_TYPE.FLYWHEEL, name: "Flywheel", implemented: false },
      {
        type: BOT_TYPE.TWAP_VWAP,
        name: "TWAP/VWAP/Iceberg",
        implemented: false,
      },
      {
        type: BOT_TYPE.SIGNAL,
        name: "TradingView Signal Bot",
        implemented: false,
      },
    ];
  }
}

// Placeholder strategy for unimplemented bot types
import { BaseTradingStrategy } from "./ITradingStrategy";
import { OrderFill } from "../../interfaces/IExchange";
import { HyperliquidOrderFill } from "../../exchanges/HyperliquidExchange";

class PlaceholderStrategy extends BaseTradingStrategy {
  private strategyName: string;

  constructor(
    exchange: IExchange,
    config: StrategyConfig,
    strategyName: string,
    botId?: string,
    userId?: string
  ) {
    super(exchange, config, botId, userId);
    this.strategyName = strategyName;
  }

  async initialize(): Promise<void> {
    console.log(
      `🚀 Initializing ${this.strategyName} Strategy for ${this.config.symbol}...`
    );

    if (!this.exchange.isConnected()) {
      await this.exchange.connect();
    }

    const currentPrice = await this.exchange.getCurrentPrice(
      this.config.symbol
    );
    this.state.currentPrice = currentPrice;

    console.log(
      `⚠️ ${this.strategyName} strategy is not yet implemented - this is a placeholder`
    );
    this.emit("initialized");
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`⚠️ ${this.strategyName} strategy is already running`);
      return;
    }

    console.log(`🤖 Starting ${this.strategyName} Trading Strategy...`);
    console.log(
      `⚠️ ${this.strategyName} strategy is not yet implemented - bot will remain idle`
    );

    this.isRunning = true;
    this.state.isActive = true;

    this.emit("started");
  }

  async stop(): Promise<void> {
    console.log(`🛑 Stopping ${this.strategyName} Trading Strategy...`);

    this.isRunning = false;
    this.state.isActive = false;

    console.log(`✅ ${this.strategyName} Trading Strategy stopped`);
    this.emit("stopped");
  }

  async handleOrderFill(fill: OrderFill | HyperliquidOrderFill): Promise<void> {
    if (!this.isRunning || fill.symbol !== this.config.symbol) return;

    console.log(
      `📈 ${this.strategyName} fill received: ${fill.side} ${fill.size} @ $${fill.price}`
    );
    console.log(
      `⚠️ ${this.strategyName} order processing is not yet implemented`
    );

    // Update basic metrics
    this.updateVolumeMetrics(fill);
    this.emit("orderFilled", { fill });
  }

  getStatistics() {
    const baseStats = super.getStatistics();
    return {
      ...baseStats,
      strategyType: this.strategyName.toLowerCase(),
      implemented: false, // Flag to indicate this is a placeholder
    };
  }
}
