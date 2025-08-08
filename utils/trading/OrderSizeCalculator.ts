import type {
  OrderSizeResult,
  GridOrderSizeConfig,
  DCAOrderSizeConfig,
  MartingaleOrderSizeConfig,
  PortfolioOrderSizeConfig,
  StrategyOrderSizeConfig,
} from "../../types";

/**
 * Round a number to the specified number of decimal places
 */
export function roundToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Convert USD amount to asset quantity at current price
 * This is the most basic conversion function used by all strategies
 */
export function convertUSDToAsset(
  usdAmount: number,
  currentPrice: number,
  symbol: string,
  szDecimals: number = 4
): OrderSizeResult {
  const assetAmount = usdAmount / currentPrice;
  const roundedAmount = roundToDecimals(assetAmount, szDecimals);

  return {
    orderSize: roundedAmount,
    totalBaseAmount: roundedAmount,
    calculationDetails: `$${usdAmount} USD / $${currentPrice} = ${roundedAmount} ${symbol}`,
  };
}

/**
 * Create a StrategyOrderSizeConfig from StrategyConfig and current price
 * This maps StrategyConfig properties to the order size calculation requirements
 */
export function createOrderSizeConfig(
  strategyConfig: {
    investmentSize: number;
    investmentType?: "usd" | "asset";
    symbol: string;
  },
  currentPrice: number,
  szDecimals: number = 4
): StrategyOrderSizeConfig {
  return {
    investmentSize: strategyConfig.investmentSize,
    investmentType: strategyConfig.investmentType || "usd",
    symbol: strategyConfig.symbol,
    currentPrice,
    szDecimals,
  };
}

/**
 * Calculate order size for grid strategies - typed config version
 */
export function calculateGridOrderSize(
  config: GridOrderSizeConfig
): OrderSizeResult;
/**
 * Calculate order size for grid strategies - legacy parameter version
 */
export function calculateGridOrderSize(
  investmentSize: number,
  gridQuantity: number,
  currentPrice: number,
  symbol: string,
  investmentType?: "usd" | "asset",
  szDecimals?: number
): OrderSizeResult;
/**
 * Implementation
 */
export function calculateGridOrderSize(
  configOrInvestmentSize: GridOrderSizeConfig | number,
  gridQuantity?: number,
  currentPrice?: number,
  symbol?: string,
  investmentType: "usd" | "asset" = "usd",
  szDecimals: number = 4
): OrderSizeResult {
  // Handle typed config version
  if (typeof configOrInvestmentSize === "object") {
    const config = configOrInvestmentSize;
    return calculateGridOrderSize(
      config.investmentSize,
      config.gridQuantity,
      config.currentPrice,
      config.symbol,
      config.investmentType,
      config.szDecimals
    );
  }

  // Handle legacy parameter version
  const investmentSize = configOrInvestmentSize;
  if (!gridQuantity || !currentPrice || !symbol) {
    throw new Error(
      "Missing required parameters for legacy calculateGridOrderSize call"
    );
  }

  let totalBaseAmount: number;
  let calculationDetails: string;

  if (investmentType === "usd") {
    // Convert USD investment to base asset using current price
    totalBaseAmount = investmentSize / currentPrice;
    calculationDetails = `$${investmentSize} USD / $${currentPrice} = ${totalBaseAmount.toFixed(
      6
    )} ${symbol}`;
  } else {
    // Investment amount is already in base asset
    totalBaseAmount = investmentSize;
    calculationDetails = `${investmentSize} ${symbol} (already in base asset)`;
  }

  // Calculate order size per grid level
  const orderSize = totalBaseAmount / gridQuantity;

  // Round to appropriate decimal places
  const roundedOrderSize = roundToDecimals(orderSize, szDecimals);

  const finalDetails =
    gridQuantity > 1
      ? `${calculationDetails} / ${gridQuantity} levels = ${roundedOrderSize} ${symbol} per order`
      : calculationDetails;

  return {
    orderSize: roundedOrderSize,
    totalBaseAmount,
    calculationDetails: finalDetails,
  };
}

/**
 * Calculate order size for DCA strategies
 * @param orderSizeUSD - USD amount for each DCA order
 * @param currentPrice - Current asset price
 * @param symbol - Asset symbol
 * @param szDecimals - Decimal places for rounding
 */
