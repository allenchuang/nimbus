import { BaseTradingStrategy, StrategyConfig } from "./ITradingStrategy";
import { IExchange, OrderFill, OrderRequest } from "../../interfaces/IExchange";
import { HyperliquidOrderFill } from "../../exchanges/HyperliquidExchange";
// Import types from the workspace
type DCABotMetadata = {
  interval_hours: number;
  order_size: number;
  max_orders: number;
  max_daily_orders: number;
  min_order_size: number;
  max_order_size: number;
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

interface DCAStrategyConfig extends StrategyConfig {
  interval_hours: number;
  order_size: number;
  max_orders: number;
  max_daily_orders: number;
  min_order_size: number;
  max_order_size: number;
  risk_management?: BasicRiskManagement;
}

interface DCAPosition {
  total_orders: number;
  total_invested: number;
  average_cost: number;
  current_position: number;
  daily_orders_count: number;
  last_order_time: Date | null;
  last_daily_reset: Date;
  orders_history: DCAOrder[];
}

interface DCAOrder {
  id: string;
  timestamp: Date;
  price: number;
  size: number;
  side: "buy" | "sell";
  filled: boolean;
  amount_usd: number;
}

export class DCAStrategy extends BaseTradingStrategy {
  private dcaConfig: DCAStrategyConfig;
  private dcaPosition: DCAPosition;
  private orderTimer?: NodeJS.Timeout;
  private dailyResetTimer?: NodeJS.Timeout;
  private isProcessingOrder = false;

  constructor(
    exchange: IExchange,
    config: StrategyConfig,
    botId?: string,
    userId?: string
  ) {
    super(exchange, config, botId, userId);

    // Extract DCA-specific config from metadata
    const metadata = (config.metadata as DCABotMetadata) || {};

    this.dcaConfig = {
      ...config,
      interval_hours: metadata.interval_hours || 24,
      order_size: metadata.order_size || 100,
      max_orders: metadata.max_orders || 30,
      max_daily_orders: metadata.max_daily_orders || 1,
      min_order_size: metadata.min_order_size || 50,
      max_order_size: metadata.max_order_size || 200,
      risk_management: metadata.risk_management,
    };

    // Initialize DCA position tracking
    this.dcaPosition = {
      total_orders: 0,
      total_invested: 0,
      average_cost: 0,
      current_position: 0,
      daily_orders_count: 0,
      last_order_time: null,
      last_daily_reset: new Date(),
      orders_history: [],
    };

    console.log(`🔄 DCA Strategy created for ${config.symbol}`, {
      interval_hours: this.dcaConfig.interval_hours,
      order_size: this.dcaConfig.order_size,
      max_orders: this.dcaConfig.max_orders,
      max_daily_orders: this.dcaConfig.max_daily_orders,
    });
  }

  async initialize(): Promise<void> {
    console.log(`🚀 Initializing DCA Strategy for ${this.config.symbol}...`);

    if (!this.exchange.isConnected()) {
      await this.exchange.connect();
    }

    // Get current price for initial state
    try {
      const currentPrice = await this.exchange.getCurrentPrice(
        this.config.symbol
      );
      this.state.currentPrice = currentPrice;
      console.log(
        `💰 Current price for ${this.config.symbol}: $${currentPrice}`
      );
    } catch (error) {
      console.error(`❌ Failed to get current price: ${error}`);
      throw error;
    }

    // Validate DCA configuration
    this.validateConfiguration();

    console.log(`✅ DCA Strategy initialized for ${this.config.symbol}`);
    this.emit("initialized");
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ DCA strategy is already running");
      return;
    }

    console.log(
      `🤖 Starting DCA Trading Strategy for ${this.config.symbol}...`
    );
    console.log(
      `📅 Will place orders every ${this.dcaConfig.interval_hours} hours`
    );
    console.log(
      `💵 Order size: $${this.dcaConfig.order_size} (min: $${this.dcaConfig.min_order_size}, max: $${this.dcaConfig.max_order_size})`
    );
    console.log(
      `🛡️ Safety limits: ${this.dcaConfig.max_daily_orders}/day, ${this.dcaConfig.max_orders} total`
    );

    this.isRunning = true;
    this.state.isActive = true;

    // Start the order placement timer
    this.startOrderTimer();

    // Start daily reset timer
    this.startDailyResetTimer();

    console.log(`✅ DCA Trading Strategy started for ${this.config.symbol}`);
    this.emit("started");
  }

  async stop(): Promise<void> {
    console.log(
      `🛑 Stopping DCA Trading Strategy for ${this.config.symbol}...`
    );

    this.isRunning = false;
    this.state.isActive = false;

    // Clear timers
    if (this.orderTimer) {
      clearTimeout(this.orderTimer);
      this.orderTimer = undefined;
    }

    if (this.dailyResetTimer) {
      clearTimeout(this.dailyResetTimer);
      this.dailyResetTimer = undefined;
    }

    console.log(`✅ DCA Trading Strategy stopped for ${this.config.symbol}`);
    this.emit("stopped");
  }

  async handleOrderFill(fill: OrderFill | HyperliquidOrderFill): Promise<void> {
    if (!this.isRunning || fill.symbol !== this.config.symbol) return;

    console.log(
      `📈 DCA order filled: ${fill.side} ${fill.size} ${this.config.symbol} @ $${fill.price}`
    );

    // Update position tracking
    this.updateDCAPosition(fill);

    // Update base strategy metrics
    this.updateVolumeMetrics(fill);

    // Update current price
    this.state.currentPrice = fill.price;

    // Check risk management rules
    await this.checkRiskManagement(fill);

    this.emit("orderFilled", { fill, dcaPosition: this.dcaPosition });
  }

  private validateConfiguration(): void {
    const config = this.dcaConfig;

    // Basic validation (additional to our validation system)
    if (config.min_order_size > config.order_size) {
      throw new Error(
        `min_order_size (${config.min_order_size}) cannot be greater than order_size (${config.order_size})`
      );
    }

    if (config.max_order_size < config.order_size) {
      throw new Error(
        `max_order_size (${config.max_order_size}) cannot be less than order_size (${config.order_size})`
      );
    }

    if (config.max_daily_orders > Math.floor(24 / config.interval_hours)) {
      console.warn(
        `⚠️ max_daily_orders (${config.max_daily_orders}) is higher than possible with ${config.interval_hours}h intervals`
      );
    }
  }

  private startOrderTimer(): void {
    const intervalMs = this.dcaConfig.interval_hours * 60 * 60 * 1000;

    console.log(
      `⏰ Setting DCA timer for ${this.dcaConfig.interval_hours} hours (${intervalMs}ms)`
    );

    // Place first order immediately (if safe)
    setTimeout(() => {
      this.placeNextOrder();
    }, 5000); // 5 second delay for initialization

    // Then set up recurring timer
    this.orderTimer = setInterval(() => {
      this.placeNextOrder();
    }, intervalMs);
  }

  private startDailyResetTimer(): void {
    // Reset daily order count at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      this.resetDailyOrderCount();

      // Set up daily recurring reset
      this.dailyResetTimer = setInterval(
        () => {
          this.resetDailyOrderCount();
        },
        24 * 60 * 60 * 1000
      ); // 24 hours
    }, msUntilMidnight);
  }

  private resetDailyOrderCount(): void {
    console.log(
      `🔄 Resetting daily order count for ${this.config.symbol} (was: ${this.dcaPosition.daily_orders_count})`
    );
    this.dcaPosition.daily_orders_count = 0;
    this.dcaPosition.last_daily_reset = new Date();
  }

  private async placeNextOrder(): Promise<void> {
    if (!this.isRunning || this.isProcessingOrder) return;

    this.isProcessingOrder = true;

    try {
      // Check safety limits
      if (!this.canPlaceOrder()) {
        console.log(
          `🛑 Cannot place DCA order for ${this.config.symbol} - safety limits reached`
        );
        return;
      }

      // Get current price
      const currentPrice = await this.exchange.getCurrentPrice(
        this.config.symbol
      );
      this.state.currentPrice = currentPrice;

      // Calculate order size (MVP: use fixed order size)
      const orderSize = this.calculateOrderSize(currentPrice);

      // Place buy order (DCA typically buys regularly)
      const orderRequest: OrderRequest = {
        symbol: this.config.symbol,
        side: "buy",
        type: "market", // MVP: use market orders for simplicity
        size: orderSize,
        price: currentPrice, // Required even for market orders
      };

      console.log(
        `📝 Placing DCA order: ${orderRequest.side} ${orderRequest.size} ${this.config.symbol} @ market price (~$${currentPrice})`
      );

      const orderResponse = await this.exchange.placeOrder(orderRequest);

      if (orderResponse.success) {
        // Track the order
        const dcaOrder: DCAOrder = {
          id: orderResponse.orderId?.toString() || `dca_${Date.now()}`,
          timestamp: new Date(),
          price: currentPrice, // Approximate for market order
          size: orderSize,
          side: "buy",
          filled: true, // Market orders fill immediately
          amount_usd: orderSize * currentPrice,
        };

        this.dcaPosition.orders_history.push(dcaOrder);
        this.dcaPosition.daily_orders_count++;
        this.dcaPosition.last_order_time = new Date();

        console.log(
          `✅ DCA order placed successfully: ${orderResponse.orderId}`
        );

        this.emit("orderPlaced", { order: dcaOrder, orderResponse });
      } else {
        console.error(`❌ Failed to place DCA order: ${orderResponse.error}`);
        this.emit("orderError", { error: orderResponse.error });
      }
    } catch (error) {
      console.error(`❌ Error placing DCA order: ${error}`);
      this.emit("orderError", { error });
    } finally {
      this.isProcessingOrder = false;
    }
  }

  private canPlaceOrder(): boolean {
    const position = this.dcaPosition;
    const config = this.dcaConfig;

    // Check max total orders
    if (position.total_orders >= config.max_orders) {
      console.log(
        `🛑 Max orders limit reached: ${position.total_orders}/${config.max_orders}`
      );
      return false;
    }

    // Check daily order limit
    if (position.daily_orders_count >= config.max_daily_orders) {
      console.log(
        `🛑 Daily order limit reached: ${position.daily_orders_count}/${config.max_daily_orders}`
      );
      return false;
    }

    // Check max position limit (from base config)
    if (position.current_position >= this.config.maxPosition) {
      console.log(
        `🛑 Max position limit reached: ${position.current_position}/${this.config.maxPosition}`
      );
      return false;
    }

    return true;
  }

  private calculateOrderSize(currentPrice: number): number {
    // MVP: Use fixed order size with min/max validation
    let orderSize = this.dcaConfig.order_size / currentPrice; // Convert USD to asset size

    const minSize = this.dcaConfig.min_order_size / currentPrice;
    const maxSize = this.dcaConfig.max_order_size / currentPrice;

    // Ensure within bounds
    orderSize = Math.max(minSize, Math.min(maxSize, orderSize));

    // Round to reasonable precision (6 decimal places)
    return Math.round(orderSize * 1000000) / 1000000;
  }

  private updateDCAPosition(fill: OrderFill | HyperliquidOrderFill): void {
    const position = this.dcaPosition;

    if (fill.side === "buy") {
      // Update running average cost
      const newInvestment = fill.size * fill.price;
      const totalInvested = position.total_invested + newInvestment;
      const totalPosition = position.current_position + fill.size;

      if (totalPosition > 0) {
        position.average_cost = totalInvested / totalPosition;
      }

      position.total_invested = totalInvested;
      position.current_position = totalPosition;
      position.total_orders++;
    } else {
      // Handle sells (reduce position)
      position.current_position = Math.max(
        0,
        position.current_position - fill.size
      );
      // Note: We don't reduce total_invested on sells for average cost tracking
    }

    // Update strategy state
    this.state.totalPosition = position.current_position;

    console.log(
      `📊 DCA Position updated: ${position.current_position.toFixed(6)} ${this.config.symbol}, avg cost: $${position.average_cost.toFixed(2)}, total orders: ${position.total_orders}`
    );
  }

  private async checkRiskManagement(
    fill: OrderFill | HyperliquidOrderFill
  ): Promise<void> {
    if (!this.dcaConfig.risk_management) return;

    const risk = this.dcaConfig.risk_management;
    const currentPrice = fill.price;
    const position = this.dcaPosition;

    // Check stop loss
    if (risk.stop_loss?.enabled && position.average_cost > 0) {
      const stopLossPrice =
        position.average_cost * (1 - risk.stop_loss.percentage / 100);

      if (currentPrice <= stopLossPrice) {
        console.log(
          `🛑 Stop loss triggered! Current: $${currentPrice}, Stop: $${stopLossPrice.toFixed(2)}, Avg Cost: $${position.average_cost.toFixed(2)}`
        );

        // Emit stop loss event (actual selling would be implemented here)
        this.emit("stopLossTriggered", {
          currentPrice,
          stopLossPrice,
          averageCost: position.average_cost,
          position: position.current_position,
        });
      }
    }

    // Check take profit
    if (risk.take_profit?.enabled && position.average_cost > 0) {
      const takeProfitPrice =
        position.average_cost * (1 + risk.take_profit.percentage / 100);

      if (currentPrice >= takeProfitPrice) {
        console.log(
          `🎯 Take profit triggered! Current: $${currentPrice}, Target: $${takeProfitPrice.toFixed(2)}, Avg Cost: $${position.average_cost.toFixed(2)}`
        );

        // Emit take profit event (actual selling would be implemented here)
        this.emit("takeProfitTriggered", {
          currentPrice,
          takeProfitPrice,
          averageCost: position.average_cost,
          position: position.current_position,
        });
      }
    }
  }

  getStatistics(): any {
    const baseStats = super.getStatistics();
    const position = this.dcaPosition;

    const currentValue = position.current_position * this.state.currentPrice;
    const unrealizedPnL = currentValue - position.total_invested;
    const unrealizedPnLPercent =
      position.total_invested > 0
        ? (unrealizedPnL / position.total_invested) * 100
        : 0;

    return {
      ...baseStats,
      strategyType: "dca",
      dcaPosition: {
        totalOrders: position.total_orders,
        totalInvested: position.total_invested,
        averageCost: position.average_cost,
        currentPosition: position.current_position,
        currentValue,
        unrealizedPnL,
        unrealizedPnLPercent,
        dailyOrdersCount: position.daily_orders_count,
        maxDailyOrders: this.dcaConfig.max_daily_orders,
        maxOrders: this.dcaConfig.max_orders,
        lastOrderTime: position.last_order_time,
      },
      dcaConfig: {
        intervalHours: this.dcaConfig.interval_hours,
        orderSize: this.dcaConfig.order_size,
        minOrderSize: this.dcaConfig.min_order_size,
        maxOrderSize: this.dcaConfig.max_order_size,
      },
      nextOrderEstimate: this.getNextOrderEstimate(),
    };
  }

  private getNextOrderEstimate(): Date | null {
    if (!this.isRunning || !this.dcaPosition.last_order_time) {
      return null;
    }

    const nextOrder = new Date(this.dcaPosition.last_order_time);
    nextOrder.setHours(nextOrder.getHours() + this.dcaConfig.interval_hours);

    return nextOrder;
  }

  // Getter for external access to DCA position
  getDCAPosition(): DCAPosition {
    return { ...this.dcaPosition };
  }

  // Method to manually trigger order (for testing or immediate execution)
  async triggerManualOrder(): Promise<void> {
    if (!this.isRunning) {
      throw new Error("Strategy must be running to trigger manual order");
    }

    console.log(`🔄 Manual DCA order triggered for ${this.config.symbol}`);
    await this.placeNextOrder();
  }
}
