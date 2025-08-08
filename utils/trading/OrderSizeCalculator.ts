import type { OrderSizeConfig, OrderSizeResult } from "../../types";

/**
 * Calculate order size based on investment type and configuration
 */
export function calculateOrderSize(config: OrderSizeConfig): OrderSizeResult {
  const {
    investmentAmount,
    investmentType = "usd",
    gridQuantity = 1,
    currentPrice,
    symbol,
    szDecimals = 4,
  } = config;

  let totalBaseAmount: number;
  let calculationDetails: string;

  if (investmentType === "usd") {
    // Convert USD investment to base asset using current price
    totalBaseAmount = investmentAmount / currentPrice;
    calculationDetails = `$${investmentAmount} USD / $${currentPrice} = ${totalBaseAmount.toFixed(
      6
    )} ${symbol}`;
  } else {
    // Investment amount is already in base asset
    totalBaseAmount = investmentAmount;
    calculationDetails = `${investmentAmount} ${symbol} (already in base asset)`;
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
 * Round a number to the specified number of decimal places
 */
export function roundToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculate order size for grid strategies specifically
 */
export function calculateGridOrderSize(
  investmentAmount: number,
  gridQuantity: number,
  currentPrice: number,
  symbol: string,
  investmentType: "usd" | "asset" = "usd",
  szDecimals: number = 4
): OrderSizeResult {
  return calculateOrderSize({
    investmentAmount,
    investmentType,
    gridQuantity,
    currentPrice,
    symbol,
    szDecimals,
  });
}

/**
 * Calculate order size for martingale strategies
 */
export function calculateMartingaleOrderSize(
  orderSizeUSD: number,
  currentPrice: number,
  symbol: string,
  szDecimals: number = 4
): OrderSizeResult {
  return calculateOrderSize({
    investmentAmount: orderSizeUSD,
    investmentType: "usd",
    gridQuantity: 1,
    currentPrice,
    symbol,
    szDecimals,
  });
}
