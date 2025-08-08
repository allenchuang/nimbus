import { BaseTradingStrategy, StrategyConfig } from "./ITradingStrategy";
import { IExchange, OrderFill, OrderRequest } from "../../interfaces/IExchange";
import { HyperliquidOrderFill } from "../../exchanges/HyperliquidExchange";

// Local type definitions to match our MVP schema
type MartingaleBotMetadata = {
  step_multiplier: number;
  max_orders: number;
  base_order_size: number;
  entry_trigger: {
    price_drop_percentage: number;
  };
  exit_strategy: {
    profit_percentage: number;
  };
  safety_controls: {
    max_position_multiple: number;
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

interface MartingaleStrategyConfig extends StrategyConfig {
  step_multiplier: number;
  max_orders: number;
  base_order_size: number;
  entry_trigger: {
    price_drop_percentage: number;
  };
  exit_strategy: {
    profit_percentage: number;
  };
  safety_controls: {
    max_position_multiple: number;
  };
  risk_management?: BasicRiskManagement;
}

interface MartingalePosition {
  orders: MartingaleOrder[];
  total_position: number;
  total_invested: number;
  average_entry_price: number;
  highest_price_seen: number;
  entry_reference_price: number;
  is_in_position: boolean;
  next_order_size: number;
  profit_target_price: number;
}

interface MartingaleOrder {
  id: string;
  timestamp: Date;
  price: number;
  size: number;
  order_number: number; // 1st, 2nd, 3rd order in the sequence
  filled: boolean;
  amount_usd: number;
}

export class MartingaleStrategy extends BaseTradingStrategy {
  private martingaleConfig: MartingaleStrategyConfig;
  private martingalePosition: MartingalePosition;
  private priceMonitorInterval?: NodeJS.Timeout;
  private isProcessingSignal = false;

  constructor(
    exchange: IExchange,
    config: StrategyConfig,
    botId?: string,
    userId?: string
  ) {
    super(exchange, config, botId, userId);

    // Extract Martingale-specific config from metadata
    const metadata = (config.metadata as MartingaleBotMetadata) || {};

    this.martingaleConfig = {
      ...config,
      step_multiplier: metadata.step_multiplier || 2.0,
      max_orders: metadata.max_orders || 5,
      base_order_size: metadata.base_order_size || 100,
      entry_trigger: metadata.entry_trigger || { price_drop_percentage: 2.0 },
      exit_strategy: metadata.exit_strategy || { profit_percentage: 1.0 },
      safety_controls: metadata.safety_controls || {
        max_position_multiple: 10,
      },
      risk_management: metadata.risk_management,
    };

    // Initialize Martingale position tracking
    this.martingalePosition = {
      orders: [],
      total_position: 0,
      total_invested: 0,
      average_entry_price: 0,
      highest_price_seen: 0,
      entry_reference_price: 0,
      is_in_position: false,
      next_order_size: this.martingaleConfig.base_order_size,
      profit_target_price: 0,
    };

    console.log(`🎯 Martingale Strategy created for ${config.symbol}`, {
      step_multiplier: this.martingaleConfig.step_multiplier,
      max_orders: this.martingaleConfig.max_orders,
      base_order_size: this.martingaleConfig.base_order_size,
      entry_trigger: this.martingaleConfig.entry_trigger.price_drop_percentage,
      exit_target: this.martingaleConfig.exit_strategy.profit_percentage,
    });
  }

  async initialize(): Promise<void> {
    console.log(
      `🚀 Initializing Martingale Strategy for ${this.config.symbol}...`
    );

    if (!this.exchange.isConnected()) {
      await this.exchange.connect();
    }

    // Get current price and set as reference
    try {
      const currentPrice = await this.exchange.getCurrentPrice(
        this.config.symbol
      );
      this.state.currentPrice = currentPrice;
      this.martingalePosition.highest_price_seen = currentPrice;
      this.martingalePosition.entry_reference_price = currentPrice;

      console.log(
        `💰 Current price for ${this.config.symbol}: $${currentPrice}`
      );
      console.log(
        `📈 Entry trigger: ${this.martingaleConfig.entry_trigger.price_drop_percentage}% drop from highs`
      );
    } catch (error) {
      console.error(`❌ Failed to get current price: ${error}`);
      throw error;
    }

    // Validate Martingale configuration
    this.validateConfiguration();

    console.log(`✅ Martingale Strategy initialized for ${this.config.symbol}`);
    this.emit("initialized");
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ Martingale strategy is already running");
      return;
    }

    console.log(
      `🤖 Starting Martingale Trading Strategy for ${this.config.symbol}...`
    );
    console.log(
      `📉 Entry Trigger: ${this.martingaleConfig.entry_trigger.price_drop_percentage}% price drop`
    );
    console.log(
      `🎯 Exit Target: ${this.martingaleConfig.exit_strategy.profit_percentage}% profit from average cost`
    );
    console.log(
      `📈 Step Multiplier: ${this.martingaleConfig.step_multiplier}x (order scaling)`
    );
    console.log(
      `🛡️ Safety: Max ${this.martingaleConfig.max_orders} orders, ${this.martingaleConfig.safety_controls.max_position_multiple}x position limit`
    );

    this.isRunning = true;
    this.state.isActive = true;

    // Start price monitoring
    this.startPriceMonitoring();

    console.log(
      `✅ Martingale Trading Strategy started for ${this.config.symbol}`
    );
    this.emit("started");
  }

  async stop(): Promise<void> {
    console.log(
      `🛑 Stopping Martingale Trading Strategy for ${this.config.symbol}...`
    );

    this.isRunning = false;
    this.state.isActive = false;

    // Clear price monitoring
    if (this.priceMonitorInterval) {
      clearInterval(this.priceMonitorInterval);
      this.priceMonitorInterval = undefined;
    }

    console.log(
      `✅ Martingale Trading Strategy stopped for ${this.config.symbol}`
    );
    this.emit("stopped");
  }

  async handleOrderFill(fill: OrderFill | HyperliquidOrderFill): Promise<void> {
    if (!this.isRunning || fill.symbol !== this.config.symbol) return;

    console.log(
      `📈 Martingale order filled: ${fill.side} ${fill.size} ${this.config.symbol} @ $${fill.price}`
    );

    // Update position tracking
    this.updateMartingalePosition(fill);

    // Update base strategy metrics
    this.updateVolumeMetrics(fill);

    // Update current price
    this.state.currentPrice = fill.price;

    // Check exit conditions after each fill
    await this.checkExitConditions(fill.price);

    // Check risk management rules
    await this.checkRiskManagement(fill);

    this.emit("orderFilled", {
      fill,
      martingalePosition: this.martingalePosition,
    });
  }

  private validateConfiguration(): void {
    const config = this.martingaleConfig;

    // Validate step multiplier
    if (config.step_multiplier < 1.1 || config.step_multiplier > 5.0) {
      throw new Error(
        `step_multiplier (${config.step_multiplier}) must be between 1.1 and 5.0`
      );
    }

    // Validate max orders
    if (config.max_orders < 2 || config.max_orders > 10) {
      throw new Error(
        `max_orders (${config.max_orders}) must be between 2 and 10`
      );
    }

    // Calculate total potential investment
    const totalPotentialInvestment = this.calculateTotalPotentialInvestment();
    const maxPositionValue =
      this.config.investmentAmount *
      config.safety_controls.max_position_multiple;

    if (totalPotentialInvestment > maxPositionValue) {
      console.warn(
        `⚠️ Total potential investment ($${totalPotentialInvestment.toFixed(2)}) exceeds max position limit ($${maxPositionValue.toFixed(2)})`
      );
    }

    console.log(
      `💡 Martingale Config: Max potential investment: $${totalPotentialInvestment.toFixed(2)} (${config.max_orders} orders)`
    );
  }

  private calculateTotalPotentialInvestment(): number {
    let total = 0;
    let orderSize = this.martingaleConfig.base_order_size;

    for (let i = 0; i < this.martingaleConfig.max_orders; i++) {
      total += orderSize;
      orderSize *= this.martingaleConfig.step_multiplier;
    }

    return total;
  }

  private startPriceMonitoring(): void {
    // Monitor price every 30 seconds for entry/exit signals
    this.priceMonitorInterval = setInterval(async () => {
      if (!this.isRunning || this.isProcessingSignal) return;

      try {
        const currentPrice = await this.exchange.getCurrentPrice(
          this.config.symbol
        );
        await this.processPriceUpdate(currentPrice);
      } catch (error) {
        console.error(`❌ Error monitoring price: ${error}`);
      }
    }, 30000); // 30 seconds

    console.log(
      `👀 Price monitoring started for ${this.config.symbol} (30s intervals)`
    );
  }

  private async processPriceUpdate(currentPrice: number): Promise<void> {
    this.state.currentPrice = currentPrice;

    // Update highest price seen (for entry trigger reference)
    if (currentPrice > this.martingalePosition.highest_price_seen) {
      this.martingalePosition.highest_price_seen = currentPrice;

      // If not in position, update entry reference price
      if (!this.martingalePosition.is_in_position) {
        this.martingalePosition.entry_reference_price = currentPrice;
      }
    }

    // Check for entry signals (only if not in position)
    if (!this.martingalePosition.is_in_position) {
      await this.checkEntryConditions(currentPrice);
    } else {
      // Check for exit signals (only if in position)
      await this.checkExitConditions(currentPrice);
    }
  }

  private async checkEntryConditions(currentPrice: number): Promise<void> {
    const dropPercentage =
      this.martingaleConfig.entry_trigger.price_drop_percentage;
    const referencePrice = this.martingalePosition.entry_reference_price;
    const dropThreshold = referencePrice * (1 - dropPercentage / 100);

    if (currentPrice <= dropThreshold) {
      console.log(
        `🔻 Entry trigger activated! Price dropped ${dropPercentage}% from $${referencePrice.toFixed(2)} to $${currentPrice.toFixed(2)}`
      );

      await this.executeEntryOrder(currentPrice);
    }
  }

  private async executeEntryOrder(currentPrice: number): Promise<void> {
    if (this.isProcessingSignal) return;
    this.isProcessingSignal = true;

    try {
      // Check safety limits
      if (!this.canPlaceOrder()) {
        console.log(`🛑 Cannot place Martingale order - safety limits reached`);
        return;
      }

      const orderNumber = this.martingalePosition.orders.length + 1;
      const orderSizeUSD = this.martingalePosition.next_order_size;
      const orderSize = orderSizeUSD / currentPrice;

      console.log(
        `📝 Placing Martingale order #${orderNumber}: $${orderSizeUSD} (${orderSize.toFixed(6)} ${this.config.symbol})`
      );

      const orderRequest: OrderRequest = {
        symbol: this.config.symbol,
        side: "buy",
        type: "market",
        size: orderSize,
        price: currentPrice,
      };

      const orderResponse = await this.exchange.placeOrder(orderRequest);

      if (orderResponse.success) {
        // Track the order
        const martingaleOrder: MartingaleOrder = {
          id: orderResponse.orderId?.toString() || `martingale_${Date.now()}`,
          timestamp: new Date(),
          price: currentPrice,
          size: orderSize,
          order_number: orderNumber,
          filled: true,
          amount_usd: orderSizeUSD,
        };

        this.martingalePosition.orders.push(martingaleOrder);
        this.martingalePosition.is_in_position = true;

        // Calculate next order size for potential scaling
        this.martingalePosition.next_order_size =
          orderSizeUSD * this.martingaleConfig.step_multiplier;

        console.log(
          `✅ Martingale order #${orderNumber} placed: ${orderResponse.orderId}`
        );

        this.emit("entryOrderPlaced", {
          order: martingaleOrder,
          orderResponse,
        });
      } else {
        console.error(
          `❌ Failed to place Martingale order: ${orderResponse.error}`
        );
        this.emit("orderError", { error: orderResponse.error });
      }
    } catch (error) {
      console.error(`❌ Error executing entry order: ${error}`);
      this.emit("orderError", { error });
    } finally {
      this.isProcessingSignal = false;
    }
  }

  private async checkExitConditions(currentPrice: number): Promise<void> {
    if (
      !this.martingalePosition.is_in_position ||
      this.martingalePosition.average_entry_price === 0
    ) {
      return;
    }

    const profitPercentage =
      this.martingaleConfig.exit_strategy.profit_percentage;
    const targetPrice =
      this.martingalePosition.average_entry_price *
      (1 + profitPercentage / 100);

    if (currentPrice >= targetPrice) {
      console.log(
        `🎯 Exit trigger activated! Price reached profit target: $${currentPrice.toFixed(2)} >= $${targetPrice.toFixed(2)}`
      );

      await this.executeExitOrder(currentPrice);
    }
  }

  private async executeExitOrder(currentPrice: number): Promise<void> {
    if (this.isProcessingSignal || !this.martingalePosition.is_in_position)
      return;
    this.isProcessingSignal = true;

    try {
      console.log(
        `📝 Placing Martingale exit order: Sell ${this.martingalePosition.total_position.toFixed(6)} ${this.config.symbol}`
      );

      const orderRequest: OrderRequest = {
        symbol: this.config.symbol,
        side: "sell",
        type: "market",
        size: this.martingalePosition.total_position,
        price: currentPrice,
      };

      const orderResponse = await this.exchange.placeOrder(orderRequest);

      if (orderResponse.success) {
        const profit =
          (currentPrice - this.martingalePosition.average_entry_price) *
          this.martingalePosition.total_position;
        const profitPercent =
          (profit / this.martingalePosition.total_invested) * 100;

        console.log(
          `✅ Martingale exit order placed: ${orderResponse.orderId}`
        );
        console.log(
          `💰 Profit: $${profit.toFixed(2)} (${profitPercent.toFixed(2)}%)`
        );

        // Reset position (will be updated when order fills)
        this.emit("exitOrderPlaced", {
          orderResponse,
          profit,
          profitPercent,
          totalInvested: this.martingalePosition.total_invested,
          avgEntryPrice: this.martingalePosition.average_entry_price,
          exitPrice: currentPrice,
        });
      } else {
        console.error(`❌ Failed to place exit order: ${orderResponse.error}`);
        this.emit("orderError", { error: orderResponse.error });
      }
    } catch (error) {
      console.error(`❌ Error executing exit order: ${error}`);
      this.emit("orderError", { error });
    } finally {
      this.isProcessingSignal = false;
    }
  }

  private canPlaceOrder(): boolean {
    const position = this.martingalePosition;
    const config = this.martingaleConfig;

    // Check max orders limit
    if (position.orders.length >= config.max_orders) {
      console.log(
        `🛑 Max orders limit reached: ${position.orders.length}/${config.max_orders}`
      );
      return false;
    }

    // Check max position multiple limit
    const nextOrderValue = position.next_order_size;
    const totalPotentialInvestment = position.total_invested + nextOrderValue;
    const maxInvestment =
      this.config.investmentAmount *
      config.safety_controls.max_position_multiple;

    if (totalPotentialInvestment > maxInvestment) {
      console.log(
        `🛑 Max position limit would be exceeded: $${totalPotentialInvestment.toFixed(2)} > $${maxInvestment.toFixed(2)}`
      );
      return false;
    }

    return true;
  }

  private updateMartingalePosition(
    fill: OrderFill | HyperliquidOrderFill
  ): void {
    const position = this.martingalePosition;

    if (fill.side === "buy") {
      // Add to position
      const newInvestment = fill.size * fill.price;
      const totalInvested = position.total_invested + newInvestment;
      const totalPosition = position.total_position + fill.size;

      // Update average entry price
      if (totalPosition > 0) {
        position.average_entry_price = totalInvested / totalPosition;
      }

      position.total_invested = totalInvested;
      position.total_position = totalPosition;
      position.is_in_position = true;

      // Calculate profit target price
      position.profit_target_price =
        position.average_entry_price *
        (1 + this.martingaleConfig.exit_strategy.profit_percentage / 100);

      console.log(
        `📊 Martingale position updated: ${totalPosition.toFixed(6)} ${this.config.symbol}`
      );
      console.log(
        `💵 Total invested: $${totalInvested.toFixed(2)}, Avg entry: $${position.average_entry_price.toFixed(2)}`
      );
      console.log(
        `🎯 Profit target: $${position.profit_target_price.toFixed(2)}`
      );
    } else if (fill.side === "sell") {
      // Exit position (full or partial)
      const remainingPosition = Math.max(
        0,
        position.total_position - fill.size
      );

      if (remainingPosition === 0) {
        // Full exit - reset everything
        console.log(
          "🔄 Full Martingale position exited - resetting for next cycle"
        );
        this.resetMartingalePosition();
      } else {
        // Partial exit (shouldn't happen in our MVP but handle it)
        position.total_position = remainingPosition;
      }
    }

    // Update strategy state
    this.state.totalPosition = position.total_position;
  }

  private resetMartingalePosition(): void {
    this.martingalePosition = {
      orders: [],
      total_position: 0,
      total_invested: 0,
      average_entry_price: 0,
      highest_price_seen: this.state.currentPrice,
      entry_reference_price: this.state.currentPrice,
      is_in_position: false,
      next_order_size: this.martingaleConfig.base_order_size,
      profit_target_price: 0,
    };
  }

  private async checkRiskManagement(
    fill: OrderFill | HyperliquidOrderFill
  ): Promise<void> {
    if (!this.martingaleConfig.risk_management) return;

    const risk = this.martingaleConfig.risk_management;
    const currentPrice = fill.price;
    const position = this.martingalePosition;

    // Check stop loss (based on average entry price)
    if (
      risk.stop_loss?.enabled &&
      position.average_entry_price > 0 &&
      position.is_in_position
    ) {
      const stopLossPrice =
        position.average_entry_price * (1 - risk.stop_loss.percentage / 100);

      if (currentPrice <= stopLossPrice) {
        console.log(
          `🛑 Stop loss triggered! Current: $${currentPrice}, Stop: $${stopLossPrice.toFixed(2)}, Avg Entry: $${position.average_entry_price.toFixed(2)}`
        );

        this.emit("stopLossTriggered", {
          currentPrice,
          stopLossPrice,
          averageEntryPrice: position.average_entry_price,
          totalPosition: position.total_position,
          totalInvested: position.total_invested,
        });
      }
    }

    // Take profit is handled by the main exit strategy, but we can emit additional events
    if (
      risk.take_profit?.enabled &&
      position.average_entry_price > 0 &&
      position.is_in_position
    ) {
      const takeProfitPrice =
        position.average_entry_price * (1 + risk.take_profit.percentage / 100);

      if (currentPrice >= takeProfitPrice) {
        console.log(
          `🎯 Risk management take profit triggered! Current: $${currentPrice}, Target: $${takeProfitPrice.toFixed(2)}`
        );

        this.emit("takeProfitTriggered", {
          currentPrice,
          takeProfitPrice,
          averageEntryPrice: position.average_entry_price,
          totalPosition: position.total_position,
          totalInvested: position.total_invested,
        });
      }
    }
  }

  getStatistics(): any {
    const baseStats = super.getStatistics();
    const position = this.martingalePosition;

    const currentValue = position.total_position * this.state.currentPrice;
    const unrealizedPnL = currentValue - position.total_invested;
    const unrealizedPnLPercent =
      position.total_invested > 0
        ? (unrealizedPnL / position.total_invested) * 100
        : 0;

    const currentDropFromHigh =
      position.highest_price_seen > 0
        ? ((position.highest_price_seen - this.state.currentPrice) /
            position.highest_price_seen) *
          100
        : 0;

    return {
      ...baseStats,
      strategyType: "martingale",
      martingalePosition: {
        isInPosition: position.is_in_position,
        totalOrders: position.orders.length,
        totalPosition: position.total_position,
        totalInvested: position.total_invested,
        averageEntryPrice: position.average_entry_price,
        currentValue,
        unrealizedPnL,
        unrealizedPnLPercent,
        profitTargetPrice: position.profit_target_price,
        nextOrderSize: position.next_order_size,
        highestPriceSeen: position.highest_price_seen,
        currentDropFromHigh,
      },
      martingaleConfig: {
        stepMultiplier: this.martingaleConfig.step_multiplier,
        maxOrders: this.martingaleConfig.max_orders,
        baseOrderSize: this.martingaleConfig.base_order_size,
        entryTrigger: this.martingaleConfig.entry_trigger.price_drop_percentage,
        exitTarget: this.martingaleConfig.exit_strategy.profit_percentage,
        maxPositionMultiple:
          this.martingaleConfig.safety_controls.max_position_multiple,
      },
      triggers: {
        entryPrice: position.entry_reference_price,
        entryTriggerPrice:
          position.entry_reference_price *
          (1 - this.martingaleConfig.entry_trigger.price_drop_percentage / 100),
        profitTargetPrice: position.profit_target_price,
      },
      implemented: true,
    };
  }

  // Getter for external access to Martingale position
  getMartingalePosition(): MartingalePosition {
    return { ...this.martingalePosition };
  }

  // Method to manually trigger entry (for testing)
  async triggerManualEntry(): Promise<void> {
    if (!this.isRunning) {
      throw new Error("Strategy must be running to trigger manual entry");
    }

    if (this.martingalePosition.is_in_position) {
      throw new Error("Already in position - cannot trigger manual entry");
    }

    console.log(
      `🔄 Manual Martingale entry triggered for ${this.config.symbol}`
    );
    await this.executeEntryOrder(this.state.currentPrice);
  }

  // Method to manually trigger exit (for testing)
  async triggerManualExit(): Promise<void> {
    if (!this.isRunning) {
      throw new Error("Strategy must be running to trigger manual exit");
    }

    if (!this.martingalePosition.is_in_position) {
      throw new Error("Not in position - cannot trigger manual exit");
    }

    console.log(
      `🔄 Manual Martingale exit triggered for ${this.config.symbol}`
    );
    await this.executeExitOrder(this.state.currentPrice);
  }
}
