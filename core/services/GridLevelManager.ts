import { GridConfig, GridLevel } from "../types/BotTypes.js";

export class GridLevelManager {
  private config: GridConfig;

  constructor(config: GridConfig) {
    this.config = config;
  }

  setupGridLevels(basePrice: number): GridLevel[] {
    const levels: GridLevel[] = [];
    const usedPrices = new Set<number>();
    const totalGrids = this.config.gridQuantity;
    const orderSize = this.calculateOrderSize(basePrice, totalGrids);
    const gridMode = this.config.gridMode || "arithmetic";

    // Ensure we have bounds - use default bounds if not provided
    const upperBound = this.config.upperBound || basePrice * 1.2; // 20% above base
    const lowerBound = this.config.lowerBound || basePrice * 0.8; // 20% below base

    console.log(
      `📊 Setting up ${totalGrids} grid levels using ${gridMode} mode`
    );
    console.log(`📊 Price range: $${lowerBound} - $${upperBound}`);

    // Generate grid prices based on the selected mode
    const gridPrices = this.generateGridPrices(
      lowerBound,
      upperBound,
      totalGrids,
      gridMode
    );

    // Create grid levels for each price
    for (const price of gridPrices) {
      const roundedPrice = this.roundPrice(price);

      // Skip duplicate prices
      if (usedPrices.has(roundedPrice)) {
        console.log(`⚠️ Skipping duplicate price: $${roundedPrice}`);
        continue;
      }

      usedPrices.add(roundedPrice);

      // Determine if this should be a buy or sell order based on current price
      const side = price < basePrice ? "buy" : "sell";

      levels.push({
        price: roundedPrice,
        side,
        filled: false,
        size: orderSize,
      });
    }

    // Sort levels by price
    levels.sort((a, b) => a.price - b.price);

    console.log(
      `📊 Created ${levels.filter((l) => l.side === "buy").length} buy levels and ${levels.filter((l) => l.side === "sell").length} sell levels`
    );

    this.logGridLevels(levels);
    return levels;
  }

  private generateGridPrices(
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

  calculateCounterOrderPrice(
    filledLevel: GridLevel,
    fillPrice: number
  ): number {
    const gridSpacing = this.config.gridSpacing / 100;
    let counterPrice: number;

    if (filledLevel.side === "buy") {
      counterPrice = fillPrice * (1 + gridSpacing);
    } else {
      counterPrice = fillPrice * (1 - gridSpacing);
    }

    return this.roundPrice(counterPrice);
  }

  isWithinBounds(price: number): boolean {
    if (this.config.upperBound && price > this.config.upperBound) {
      return false;
    }
    if (this.config.lowerBound && price < this.config.lowerBound) {
      return false;
    }
    return true;
  }

  findExistingLevel(
    levels: GridLevel[],
    price: number,
    side: "buy" | "sell"
  ): GridLevel | undefined {
    return levels.find((l) => l.price === price && l.side === side);
  }

  findNearbyLevel(
    levels: GridLevel[],
    price: number,
    side: "buy" | "sell",
    threshold: number = 0.001
  ): GridLevel | undefined {
    return levels.find(
      (l) =>
        Math.abs(l.price - price) < threshold &&
        l.side === side &&
        (l.orderId || l.filled)
    );
  }

  updateConfig(newConfig: Partial<GridConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  private roundPrice(price: number): number {
    // Round to appropriate decimal places based on price
    if (price >= 100000) return Math.round(price);
    if (price >= 1000) return Math.round(price * 10) / 10;
    if (price >= 100) return Math.round(price * 100) / 100;
    if (price >= 10) return Math.round(price * 1000) / 1000;
    return Math.round(price * 1000) / 1000;
  }

  private logGridLevels(levels: GridLevel[]): void {
    const buyLevels = levels.filter((l) => l.side === "buy");
    const sellLevels = levels.filter((l) => l.side === "sell");

    console.log("🟢 Buy levels (lowest to highest):");
    buyLevels.forEach((level, index) => {
      console.log(`  ${index + 1}. BUY ${level.size} @ $${level.price}`);
    });

    console.log("🔴 Sell levels (lowest to highest):");
    sellLevels.forEach((level, index) => {
      console.log(`  ${index + 1}. SELL ${level.size} @ $${level.price}`);
    });
  }

  private calculateOrderSize(currentPrice: number, totalGrids: number): number {
    const investmentType = this.config.metadata?.investment_type || "usd";

    let totalBaseAmount: number;

    if (investmentType === "usd") {
      // Convert USD investment to base asset using current price
      totalBaseAmount = this.config.investmentAmount / currentPrice;
    } else {
      // Investment amount is already in base asset
      totalBaseAmount = this.config.investmentAmount;
    }

    // Calculate order size per grid level
    return totalBaseAmount / totalGrids;
  }
}
