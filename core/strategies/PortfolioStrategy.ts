import { BaseTradingStrategy, StrategyConfig } from "./ITradingStrategy";
import type { IExchange, OrderFill, OrderRequest } from "../../types";
import { HyperliquidOrderFill } from "../../exchanges/HyperliquidExchange";

// Local type definitions to match our MVP schema
type PortfolioBotMetadata = {
  target_allocations: Record<string, number>; // Must sum to 1.0, 2-10 assets max
  rebalance_threshold: number; // Range: 0.01-0.20 (1%-20%)
  rebalance_interval: number; // Range: 1-168 hours
  trading_config: {
    order_type: "market" | "limit";
    slippage_tolerance: number; // Range: 0.001-0.05 (0.1%-5%)
    limit_order_timeout_minutes: number; // Range: 1-60 minutes
  };
  portfolio_limits: {
    min_allocation_percentage: number; // Range: 0.01-0.10 (1%-10%)
    max_allocation_percentage: number; // Range: 0.30-0.80 (30%-80%)
    min_rebalance_amount: number; // Range: 5-100 USD
  };
  risk_management?: BasicRiskManagement;
};

type BasicRiskManagement = {
  stop_loss?: {
    enabled: boolean;
    percentage: number;
  };
  take_profit?: {
    enabled: boolean;
    percentage: number;
  };
};

interface PortfolioStrategyConfig extends StrategyConfig {
  target_allocations: Record<string, number>;
  rebalance_threshold: number;
  rebalance_interval: number;
  trading_config: {
    order_type: "market" | "limit";
    slippage_tolerance: number;
    limit_order_timeout_minutes: number;
  };
  portfolio_limits: {
    min_allocation_percentage: number;
    max_allocation_percentage: number;
    min_rebalance_amount: number;
  };
  risk_management?: BasicRiskManagement;
}

interface PortfolioPosition {
  assets: Record<string, AssetPosition>;
  total_portfolio_value: number;
  current_allocations: Record<string, number>;
  allocation_drifts: Record<string, number>;
  max_drift: number;
  last_rebalance_time: Date | null;
  pending_rebalance_orders: Record<string, RebalanceOrder>;
  rebalance_history: RebalanceEvent[];
}

interface AssetPosition {
  symbol: string;
  current_amount: number;
  current_value_usd: number;
  current_price: number;
  target_allocation: number;
  current_allocation: number;
  drift_percentage: number;
  last_price_update: Date;
}

interface RebalanceOrder {
  symbol: string;
  side: "buy" | "sell";
  target_amount: number;
  estimated_usd_value: number;
  order_id?: string;
  timestamp: Date;
  filled: boolean;
}

interface RebalanceEvent {
  timestamp: Date;
  trigger_reason: string;
  max_drift_before: number;
  orders_placed: RebalanceOrder[];
  estimated_total_value: number;
  success: boolean;
}

export class PortfolioStrategy extends BaseTradingStrategy {
  private portfolioConfig: PortfolioStrategyConfig;
  private portfolioPosition: PortfolioPosition;
  private priceUpdateInterval?: NodeJS.Timeout;
  private rebalanceCheckInterval?: NodeJS.Timeout;
  private isProcessingRebalance = false;
  private primarySymbol: string;

