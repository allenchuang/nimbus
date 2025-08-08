import type { IExchange, ExchangeConfig } from "../types";
import {
  HyperliquidExchange,
  HyperliquidConfig,
} from "../exchanges/HyperliquidExchange";

export type SupportedExchange = "hyperliquid" | "backpack";

export interface ExchangeFactoryConfig {
  exchange: SupportedExchange;
  config: ExchangeConfig;
}

export class ExchangeFactory {
  static create(
    exchangeName: SupportedExchange,
    config: ExchangeConfig
  ): IExchange {
    switch (exchangeName.toLowerCase()) {
      case "hyperliquid":
        return new HyperliquidExchange(config as HyperliquidConfig);

      case "backpack":
        throw new Error("Backpack exchange not implemented yet");

      default:
        throw new Error(`Unsupported exchange: ${exchangeName}`);
    }
  }

  static getSupportedExchanges(): SupportedExchange[] {
    return ["hyperliquid"];
  }

  static validateConfig(
    exchangeName: SupportedExchange,
    config: ExchangeConfig
  ): void {
    switch (exchangeName.toLowerCase()) {
      case "hyperliquid":
        const hyperliquidConfig = config as HyperliquidConfig;
        if (!hyperliquidConfig.walletAddress) {
          throw new Error("Hyperliquid requires walletAddress in config");
        }
        if (!hyperliquidConfig.privateKey) {
          throw new Error("Hyperliquid requires privateKey in config");
        }
        break;

      case "backpack":
        throw new Error("Backpack exchange not implemented yet");

      default:
        throw new Error(`Unsupported exchange: ${exchangeName}`);
    }
  }
}
