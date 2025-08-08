// Factory types
export interface ExchangeFactoryConfig {
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string;
  testnet?: boolean;
  [key: string]: any;
}

export type SupportedExchange = "hyperliquid" | "backpack";

// Order size calculation types - maps directly to convertUSDToAsset() arguments
export interface BaseOrderSizeConfig {
  usdAmount: number;
  currentPrice: number;
  symbol: string;
  szDecimals?: number;
}

// Extends StrategyConfig for strategy-specific order size calculations
export interface StrategyOrderSizeConfig {
  investmentSize: number;
  investmentType?: "usd" | "asset";
  symbol: string;
  currentPrice: number;
  szDecimals?: number;
}

export interface GridOrderSizeConfig extends StrategyOrderSizeConfig {
  gridQuantity: number;
  gridMode?: "arithmetic" | "geometric";
}

export interface DCAOrderSizeConfig extends StrategyOrderSizeConfig {
  minOrderSize?: number;
  maxOrderSize?: number;
}

export interface MartingaleOrderSizeConfig extends StrategyOrderSizeConfig {
  orderNumber: number;
  stepMultiplier?: number;
}

export interface PortfolioOrderSizeConfig extends StrategyOrderSizeConfig {
  targetAllocation: number;
  currentAllocation: number;
}

export interface OrderSizeResult {
  orderSize: number;
  totalBaseAmount: number;
  calculationDetails: string;
}