  constructor(
    exchange: IExchange,
    config: StrategyConfig,
    botId?: string,
    userId?: string
  ) {
    super(exchange, config, botId, userId);

    // Extract Portfolio-specific config from metadata
    const metadata = (config.metadata as PortfolioBotMetadata) || {};

    this.portfolioConfig = {
      ...config,
      target_allocations: metadata.target_allocations || {
        [config.symbol]: 1.0,
      },
      rebalance_threshold: metadata.rebalance_threshold || 0.05,
      rebalance_interval: metadata.rebalance_interval || 24,
      trading_config: metadata.trading_config || {
        order_type: "limit",
        slippage_tolerance: 0.01,
        limit_order_timeout_minutes: 30,
      },
      portfolio_limits: metadata.portfolio_limits || {
        min_allocation_percentage: 0.05,
        max_allocation_percentage: 0.6,
        min_rebalance_amount: 10,
      },
      risk_management: metadata.risk_management,
    };

    // Determine primary symbol (highest allocation or from config)
    this.primarySymbol = this.determinePrimarySymbol();

    // Initialize portfolio position tracking
    this.portfolioPosition = {
      assets: {},
      total_portfolio_value: 0,
      current_allocations: {},
      allocation_drifts: {},
      max_drift: 0,
      last_rebalance_time: null,
      pending_rebalance_orders: {},
      rebalance_history: [],
    };

    // Initialize asset positions
    this.initializeAssetPositions();

    console.log(
      `📊 Portfolio Strategy created for ${
        Object.keys(this.portfolioConfig.target_allocations).length
      } assets`,
      {
        primary_symbol: this.primarySymbol,
        rebalance_threshold: this.portfolioConfig.rebalance_threshold,
        rebalance_interval: this.portfolioConfig.rebalance_interval,
        target_allocations: this.portfolioConfig.target_allocations,
      }
    );
  }

  private determinePrimarySymbol(): string {
    const allocations = this.portfolioConfig.target_allocations;

    // If config.symbol is in allocations and has highest weight, use it
    if (allocations[this.config.symbol]) {
      const configSymbolAllocation = allocations[this.config.symbol];
      const hasHighestAllocation = Object.values(allocations).every(
        (allocation) => allocation <= configSymbolAllocation
      );

      if (hasHighestAllocation) {
        return this.config.symbol;
      }
    }

    // Otherwise, find symbol with highest allocation
    return Object.entries(allocations).reduce(
      (highest, [symbol, allocation]) => {
        return allocation > allocations[highest] ? symbol : highest;
      },
      Object.keys(allocations)[0]
    );
  }

  private initializeAssetPositions(): void {
    const allocations = this.portfolioConfig.target_allocations;

    for (const [symbol, targetAllocation] of Object.entries(allocations)) {
      this.portfolioPosition.assets[symbol] = {
        symbol,
        current_amount: 0,
        current_value_usd: 0,
        current_price: 0,
        target_allocation: targetAllocation,
        current_allocation: 0,
        drift_percentage: 0,
        last_price_update: new Date(),
      };
    }
  }

  async initialize(): Promise<void> {
    console.log(
      `🚀 Initializing Portfolio Strategy for ${
        Object.keys(this.portfolioConfig.target_allocations).length
      } assets...`
    );
    console.log(`📌 Primary symbol: ${this.primarySymbol}`);

    if (!this.exchange.isConnected()) {
      await this.exchange.connect();
    }

    // Get current prices for all assets
    try {
      await this.updateAllAssetPrices();
      console.log(`💰 Updated prices for all portfolio assets`);
    } catch (error) {
      console.error(`❌ Failed to get asset prices: ${error}`);
      throw error;
    }

    // Calculate initial portfolio value (assuming all cash)
    this.portfolioPosition.total_portfolio_value = this.config.investmentAmount;

    // Validate portfolio configuration
    this.validateConfiguration();

    console.log(`✅ Portfolio Strategy initialized`);
    this.emit("initialized");
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ Portfolio strategy is already running");
      return;
    }

    console.log(`🤖 Starting Portfolio Trading Strategy...`);
    console.log(
      `📊 Managing ${
        Object.keys(this.portfolioConfig.target_allocations).length
      } assets:`
    );

    for (const [symbol, allocation] of Object.entries(
      this.portfolioConfig.target_allocations
    )) {
      console.log(`   ${symbol}: ${(allocation * 100).toFixed(1)}%`);
    }

    console.log(
      `⚖️ Rebalance threshold: ${(
        this.portfolioConfig.rebalance_threshold * 100
      ).toFixed(1)}%`
    );
    console.log(
      `⏰ Rebalance interval: ${this.portfolioConfig.rebalance_interval} hours`
    );
    console.log(
      `💱 Order type: ${this.portfolioConfig.trading_config.order_type}`
    );