export function calculateDCAOrderSize(
  config: DCAOrderSizeConfig
): OrderSizeResult;
export function calculateDCAOrderSize(
  orderSizeUSD: number,
  currentPrice: number,
  symbol: string,
  szDecimals?: number
): OrderSizeResult;
export function calculateDCAOrderSize(
  configOrOrderSizeUSD: DCAOrderSizeConfig | number,
  currentPrice?: number,
  symbol?: string,
  szDecimals: number = 4
): OrderSizeResult {
  // Handle typed config version
  if (typeof configOrOrderSizeUSD === "object") {
    const config = configOrOrderSizeUSD;
    return convertUSDToAsset(
      config.investmentSize,
      config.currentPrice,
      config.symbol,
      config.szDecimals || 4
    );
  }

  // Handle legacy parameter version
  const orderSizeUSD = configOrOrderSizeUSD;
  if (!currentPrice || !symbol) {
    throw new Error(
      "Missing required parameters for legacy calculateDCAOrderSize call"
    );
  }

  return convertUSDToAsset(orderSizeUSD, currentPrice, symbol, szDecimals);
}

/**
 * Calculate order size for martingale strategies
 * @param orderSizeUSD - USD amount for the martingale order
 * @param currentPrice - Current asset price
 * @param symbol - Asset symbol
 * @param szDecimals - Decimal places for rounding
 */
export function calculateMartingaleOrderSize(
  config: MartingaleOrderSizeConfig
): OrderSizeResult;
export function calculateMartingaleOrderSize(
  orderSizeUSD: number,
  currentPrice: number,
  symbol: string,
  szDecimals?: number
): OrderSizeResult;
export function calculateMartingaleOrderSize(
  configOrOrderSizeUSD: MartingaleOrderSizeConfig | number,
  currentPrice?: number,
  symbol?: string,
  szDecimals: number = 4
): OrderSizeResult {
  // Handle typed config version
  if (typeof configOrOrderSizeUSD === "object") {
    const config = configOrOrderSizeUSD;
    const baseOrderSize = config.investmentSize;
    const orderMultiplier = Math.pow(
      config.stepMultiplier || 2,
      config.orderNumber - 1
    );
    const adjustedOrderSize = baseOrderSize * orderMultiplier;

    return convertUSDToAsset(
      adjustedOrderSize,
      config.currentPrice,
      config.symbol,
      config.szDecimals || 4
    );
  }

  // Handle legacy parameter version
  const orderSizeUSD = configOrOrderSizeUSD;
  if (!currentPrice || !symbol) {
    throw new Error(
      "Missing required parameters for legacy calculateMartingaleOrderSize call"
    );
  }

  return convertUSDToAsset(orderSizeUSD, currentPrice, symbol, szDecimals);
}

/**
 * Calculate order size for portfolio rebalancing
 * @param targetUSDValue - Target USD value for the asset
 * @param currentPrice - Current asset price
 * @param symbol - Asset symbol
 * @param szDecimals - Decimal places for rounding
 */
export function calculatePortfolioOrderSize(
  config: PortfolioOrderSizeConfig
): OrderSizeResult;
export function calculatePortfolioOrderSize(
  targetUSDValue: number,
  currentPrice: number,
  symbol: string,
  szDecimals?: number
): OrderSizeResult;
export function calculatePortfolioOrderSize(
  configOrTargetUSDValue: PortfolioOrderSizeConfig | number,
  currentPrice?: number,
  symbol?: string,
  szDecimals: number = 4
): OrderSizeResult {
  // Handle typed config version
  if (typeof configOrTargetUSDValue === "object") {
    const config = configOrTargetUSDValue;
    const totalPortfolioValue = config.investmentSize;
    const rebalanceAmount =
      totalPortfolioValue *
      (config.targetAllocation - config.currentAllocation);

    return convertUSDToAsset(
      Math.abs(rebalanceAmount),
      config.currentPrice,
      config.symbol,
      config.szDecimals || 4
    );
  }

  // Handle legacy parameter version
  const targetUSDValue = configOrTargetUSDValue;
  if (!currentPrice || !symbol) {
    throw new Error(
      "Missing required parameters for legacy calculatePortfolioOrderSize call"
    );
  }

  return convertUSDToAsset(targetUSDValue, currentPrice, symbol, szDecimals);
}

/**
 * Calculate order size from percentage of total investment
 * @param totalInvestmentUSD - Total investment amount in USD
 * @param percentage - Percentage of total investment (0.0 to 1.0)
 * @param currentPrice - Current asset price
 * @param symbol - Asset symbol
 * @param szDecimals - Decimal places for rounding
 */
export function calculatePercentageOrderSize(
  totalInvestmentUSD: number,
  percentage: number,
  currentPrice: number,
  symbol: string,
  szDecimals: number = 4
): OrderSizeResult {
  const usdAmount = totalInvestmentUSD * percentage;
  const result = convertUSDToAsset(usdAmount, currentPrice, symbol, szDecimals);

  return {
    ...result,
    calculationDetails: `$${totalInvestmentUSD} × ${(percentage * 100).toFixed(
      1
    )}% = $${usdAmount} → ${result.orderSize} ${symbol}`,
  };
}
