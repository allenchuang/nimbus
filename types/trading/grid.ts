export interface GridConfig {
  symbol: string;
  gridSpacing: number; // Percentage spacing between grid levels (e.g., 0.5 for 0.5%)
  gridQuantity: number; // Total number of grid levels (buy + sell)
  investmentSize: number; // Total capital to allocate
  upperBound?: number; // Optional upper bound price
  lowerBound?: number; // Optional lower bound price
  basePrice?: number; // Base price to center the grid around
  maxPosition: number; // Maximum position size
  stopLoss?: number; // Stop loss percentage
  takeProfit?: number; // Take profit percentage
  gridMode?: "arithmetic" | "geometric"; // Grid spacing mode (default: arithmetic)
  activeLevels?: number; // Number of buy/sell grid levels to keep active at once
  metadata?: {
    // Bot configuration metadata
    investment_type?: "usd" | "asset";
    [key: string]: any; // Allow other metadata properties
  };
}

export interface GridLevel {
  price: number;
  orderId?: string | number;
  filled: boolean;
  size: number;
  filledSize?: number;
  side?: "buy" | "sell"; // Added side property for compatibility
}

// Grid generation types (from utils/types/GridTypes.ts)
export interface GeneratedGridLevel {
  price: number;
  side: "buy" | "sell";
  index: number;
}

export interface GridGenerationResult {
  levels: GeneratedGridLevel[];
  nearestIndex: number;
  effectiveBounds: {
    upperBound: number;
    lowerBound: number;
  };
}