    this.isRunning = true;
    this.state.isActive = true;

    // Start price monitoring
    this.startPriceMonitoring();

    // Start rebalance checking
    this.startRebalanceChecking();

    console.log(`✅ Portfolio Trading Strategy started`);
    this.emit("started");
  }

  async stop(): Promise<void> {
    console.log(`🛑 Stopping Portfolio Trading Strategy...`);

    this.isRunning = false;
    this.state.isActive = false;

    // Clear intervals
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = undefined;
    }

    if (this.rebalanceCheckInterval) {
      clearInterval(this.rebalanceCheckInterval);
      this.rebalanceCheckInterval = undefined;
    }

    console.log(`✅ Portfolio Trading Strategy stopped`);
    this.emit("stopped");
  }

  async handleOrderFill(fill: OrderFill | HyperliquidOrderFill): Promise<void> {
    if (!this.isRunning) return;

    // Check if this fill is for one of our portfolio assets
    const asset = this.portfolioPosition.assets[fill.symbol];
    if (!asset) return;

    console.log(
      `📈 Portfolio order filled: ${fill.side} ${fill.size} ${fill.symbol} @ $${fill.price}`
    );

    // Update asset position
    this.updateAssetPosition(fill);

    // Update base strategy metrics
    this.updateVolumeMetrics(fill);

    // Recalculate portfolio allocations
    await this.recalculatePortfolioAllocations();

    // Check if this was a rebalance order
    const rebalanceOrder =
      this.portfolioPosition.pending_rebalance_orders[fill.symbol];
    if (rebalanceOrder) {
      rebalanceOrder.filled = true;
      console.log(`✅ Rebalance order completed for ${fill.symbol}`);
    }

    this.emit("orderFilled", {
      fill,
      portfolioPosition: this.portfolioPosition,
    });
  }

  private validateConfiguration(): void {
    const config = this.portfolioConfig;
    const allocations = config.target_allocations;

    // Validate allocation sum
    const totalAllocation = Object.values(allocations).reduce(
      (sum, val) => sum + val,
      0
    );
    if (Math.abs(totalAllocation - 1.0) > 0.001) {
      throw new Error(
        `Target allocations must sum to 1.0, current sum: ${totalAllocation.toFixed(
          4
        )}`
      );
    }

    // Validate number of assets
    const assetCount = Object.keys(allocations).length;
    if (assetCount < 2 || assetCount > 10) {
      throw new Error(
        `Portfolio must have 2-10 assets, current: ${assetCount}`
      );
    }

    // Validate individual allocations
    for (const [symbol, allocation] of Object.entries(allocations)) {
      if (allocation < 0.05 || allocation > 0.8) {
        console.warn(
          `⚠️ ${symbol} allocation (${(allocation * 100).toFixed(
            1
          )}%) is outside recommended range (5%-80%)`
        );
      }
    }

    console.log(
      `✅ Portfolio configuration validated: ${assetCount} assets, total allocation: ${(
        totalAllocation * 100
      ).toFixed(1)}%`
    );
  }

  private startPriceMonitoring(): void {
    // Update prices every 60 seconds
    this.priceUpdateInterval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.updateAllAssetPrices();
        await this.recalculatePortfolioAllocations();
      } catch (error) {
        console.error(`❌ Error updating portfolio prices: ${error}`);
      }
    }, 60000); // 60 seconds

    console.log(
      `👀 Price monitoring started for portfolio assets (60s intervals)`
    );
  }

  private startRebalanceChecking(): void {
    // Check for rebalancing needs every 5 minutes
    this.rebalanceCheckInterval = setInterval(async () => {
      if (!this.isRunning || this.isProcessingRebalance) return;

      try {
        await this.checkRebalanceNeed();
      } catch (error) {
        console.error(`❌ Error checking rebalance need: ${error}`);
      }
    }, 5 * 60 * 1000); // 5 minutes

    console.log(`⚖️ Rebalance monitoring started (5min intervals)`);
  }

  private async updateAllAssetPrices(): Promise<void> {
    const assets = this.portfolioPosition.assets;

    for (const symbol of Object.keys(assets)) {
      try {
        const price = await this.exchange.getCurrentPrice(symbol);
        assets[symbol].current_price = price;
        assets[symbol].last_price_update = new Date();

        // Update asset value
        assets[symbol].current_value_usd =
          assets[symbol].current_amount * price;

        // Update primary symbol price in state
        if (symbol === this.primarySymbol) {
          this.state.currentPrice = price;
        }
      } catch (error) {
        console.error(`❌ Failed to update price for ${symbol}: ${error}`);
      }
    }
  }

  private async recalculatePortfolioAllocations(): Promise<void> {
    const assets = this.portfolioPosition.assets;

    // Calculate total portfolio value
    let totalValue = 0;
    for (const asset of Object.values(assets)) {
      totalValue += asset.current_value_usd;
    }

    this.portfolioPosition.total_portfolio_value = totalValue;

    if (totalValue === 0) {
      // No positions yet, all allocations are 0
      for (const asset of Object.values(assets)) {
        asset.current_allocation = 0;
        asset.drift_percentage = 0;
      }
      return;
    }

    // Calculate current allocations and drifts
    let maxDrift = 0;

    for (const [symbol, asset] of Object.entries(assets)) {
      const currentAllocation = asset.current_value_usd / totalValue;
      const drift = Math.abs(currentAllocation - asset.target_allocation);

      asset.current_allocation = currentAllocation;
      asset.drift_percentage = drift;

      this.portfolioPosition.current_allocations[symbol] = currentAllocation;
      this.portfolioPosition.allocation_drifts[symbol] = drift;

      maxDrift = Math.max(maxDrift, drift);
    }

    this.portfolioPosition.max_drift = maxDrift;

    // Update strategy state with primary symbol position
    const primaryAsset = assets[this.primarySymbol];
    if (primaryAsset) {
      this.state.totalPosition = primaryAsset.current_amount;
    }
  }

  private async checkRebalanceNeed(): Promise<void> {
    const maxDrift = this.portfolioPosition.max_drift;
    const threshold = this.portfolioConfig.rebalance_threshold;

    // Check drift threshold
    if (maxDrift < threshold) {
      return; // No rebalancing needed
    }

    // Check time-based rebalancing
    const now = new Date();
    const lastRebalance = this.portfolioPosition.last_rebalance_time;
    const intervalMs = this.portfolioConfig.rebalance_interval * 60 * 60 * 1000;

    const timeSinceLastRebalance = lastRebalance
      ? now.getTime() - lastRebalance.getTime()
      : Infinity;

    if (timeSinceLastRebalance < intervalMs) {
      console.log(
        `⏰ Rebalance needed (drift: ${(maxDrift * 100).toFixed(
          2
        )}%) but waiting for interval (${Math.round(
          (intervalMs - timeSinceLastRebalance) / 1000 / 60
        )} min remaining)`
      );
      return;
    }

    console.log(
      `⚖️ Rebalancing triggered: max drift ${(maxDrift * 100).toFixed(
        2
      )}% > threshold ${(threshold * 100).toFixed(2)}%`
    );

    await this.executeRebalance("drift_threshold");
  }

  private async executeRebalance(reason: string): Promise<void> {
    if (this.isProcessingRebalance) return;
    this.isProcessingRebalance = true;

    try {
      console.log(`🔄 Executing portfolio rebalance: ${reason}`);

      const rebalanceOrders = this.calculateRebalanceOrders();

      if (rebalanceOrders.length === 0) {
        console.log(`ℹ️ No rebalance orders needed`);
        return;
      }

      // Execute rebalance orders
      const placedOrders: RebalanceOrder[] = [];

      for (const order of rebalanceOrders) {
        try {
          const orderRequest: OrderRequest = {
            symbol: order.symbol,
            side: order.side,
            type: this.portfolioConfig.trading_config.order_type,
            size: order.target_amount,
            price: this.portfolioPosition.assets[order.symbol].current_price,
          };

          console.log(
            `📝 Placing rebalance order: ${
              order.side
            } ${order.target_amount.toFixed(6)} ${
              order.symbol
            } (~$${order.estimated_usd_value.toFixed(2)})`
          );

          const orderResponse = await this.exchange.placeOrder(orderRequest);

          if (orderResponse.success) {
            order.order_id = orderResponse.orderId?.toString();
            order.filled = false; // Will be updated when order fills

            // Track pending order
            this.portfolioPosition.pending_rebalance_orders[order.symbol] =
              order;
            placedOrders.push(order);

            console.log(`✅ Rebalance order placed: ${orderResponse.orderId}`);
          } else {
            console.error(
              `❌ Failed to place rebalance order for ${order.symbol}: ${orderResponse.error}`
            );
          }
        } catch (error) {
          console.error(
            `❌ Error placing rebalance order for ${order.symbol}: ${error}`
          );
        }
      }

      // Record rebalance event
      const rebalanceEvent: RebalanceEvent = {
        timestamp: new Date(),
        trigger_reason: reason,
        max_drift_before: this.portfolioPosition.max_drift,
        orders_placed: placedOrders,
        estimated_total_value: this.portfolioPosition.total_portfolio_value,
        success: placedOrders.length > 0,
      };

      this.portfolioPosition.rebalance_history.push(rebalanceEvent);
      this.portfolioPosition.last_rebalance_time = new Date();

      console.log(
        `✅ Rebalance executed: ${placedOrders.length} orders placed`
      );
      this.emit("rebalanceExecuted", {
        event: rebalanceEvent,
        orders: placedOrders,
      });
    } catch (error) {
      console.error(`❌ Error executing rebalance: ${error}`);
      this.emit("rebalanceError", { error, reason });
    } finally {
      this.isProcessingRebalance = false;
    }
  }

  private calculateRebalanceOrders(): RebalanceOrder[] {
    const orders: RebalanceOrder[] = [];
    const totalValue = this.portfolioPosition.total_portfolio_value;
    const minRebalanceAmount =
      this.portfolioConfig.portfolio_limits.min_rebalance_amount;

    if (totalValue === 0) return orders;

    for (const [symbol, asset] of Object.entries(
      this.portfolioPosition.assets
    )) {
      const targetValue = totalValue * asset.target_allocation;
      const currentValue = asset.current_value_usd;
      const difference = targetValue - currentValue;

      // Skip if difference is too small
      if (Math.abs(difference) < minRebalanceAmount) {
        continue;
      }

      const side: "buy" | "sell" = difference > 0 ? "buy" : "sell";
      const targetAmount = Math.abs(difference) / asset.current_price;

      orders.push({
        symbol,
        side,
        target_amount: targetAmount,
        estimated_usd_value: Math.abs(difference),
        timestamp: new Date(),
        filled: false,
      });
    }

    return orders;
  }

  private updateAssetPosition(fill: OrderFill | HyperliquidOrderFill): void {
    const asset = this.portfolioPosition.assets[fill.symbol];
    if (!asset) return;

    if (fill.side === "buy") {
      asset.current_amount += fill.size;
    } else {
      asset.current_amount = Math.max(0, asset.current_amount - fill.size);
    }

    // Update asset value
    asset.current_value_usd = asset.current_amount * fill.price;

    console.log(
      `📊 ${fill.symbol} position updated: ${asset.current_amount.toFixed(
        6
      )} (${(
        (asset.current_value_usd /
          this.portfolioPosition.total_portfolio_value) *
        100
      ).toFixed(1)}%)`
    );
  }

  getStatistics(): any {
    const baseStats = super.getStatistics();
    const position = this.portfolioPosition;

    // Calculate portfolio performance metrics
    const initialValue = this.config.investmentAmount;
    const currentValue = position.total_portfolio_value;
    const totalReturn = currentValue - initialValue;
    const totalReturnPercent =
      initialValue > 0 ? (totalReturn / initialValue) * 100 : 0;

    // Asset allocation summary
    const allocationSummary = Object.entries(position.assets).map(
      ([symbol, asset]) => ({
        symbol,
        targetAllocation: asset.target_allocation,
        currentAllocation: asset.current_allocation,
        drift: asset.drift_percentage,
        currentAmount: asset.current_amount,
        currentValue: asset.current_value_usd,
        currentPrice: asset.current_price,
      })
    );

    return {
      ...baseStats,
      strategyType: "portfolio",
      portfolioSummary: {
        totalAssets: Object.keys(position.assets).length,
        totalValue: position.total_portfolio_value,
        initialValue: initialValue,
        totalReturn,
        totalReturnPercent,
        maxDrift: position.max_drift,
        lastRebalanceTime: position.last_rebalance_time,
        rebalanceCount: position.rebalance_history.length,
      },
      allocations: allocationSummary,
      portfolioConfig: {
        primarySymbol: this.primarySymbol,
        rebalanceThreshold: this.portfolioConfig.rebalance_threshold,
        rebalanceInterval: this.portfolioConfig.rebalance_interval,
        orderType: this.portfolioConfig.trading_config.order_type,
        slippageTolerance:
          this.portfolioConfig.trading_config.slippage_tolerance,
        minRebalanceAmount:
          this.portfolioConfig.portfolio_limits.min_rebalance_amount,
      },
      triggers: {
        currentMaxDrift: position.max_drift,
        driftThreshold: this.portfolioConfig.rebalance_threshold,
        nextRebalanceCheck: this.getNextRebalanceCheck(),
        needsRebalance:
          position.max_drift >= this.portfolioConfig.rebalance_threshold,
      },
      rebalancing: {
        pendingOrders: Object.keys(position.pending_rebalance_orders).length,
        isProcessing: this.isProcessingRebalance,
        recentEvents: position.rebalance_history.slice(-5), // Last 5 events
      },
      implemented: true,
    };
  }

  private getNextRebalanceCheck(): Date | null {
    if (!this.portfolioPosition.last_rebalance_time) {
      return null;
    }

    const nextCheck = new Date(this.portfolioPosition.last_rebalance_time);
    nextCheck.setHours(
      nextCheck.getHours() + this.portfolioConfig.rebalance_interval
    );

    return nextCheck;
  }

  // Getter for external access to portfolio position
  getPortfolioPosition(): PortfolioPosition {
    return { ...this.portfolioPosition };
  }

  // Method to manually trigger rebalancing (for testing)
  async triggerManualRebalance(): Promise<void> {
    if (!this.isRunning) {
      throw new Error("Strategy must be running to trigger manual rebalance");
    }

    console.log(`🔄 Manual portfolio rebalance triggered`);
    await this.executeRebalance("manual_trigger");
  }

  // Method to get detailed asset information
  getAssetDetails(symbol: string): AssetPosition | null {
    return this.portfolioPosition.assets[symbol] || null;
  }

  // Method to simulate portfolio value at different allocations
  simulateAllocation(newAllocations: Record<string, number>): any {
    const currentPrices = Object.fromEntries(
      Object.entries(this.portfolioPosition.assets).map(([symbol, asset]) => [
        symbol,
        asset.current_price,
      ])
    );

    const totalValue = this.portfolioPosition.total_portfolio_value;
    const simulatedValues = Object.fromEntries(
      Object.entries(newAllocations).map(([symbol, allocation]) => [
        symbol,
        totalValue * allocation,
      ])
    );

    return {
      currentPrices,
      simulatedValues,
      simulatedAmounts: Object.fromEntries(
        Object.entries(simulatedValues).map(([symbol, value]) => [
          symbol,
          value / currentPrices[symbol],
        ])
      ),
      totalValue,
    };
  }
}
