import { BaseTradingStrategy, StrategyConfig } from "./ITradingStrategy";
import {
  IExchange,
  OrderFill,
  CancelOrderRequest,
} from "../../interfaces/IExchange";
import {
  HyperliquidExchange,
  HyperliquidOrderFill,
} from "../../exchanges/HyperliquidExchange";
import { GridConfig, GridLevel } from "../types/BotTypes";
import {
  generateGridLevels,
  getDeterministicActiveLevels,
  calculateGridOrderSize,
  type GeneratedGridLevel,
  type GridGenerationResult,
  type OrderSizeResult,
} from "@hyperliquid-bot/utils";

interface GridStrategyConfig extends StrategyConfig {
  gridSpacing: number;
  gridQuantity: number;
  gridMode?: "arithmetic" | "geometric";
  upperBound?: number;
  lowerBound?: number;
  activeLevels?: number;
}

interface GridPosition {
  base_position: number;
  quote_balance: number;
  nearest_index: number;
  grid_levels: GeneratedGridLevel[];
  active_orders: Map<
    string,
    { price: number; side: "buy" | "sell"; level_index: number }
  >;
  executed_levels: Set<number>;
}

interface AssetMetadata {
  name: string;
  szDecimals: number;
  maxLeverage: number;
}

export class GridStrategy extends BaseTradingStrategy {
  private gridConfig: GridStrategyConfig;
  private gridPosition: GridPosition;
  private gridGenerationResult?: GridGenerationResult;
  private assetMetadata?: AssetMetadata;
  private processingFill = false;

  constructor(
    exchange: IExchange,
    config: StrategyConfig,
    botId?: string,
    userId?: string
  ) {
    super(exchange, config, botId, userId);

    // Extract grid-specific config from metadata or use legacy format
    this.gridConfig = {
      ...config,
      gridSpacing:
        config.metadata?.grid_spacing || config.metadata?.gridSpacing || 0.01,
      gridQuantity:
        config.metadata?.grid_quantity || config.metadata?.gridQuantity || 10,
      gridMode:
        config.metadata?.grid_mode || config.metadata?.gridMode || "arithmetic",
      upperBound: config.metadata?.upper_bound || config.metadata?.upperBound,
      lowerBound: config.metadata?.lower_bound || config.metadata?.lowerBound,
      activeLevels:
        config.metadata?.active_levels || config.metadata?.activeLevels || 2,
    };

    this.gridPosition = {
      base_position: 0,
      quote_balance: config.investmentAmount,
      nearest_index: 0,
      grid_levels: [],
      active_orders: new Map(),
      executed_levels: new Set(),
    };

    this.setupExchangeEventHandlers();
  }

  private setupExchangeEventHandlers(): void {
    this.exchange.on("reconnected", () => {
      if (this.isRunning) {
        console.log("🔄 Exchange reconnected - Restarting grid...");
        this.handleReconnection();
      }
    });

    this.exchange.on("disconnected", () => {
      if (this.isRunning) {
        console.log("🔌 Exchange disconnected - Grid paused");
      }
    });

    this.exchange.on("error", (error: any) => {
      console.log("❌ Exchange error:", error);
      this.emit("error", error);
    });
  }

