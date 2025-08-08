// Factory types
export interface ExchangeFactoryConfig {
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string;
  testnet?: boolean;
  [key: string]: any;
}

export type SupportedExchange = "hyperliquid" | "backpack";

// Order size calculation types
export interface OrderSizeConfig {
  investmentAmount: number;
  investmentType?: "usd" | "asset";
  gridQuantity?: number;
  currentPrice: number;
  symbol: string;
  szDecimals?: number;
}

export interface OrderSizeResult {
  orderSize: number;
  totalBaseAmount: number;
  calculationDetails: string;
}
