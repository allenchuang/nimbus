import {
  GridConfig,
  GeneratedGridLevel,
  GridGenerationResult,
} from "../types/GridTypes";

/**
 * Deterministic grid level generator
 * Given the same GridConfig and currentPrice, always produces the same grid levels
 */
export function generateGridLevels(
  config: GridConfig,
  currentPrice?: number
): GridGenerationResult {
  const {
    gridQuantity,
    upperBound,
    lowerBound,
    basePrice,
    gridMode = "arithmetic",
  } = config;

  // Determine the reference price for calculations
  const referencePrice = currentPrice || basePrice || 50000; // fallback if no prices provided

  // Ensure we have bounds - use defaults if not provided
  const effectiveUpperBound = upperBound || referencePrice * 1.2; // 20% above reference
  const effectiveLowerBound = lowerBound || referencePrice * 0.8; // 20% below reference

  // Validate bounds
  if (effectiveUpperBound <= effectiveLowerBound) {
    throw new Error(
      `Invalid bounds: upperBound (${effectiveUpperBound}) must be greater than lowerBound (${effectiveLowerBound})`
    );
  }

  if (gridQuantity < 2) {
    throw new Error(
      `Invalid gridQuantity: ${gridQuantity}. Must be at least 2.`
    );
  }

  // Generate grid prices using the appropriate algorithm
  const gridPrices = generateGridPrices(
    effectiveLowerBound,
    effectiveUpperBound,
    gridQuantity,
    gridMode
  );

  // Create grid levels with side determination based on reference price
  const levels: GeneratedGridLevel[] = gridPrices.map((price, index) => ({
    price: roundPrice(price),
    side: price < referencePrice ? "buy" : "sell",
    index,
  }));

  // Find the nearest index to the reference price
  const nearestIndex = findNearestPriceIndex(gridPrices, referencePrice);

  return {
    levels,
    nearestIndex,
    effectiveBounds: {
      upperBound: effectiveUpperBound,
      lowerBound: effectiveLowerBound,
    },
  };
}

/**
 * Generate grid prices using arithmetic or geometric progression
 */
function generateGridPrices(
  lowerBound: number,
  upperBound: number,
  totalGrids: number,
  mode: "arithmetic" | "geometric"
): number[] {
  const prices: number[] = [];

  if (mode === "geometric") {
    // Geometric progression: each step multiplies by a constant factor
    const ratio = Math.pow(upperBound / lowerBound, 1 / (totalGrids - 1));

    for (let i = 0; i < totalGrids; i++) {
      const price = lowerBound * Math.pow(ratio, i);
      prices.push(price);
    }
  } else {
    // Arithmetic progression: equal price differences between levels
    const step = (upperBound - lowerBound) / (totalGrids - 1);

    for (let i = 0; i < totalGrids; i++) {
      const price = lowerBound + step * i;
      prices.push(price);
    }
  }

  return prices;
}

/**
 * Find the nearest grid index for a given price
 */
function findNearestPriceIndex(
  gridPrices: number[],
  targetPrice: number
): number {
  let nearestIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < gridPrices.length; i++) {
    const distance = Math.abs(gridPrices[i] - targetPrice);
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

/**
 * Round price to appropriate decimal places
 * This should match the exchange's price precision requirements
 */
function roundPrice(price: number): number {
  // Basic rounding logic - can be enhanced with exchange-specific metadata
  if (price >= 100000) return Math.round(price);
  if (price >= 1000) return Math.round(price * 10) / 10;
  if (price >= 100) return Math.round(price * 100) / 100;
  if (price >= 10) return Math.round(price * 1000) / 1000;
  return Math.round(price * 10000) / 10000;
}

/**
 * DETERMINISTIC Active Level Calculator
 *
 * This function determines which grid levels should have active orders based on:
 * 1. Current market price position
 * 2. Grid trading strategy (buy below, sell above current price)
 * 3. activeLevels configuration (how many levels per side)
 * 4. Already executed levels (filled orders)
 *
 * Key insight: We don't just use "nearest index" - we determine which levels
 * should logically have orders based on the current price and trading strategy.
 */
export function getActiveLevels(
  allLevels: GeneratedGridLevel[],
  currentPrice: number,
  activeLevelsPerSide: number,
  executedLevelIndices: Set<number> = new Set()
): {
  buyLevels: GeneratedGridLevel[];
  sellLevels: GeneratedGridLevel[];
  activeLevelIndices: Set<number>;
} {
  const buyLevels: GeneratedGridLevel[] = [];
  const sellLevels: GeneratedGridLevel[] = [];
  const activeLevelIndices: Set<number> = new Set();

  // Separate all levels into potential buy and sell levels based on current price
  const potentialBuyLevels = allLevels
    .filter(
      (level) =>
        level.price < currentPrice && !executedLevelIndices.has(level.index)
    )
    .sort((a, b) => b.price - a.price); // Sort descending (closest to current price first)

  const potentialSellLevels = allLevels
    .filter(
      (level) =>
        level.price > currentPrice && !executedLevelIndices.has(level.index)
    )
    .sort((a, b) => a.price - b.price); // Sort ascending (closest to current price first)

  // Select the closest buy levels (below current price)
  for (
    let i = 0;
    i < Math.min(activeLevelsPerSide, potentialBuyLevels.length);
    i++
  ) {
    const level = potentialBuyLevels[i];
    buyLevels.push(level);
    activeLevelIndices.add(level.index);
  }

  // Select the closest sell levels (above current price)
  for (
    let i = 0;
    i < Math.min(activeLevelsPerSide, potentialSellLevels.length);
    i++
  ) {
    const level = potentialSellLevels[i];
    sellLevels.push(level);
    activeLevelIndices.add(level.index);
  }

  return { buyLevels, sellLevels, activeLevelIndices };
}

/**
 * Helper function to determine which grid levels should be active for a given configuration
 * This is the main function that should be used by trading bots
 */
export function getDeterministicActiveLevels(
  config: GridConfig,
  currentPrice: number,
  executedLevelIndices: Set<number> = new Set()
): {
  allLevels: GeneratedGridLevel[];
  activeBuyLevels: GeneratedGridLevel[];
  activeSellLevels: GeneratedGridLevel[];
  activeLevelIndices: Set<number>;
} {
  // Generate all grid levels
  const gridResult = generateGridLevels(config, currentPrice);

  // Determine active levels based on current price and trading strategy
  const activeLevelsPerSide = Math.max(
    1,
    Math.min(10, config.activeLevels || 2)
  );
  const { buyLevels, sellLevels, activeLevelIndices } = getActiveLevels(
    gridResult.levels,
    currentPrice,
    activeLevelsPerSide,
    executedLevelIndices
  );

  return {
    allLevels: gridResult.levels,
    activeBuyLevels: buyLevels,
    activeSellLevels: sellLevels,
    activeLevelIndices,
  };
}
