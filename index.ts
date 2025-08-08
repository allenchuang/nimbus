// Core bot classes
export { TradingBot, GridBot } from "./core/TradingBot"; // GridBot is an alias for backward compatibility

// Strategy system
export {
  StrategyFactory,
  BotType,
  BOT_TYPE,
  TradingBotConfig,
} from "./core/strategies/StrategyFactory";
export {
  ITradingStrategy,
  StrategyConfig,
  StrategyState,
} from "./core/strategies/ITradingStrategy";
export { GridStrategy } from "./core/strategies/GridStrategy";
export { MartingaleStrategy } from "./core/strategies/MartingaleStrategy";
export { DCAStrategy } from "./core/strategies/DCAStrategy";
export { PortfolioStrategy } from "./core/strategies/PortfolioStrategy";

// Grid level generation utilities are now in utils folder

// All types are now exported from the consolidated types folder
export type * from "./types";

// Exchange implementations
export {
  HyperliquidExchange,
  HyperliquidConfig,
} from "./exchanges/HyperliquidExchange";

// Factory for creating exchanges
export {
  ExchangeFactory,
  SupportedExchange,
  ExchangeFactoryConfig,
} from "./factories/ExchangeFactory";