  async initialize(): Promise<void> {
    try {
      console.log(`🚀 Initializing Grid Strategy for ${this.config.symbol}...`);

      if (!this.exchange.isConnected()) {
        await this.exchange.connect();
      }

      await this.fetchAssetMetadata();

      const currentPrice = await this.exchange.getCurrentPrice(
        this.config.symbol
      );
      this.state.currentPrice = currentPrice;

      this.initializeGridStructure(currentPrice);

      console.log(
        `✅ Grid initialized with ${this.gridPosition.grid_levels.length} levels around $${currentPrice}`
      );
      console.log(`🎯 Active levels: ${this.gridConfig.activeLevels} per side`);

      this.emit("initialized");
    } catch (error) {
      console.error("❌ Failed to initialize grid strategy:", error);
      this.emit("error", error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ Grid strategy is already running");
      return;
    }

    try {
      this.isRunning = true;
      this.state.isActive = true;

      console.log("🤖 Starting Grid Trading Strategy...");

      await this.cancelAllOrders();
      await this.placeInitialGridOrders();
      await this.startOrderMonitoring();

      console.log("✅ Grid Trading Strategy is now active!");
      this.emit("started");
    } catch (error) {
      console.error("❌ Failed to start grid strategy:", error);
      this.isRunning = false;
      this.state.isActive = false;
      this.emit("error", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log("🛑 Stopping Grid Trading Strategy...");

    this.isRunning = false;
    this.state.isActive = false;
    this.processingFill = false;

    await this.cancelAllOrders();
    this.gridPosition.active_orders.clear();

    await this.exchange.unsubscribeFromPriceUpdates(this.config.symbol);
    await this.exchange.unsubscribeFromOrderFills();

    console.log("✅ Grid Trading Strategy stopped");
    this.emit("stopped");
  }

  async handleOrderFill(fill: OrderFill | HyperliquidOrderFill): Promise<void> {
    if (!this.isRunning || fill.symbol !== this.config.symbol) return;

    if (this.processingFill) {
      console.log(
        `⏭️ Skipping fill processing (already in progress): ${fill.orderId}`
      );
      return;
    }

    console.log(`\n🎯 ===== GRID ORDER FILL PROCESSING START =====`);
    console.log(
      `Fill: ${fill.side} ${fill.size} @ $${fill.price} (ID: ${fill.orderId})`
    );

    try {
      this.processingFill = true;

      // Update position after fill
      this.updatePositionAfterFill(fill);

      // Update current price
      this.state.currentPrice = fill.price;

      // Cancel all remaining orders (clean slate approach)
      await this.cancelAllRemainingOrders(fill.orderId.toString());

      // Place fresh grid orders
      await this.placeFreshGridOrders();

      // Update metrics
      this.updateVolumeMetrics(fill);

      console.log(`✅ ===== GRID ORDER FILL PROCESSING COMPLETE =====\n`);
      this.emit("orderFilled", { fill });
    } catch (error) {
      console.error(`❌ Error processing order fill:`, error);
    } finally {
      this.processingFill = false;
    }
  }

  private initializeGridStructure(currentPrice: number): void {
    console.log("📊 Generating grid levels using shared utility...");

    try {
      // Convert to the format expected by the utility
      const utilConfig = {
        symbol: this.config.symbol,
        gridSpacing: this.gridConfig.gridSpacing,
        gridQuantity: this.gridConfig.gridQuantity,
        investmentAmount: this.config.investmentAmount,
        maxPosition: this.config.maxPosition,
        upperBound: this.gridConfig.upperBound,
        lowerBound: this.gridConfig.lowerBound,
        gridMode: this.gridConfig.gridMode,
        activeLevels: this.gridConfig.activeLevels,
      };

      this.gridGenerationResult = generateGridLevels(utilConfig, currentPrice);
      this.gridPosition.grid_levels = this.gridGenerationResult.levels;
      this.gridPosition.nearest_index = this.gridGenerationResult.nearestIndex;

      console.log(
        `📊 Generated ${this.gridPosition.grid_levels.length} total price levels`
      );
    } catch (error) {
      console.error("❌ Failed to generate grid levels:", error);
      throw error;
    }
  }

  private async placeInitialGridOrders(): Promise<void> {
    const currentPrice = this.state.currentPrice;

    console.log(`📋 Placing initial grid orders at price $${currentPrice}`);

    const utilConfig = {
      symbol: this.config.symbol,
      gridSpacing: this.gridConfig.gridSpacing,
      gridQuantity: this.gridConfig.gridQuantity,
      investmentAmount: this.config.investmentAmount,
      maxPosition: this.config.maxPosition,
      upperBound: this.gridConfig.upperBound,
      lowerBound: this.gridConfig.lowerBound,
      gridMode: this.gridConfig.gridMode,
      activeLevels: this.gridConfig.activeLevels,
    };

    const activeLevelsResult = getDeterministicActiveLevels(
      utilConfig,
      currentPrice,
      this.gridPosition.executed_levels
    );

    const { activeBuyLevels, activeSellLevels } = activeLevelsResult;
    const allLevels = [...activeBuyLevels, ...activeSellLevels];

    if (allLevels.length === 0) {
      console.log("⚠️ No levels available for initial placement");
      return;
    }

    console.log(
      `📋 Placing ${activeBuyLevels.length} buy + ${activeSellLevels.length} sell = ${allLevels.length} total orders`
    );

    await this.placeOrdersForLevels(allLevels);
  }

  private async placeOrdersForLevels(
    levels: Array<{ index: number; price: number; side: "buy" | "sell" }>
  ): Promise<void> {
    if (levels.length > 10) {
      console.error(
        `❌ SAFETY: Attempting to place ${levels.length} orders, limiting to 10`
      );
      levels.splice(10);
    }

    if (levels.length === 0) {
      console.log("⚠️ No orders to place");
      return;
    }

    const orderSize = this.roundSize(
      this.config.investmentAmount / this.gridConfig.gridQuantity
    );

    const orderRequests = levels.map((level) => ({
      symbol: this.config.symbol,
      side: level.side,
      size: orderSize,
      price: level.price,
    }));

    console.log(
      `🚀 BULK PLACEMENT: Placing ${orderRequests.length} orders simultaneously`
    );

    try {
      const responses = await this.exchange.placeOrders(orderRequests);

      let successfulPlacements = 0;
      responses.forEach((resp, i) => {
        const level = levels[i];
        const request = orderRequests[i];

        if (resp && resp.success && resp.orderId) {
          this.gridPosition.active_orders.set(resp.orderId.toString(), {
            price: level.price,
            side: level.side,
            level_index: level.index,
          });

          successfulPlacements++;
          console.log(
            `✅ BULK: ${request.side} ${request.size} @ $${request.price} (ID: ${resp.orderId})`
          );
        } else {
          const errorMsg = resp?.error || "Unknown error";
          console.error(
            `❌ BULK: Failed ${request.side} @ $${request.price} - ${errorMsg}`
          );
        }
      });

      console.log(
        `✅ BULK PLACEMENT COMPLETED: ${successfulPlacements}/${orderRequests.length} orders placed successfully`
      );
    } catch (error) {
      console.error("❌ Error in bulk order placement:", error);
      throw error;
    }
  }

  private updatePositionAfterFill(
    fill: OrderFill | HyperliquidOrderFill
  ): void {
    const orderInfo = this.gridPosition.active_orders.get(
      fill.orderId.toString()
    );

    if (!orderInfo) {
      console.warn(`⚠️ Fill for unknown order: ${fill.orderId}`);
      return;
    }

    if (fill.side === "buy") {
      this.gridPosition.base_position += fill.size;
      this.gridPosition.quote_balance -= fill.size * fill.price;
    } else {
      this.gridPosition.base_position -= fill.size;
      this.gridPosition.quote_balance += fill.size * fill.price;
    }

    this.gridPosition.executed_levels.add(orderInfo.level_index);
    this.gridPosition.active_orders.delete(fill.orderId.toString());

    this.state.totalPosition = this.gridPosition.base_position;

    console.log(
      `📊 Position updated: ${this.gridPosition.base_position.toFixed(6)} base, $${this.gridPosition.quote_balance.toFixed(2)} quote`
    );
  }

  private async cancelAllRemainingOrders(filledOrderId: string): Promise<void> {
    const allOrderIds = Array.from(this.gridPosition.active_orders.keys());
    const ordersToCancel = allOrderIds.filter(
      (orderId) => orderId !== filledOrderId
    );

    if (ordersToCancel.length > 0) {
      const cancelRequests: CancelOrderRequest[] = ordersToCancel.map(
        (orderId) => ({
          orderId: orderId,
          symbol: this.config.symbol,
        })
      );

      try {
        const responses = await this.exchange.cancelOrders(cancelRequests);
        responses.forEach((response, index) => {
          const orderId = ordersToCancel[index];
          if (response.success) {
            console.log(`✅ Cancelled order: ${orderId}`);
          } else {
            console.warn(
              `⚠️ Failed to cancel order ${orderId}: ${response.error}`
            );
          }
        });
      } catch (error) {
        console.error(`❌ Bulk cancel failed:`, error);
      }
    }

    this.gridPosition.active_orders.clear();
  }

  private async placeFreshGridOrders(): Promise<void> {
    const activeLevels = this.gridConfig.activeLevels || 2;
    const currentPrice = this.state.currentPrice;

    const utilConfig = {
      symbol: this.config.symbol,
      gridSpacing: this.gridConfig.gridSpacing,
      gridQuantity: this.gridConfig.gridQuantity,
      investmentAmount: this.config.investmentAmount,
      maxPosition: this.config.maxPosition,
      upperBound: this.gridConfig.upperBound,
      lowerBound: this.gridConfig.lowerBound,
      gridMode: this.gridConfig.gridMode,
      activeLevels: this.gridConfig.activeLevels,
    };

    const activeLevelsResult = getDeterministicActiveLevels(
      utilConfig,
      currentPrice,
      new Set() // Fresh start, ignore executed levels
    );

    const { activeBuyLevels, activeSellLevels } = activeLevelsResult;
    const finalBuyLevels = activeBuyLevels.slice(0, activeLevels);
    const finalSellLevels = activeSellLevels.slice(0, activeLevels);

    const freshLevels = [...finalBuyLevels, ...finalSellLevels].map(
      (level: GeneratedGridLevel) => ({
        index: level.index,
        price: level.price,
        side: level.side as "buy" | "sell",
      })
    );

    if (freshLevels.length > 0) {
      console.log(`Placing exactly ${freshLevels.length} fresh orders...`);
      await this.placeOrdersForLevels(freshLevels);
    }
  }

  private async startOrderMonitoring(): Promise<void> {
    try {
      await this.exchange.subscribeToOrderFills(
        (fill: OrderFill | HyperliquidOrderFill) => {
          this.handleOrderFill(fill);
        }
      );
      console.log("✅ Order monitoring started");
    } catch (error) {
      console.error("❌ Failed to start order monitoring:", error);
      throw error;
    }
  }

  private async cancelAllOrders(): Promise<void> {
    try {
      console.log("🧹 Cancelling all orders...");
      const success = await this.exchange.cancelAllOrders(this.config.symbol);

      if (success) {
        this.gridPosition.active_orders.clear();
        console.log("✅ All orders cancelled");
      }
    } catch (error) {
      console.error("❌ Error cancelling orders:", error);
    }
  }

  private async fetchAssetMetadata(): Promise<void> {
    if (this.assetMetadata) return;

    try {
      if (this.exchange instanceof HyperliquidExchange) {
        const metadata = await this.exchange.getAssetMetadata(
          this.config.symbol
        );
        this.assetMetadata = {
          name: metadata.name,
          szDecimals: metadata.szDecimals,
          maxLeverage: metadata.maxLeverage,
        };
      } else {
        this.assetMetadata = {
          name: this.config.symbol,
          szDecimals: 4,
          maxLeverage: 1,
        };
      }
    } catch (error) {
      console.error("❌ Failed to fetch asset metadata:", error);
      this.assetMetadata = {
        name: this.config.symbol,
        szDecimals: 4,
        maxLeverage: 1,
      };
    }
  }

  private roundSize(size: number): number {
    if (!this.assetMetadata) {
      return Math.round(size * 1000) / 1000;
    }

    const metadata = this.assetMetadata;
    const factor = Math.pow(10, metadata.szDecimals);
    return Math.round(size * factor) / factor;
  }

  private calculateOrderSize(): {
    orderSize: number;
    calculationDetails: string;
  } {
    const investmentType = this.config.metadata?.investment_type || "usd";
    const szDecimals = this.assetMetadata?.szDecimals || 4;

    const result = calculateGridOrderSize(
      this.config.investmentAmount,
      this.gridConfig.gridQuantity,
      this.state.currentPrice,
      this.config.symbol,
      investmentType as "usd" | "asset",
      szDecimals
    );

    return {
      orderSize: result.orderSize,
      calculationDetails: result.calculationDetails,
    };
  }

  private async handleReconnection(): Promise<void> {
    try {
      console.log("🔄 Handling grid reconnection...");
      this.gridPosition.active_orders.clear();
      await this.cancelAllOrders();
      await this.placeInitialGridOrders();
      await this.startOrderMonitoring();
      console.log("✅ Grid successfully restarted after reconnection!");
    } catch (error) {
      console.error("❌ Failed to restart grid after reconnection:", error);
    }
  }

  getStatistics() {
    const baseStats = super.getStatistics();
    return {
      ...baseStats,
      activeOrders: this.gridPosition.active_orders.size,
      filledOrders: this.gridPosition.executed_levels.size,
      gridLevels: this.gridPosition.grid_levels.length,
      activeLevels: this.gridConfig.activeLevels,
    };
  }
}
