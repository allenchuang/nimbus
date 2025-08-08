import { Hyperliquid } from "hyperliquid";
import { EventEmitter } from "events";
import {
  IExchange,
  OrderRequest,
  OrderResponse,
  CancelOrderRequest,
  CancelOrderResponse,
  OpenOrder,
  OrderFill,
  PriceUpdate,
  Balance,
  Position,
  ExchangeConfig,
} from "../types";

// Extended interface for Hyperliquid-specific order fills
export interface HyperliquidOrderFill extends OrderFill {
  startPosition: string;
  dir: string;
  closedPnl: string;
  hash: string;
  crossed: boolean;
  fee: string;
  tid: number;
}

export interface HyperliquidConfig extends ExchangeConfig {
  walletAddress: string;
  privateKey: string;
  testnet?: boolean;
  enableWs?: boolean;
  maxReconnectAttempts?: number;
}

export class HyperliquidExchange extends EventEmitter implements IExchange {
  private sdk: Hyperliquid;
  private config: HyperliquidConfig;
  private connected = false;
  private authenticated = false;
  private priceSubscriptions = new Map<string, (update: PriceUpdate) => void>();
  private fillCallback?: (fill: HyperliquidOrderFill) => void;

  /**
   * Normalize symbol for Hyperliquid API - adds -PERP suffix if not present
   */
  private normalizeSymbol(symbol: string): string {
    if (!symbol.includes("-PERP")) {
      return `${symbol}-PERP`;
    }
    return symbol;
  }

  constructor(config: HyperliquidConfig) {
    super();

    if (!config.walletAddress) {
      throw new Error("Wallet address is required for Hyperliquid");
    }
    if (!config.privateKey) {
      throw new Error("Private key is required for Hyperliquid");
    }

    this.config = {
      testnet: true,
      enableWs: true,
      maxReconnectAttempts: 10,
      ...config,
    };

    this.sdk = new Hyperliquid({
      enableWs: this.config.enableWs,
      privateKey: this.config.privateKey,
      testnet: this.config.testnet,
      walletAddress: this.config.walletAddress,
      maxReconnectAttempts: this.config.maxReconnectAttempts,
    });

    // Don't setup event handlers immediately - wait for connection
  }

  private setupEventHandlers(): void {
    // Check if WebSocket is available before setting up handlers
    if (this.sdk.ws && typeof this.sdk.ws.on === "function") {
      this.sdk.ws.on("open", () => {
        this.connected = true;
        this.emit("reconnected");
      });

      this.sdk.ws.on("close", () => {
        this.connected = false;
        this.emit("disconnected");
      });

      this.sdk.ws.on("error", (error: any) => {
        this.emit("error", error);
      });
    } else {
      console.warn("Hyperliquid WebSocket not available for event handling");
    }
  }

  async connect(): Promise<void> {
    try {
      console.log("🔌 Connecting to Hyperliquid...");
      console.log(`🔍 Debug - Config:`, {
        testnet: this.config.testnet,
        enableWs: this.config.enableWs,
        maxReconnectAttempts: this.config.maxReconnectAttempts,
        hasPrivateKey: !!this.config.privateKey,
        hasWalletAddress: !!this.config.walletAddress,
      });

      console.log(`🔍 Debug - Before connect:`, {
        sdkExists: !!this.sdk,
        wsExists: !!this.sdk.ws,
        subscriptionsExists: !!this.sdk.subscriptions,
      });

      await this.sdk.connect();

      console.log(`🔍 Debug - After sdk.connect():`, {
        sdkExists: !!this.sdk,
        wsExists: !!this.sdk.ws,
        subscriptionsExists: !!this.sdk.subscriptions,
        isAuthenticated: this.sdk.isAuthenticated(),
      });

      // Setup event handlers after connection is established
      this.setupEventHandlers();

      // Try to explicitly connect WebSocket if it exists
      if (this.config.enableWs && this.sdk.ws) {
        console.log("⏳ Explicitly connecting WebSocket...");

        // Check if there's a connect method on the WebSocket
        if (typeof this.sdk.ws.connect === "function") {
          try {
            await this.sdk.ws.connect();
            console.log("✅ WebSocket explicitly connected");
          } catch (wsConnectError) {
            console.log(
              "⚠️ WebSocket explicit connect failed:",
              wsConnectError
            );
          }
        }

        // Give WebSocket time to stabilize
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Try a test connection to verify WebSocket is working
        console.log("🧪 Testing WebSocket connection...");
        try {
          // Try to get current price first to ensure REST API works
          const testPrice = await this.getCurrentPrice("BTC-PERP");
          console.log(`📊 REST API test successful: BTC-PERP = $${testPrice}`);

          // Test WebSocket by creating a subscription (don't wait for data - candles only come every minute)
          try {
            console.log("🧪 Testing WebSocket subscription creation...");
            await this.sdk.subscriptions.subscribeToCandle(
              "BTC-PERP",
              "1m",
              () => {
                console.log(
                  "🔗 WebSocket test subscription received data (this is expected to be delayed)"
                );
              }
            );

            console.log("✅ WebSocket test subscription created successfully");

            // Immediately unsubscribe from test
            try {
              await this.sdk.subscriptions.unsubscribeFromCandle(
                "BTC-PERP",
                "1m"
              );
              console.log("✅ WebSocket test unsubscribed successfully");
            } catch (unsubError) {
              console.log(
                "⚠️ WebSocket test unsubscribe failed (not critical):",
                unsubError
              );
            }
          } catch (wsTestError) {
            console.log(`🔍 RAW WEBSOCKET TEST ERROR:`, wsTestError);
            console.log(`🔍 RAW WS TEST ERROR TYPE:`, typeof wsTestError);
            console.log(
              `🔍 RAW WS TEST ERROR CONSTRUCTOR:`,
              wsTestError?.constructor?.name
            );
            console.log(
              `🔍 RAW WS TEST ERROR MESSAGE:`,
              wsTestError instanceof Error
                ? wsTestError.message
                : String(wsTestError)
            );
            console.log(
              `🔍 RAW WS TEST ERROR STACK:`,
              wsTestError instanceof Error
                ? wsTestError.stack
                : "No stack trace"
            );
            console.log(
              `🔍 RAW WS TEST ERROR FULL:`,
              JSON.stringify(wsTestError, null, 2)
            );
            throw wsTestError;
          }

          console.log("✅ WebSocket test successful!");
        } catch (testError) {
          console.error("❌ WebSocket test failed:", testError);
          throw new Error(`WebSocket connection test failed: ${testError}`);
        }
      }

      this.connected = true;
      this.authenticated = this.sdk.isAuthenticated();

      if (!this.authenticated) {
        throw new Error("Failed to authenticate with Hyperliquid");
      }

      console.log("✅ Hyperliquid connection established");
    } catch (error) {
      console.error("❌ Failed to connect to Hyperliquid:", error);
      this.connected = false;
      this.authenticated = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Unsubscribe from all subscriptions
    for (const symbol of this.priceSubscriptions.keys()) {
      await this.unsubscribeFromPriceUpdates(symbol);
    }

    if (this.fillCallback) {
      await this.unsubscribeFromOrderFills();
    }

    this.connected = false;
    this.authenticated = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const allMids = await this.sdk.info.getAllMids();

      // Normalize symbol using helper method
      const normalizedSymbol = this.normalizeSymbol(symbol);

      // Try normalized symbol first
      let price = parseFloat(allMids[normalizedSymbol]);

      // If that fails, try original symbol
      if (!price && normalizedSymbol !== symbol) {
        price = parseFloat(allMids[symbol]);
      }

      if (!price) {
        console.log(
          `🔍 Debug - Available symbols:`,
          Object.keys(allMids).slice(0, 10)
        );
        throw new Error(
          `Failed to get current price for ${symbol} (tried: ${normalizedSymbol})`
        );
      }

      console.log(
        `📊 Price found for ${symbol} -> ${normalizedSymbol}: $${price}`
      );
      return price;
    } catch (error) {
      throw new Error(`Failed to get price for ${symbol}: ${error}`);
    }
  }

  async subscribeToPriceUpdates(
    symbol: string,
    callback: (update: PriceUpdate) => void
  ): Promise<void> {
    try {
      // Debug: Check SDK connection state
      console.log(`🔍 Debug - Connection states:`, {
        ourConnected: this.connected,
        ourAuthenticated: this.authenticated,
        enableWs: this.config.enableWs,
        sdkExists: !!this.sdk,
        wsExists: !!this.sdk.ws,
        subscriptionsExists: !!this.sdk.subscriptions,
      });

      // Check connection status before subscribing
      if (!this.connected || !this.authenticated) {
        console.log(
          `⚠️ WebSocket not connected or not authenticated. Attempting to reconnect...`
        );
        await this.connect();

        // Wait for connection to stabilize
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Debug: Check SDK connection state after reconnect
      console.log(`🔍 Debug - After reconnect:`, {
        ourConnected: this.connected,
        ourAuthenticated: this.authenticated,
        sdkExists: !!this.sdk,
        wsExists: !!this.sdk.ws,
        subscriptionsExists: !!this.sdk.subscriptions,
      });

      // Verify connection again after attempt
      if (!this.connected || !this.authenticated) {
        throw new Error(
          "WebSocket is not connected or authenticated after reconnection attempt"
        );
      }

      // Check if SDK WebSocket is actually ready
      if (!this.sdk.ws) {
        throw new Error("Hyperliquid SDK WebSocket is not available");
      }

      console.log(`📡 Subscribing to price updates for ${symbol}...`);

      // Try WebSocket subscription with RAW error logging
      try {
        await this.sdk.subscriptions.subscribeToCandle(symbol, "1m", (data) => {
          const price = parseFloat(data?.c.toString() || "0");
          if (price) {
            callback({
              symbol,
              price,
              timestamp: Date.now(),
            });
          }
        });

        this.priceSubscriptions.set(symbol, callback);
        console.log(
          `✅ Successfully subscribed to price updates for ${symbol}`
        );
      } catch (wsError) {
        console.log(`🔍 RAW HYPERLIQUID ERROR:`, wsError);
        console.log(`🔍 RAW ERROR TYPE:`, typeof wsError);
        console.log(`🔍 RAW ERROR CONSTRUCTOR:`, wsError?.constructor?.name);
        console.log(
          `🔍 RAW ERROR MESSAGE:`,
          wsError instanceof Error ? wsError.message : String(wsError)
        );
        console.log(
          `🔍 RAW ERROR STACK:`,
          wsError instanceof Error ? wsError.stack : "No stack trace"
        );
        console.log(
          `🔍 RAW ERROR FULL OBJECT:`,
          JSON.stringify(wsError, null, 2)
        );

        // Re-throw the original error without modification
        throw wsError;
      }
    } catch (error) {
      console.error(
        `❌ Failed to subscribe to price updates for ${symbol}:`,
        error
      );
      throw new Error(
        `Failed to subscribe to price updates for ${symbol}: ${error}`
      );
    }
  }

  async unsubscribeFromPriceUpdates(symbol: string): Promise<void> {
    try {
      await this.sdk.subscriptions.unsubscribeFromCandle(symbol, "1m");
      this.priceSubscriptions.delete(symbol);
    } catch (error) {
      throw new Error(
        `Failed to unsubscribe from price updates for ${symbol}: ${error}`
      );
    }
  }

  async placeOrder(request: OrderRequest): Promise<OrderResponse> {
    try {
      const normalizedSymbol = this.normalizeSymbol(request.symbol);

      console.log(`🔍 Placing order on Hyperliquid:`, {
        coin: normalizedSymbol,
        is_buy: request.side === "buy",
        sz: request.size,
        limit_px: request.price,
        ...(request.type === "market"
          ? { order_type: { trigger: { isMarket: true } } }
          : { order_type: { limit: { tif: "Gtc" } } }),
        reduce_only: request.reduceOnly || false,
      });

      // Construct the order object according to the expected type
      let order: any = {
        coin: normalizedSymbol,
        is_buy: request.side === "buy",
        sz: request.size,
        limit_px: request.price,
        reduce_only: request.reduceOnly || false,
      };

      if (request.type === "market") {
        // For market orders, Hyperliquid expects a trigger order with required fields
        order.order_type = {
          trigger: {
            isMarket: true,
            triggerPx: request.price, // You may need to adjust this depending on API requirements
            tpsl: "sl",
          },
        };
      } else {
        // For limit orders
        order.order_type = {
          limit: { tif: "Gtc" },
        };
      }

      const response = await this.sdk.exchange.placeOrder(order);

      console.log(
        `🔍 Raw Hyperliquid API response:`,
        JSON.stringify(response, null, 2)
      );

      // Handle error responses first
      if (response.status === "err") {
        const errorMessage =
          typeof response.response === "string"
            ? response.response
            : response.response?.message ||
              response.response?.msg ||
              "Unknown error from Hyperliquid";

        console.log(`❌ Hyperliquid API error: ${errorMessage}`);
        return {
          success: false,
          error: errorMessage,
        };
      }

      // Handle successful responses
      if (response.status === "ok" && response.response?.data?.statuses?.[0]) {
        const status = response.response.data.statuses[0];

        console.log(`🔍 Order status object:`, JSON.stringify(status, null, 2));

        // Check for error in the status first
        if (status.error) {
          console.log(`❌ Order error from Hyperliquid: ${status.error}`);
          return {
            success: false,
            error: status.error,
          };
        }

        // Check for resting order (order placed and waiting)
        if (status.resting?.oid) {
          console.log(`✅ Resting order found with ID: ${status.resting.oid}`);
          return {
            success: true,
            orderId: status.resting.oid,
          };
        }

        // Check for filled order (order executed immediately)
        if (status.filled?.oid) {
          console.log(`✅ Filled order found with ID: ${status.filled.oid}`);
          return {
            success: true,
            orderId: status.filled.oid,
            immediatelyFilled: true,
            fillPrice: parseFloat(status.filled.avgPx),
            fillSize: parseFloat(status.filled.totalSz),
          };
        }

        console.log(`❌ No resting or filled order found in status:`, {
          hasResting: !!status.resting,
          hasFilled: !!status.filled,
          hasError: !!status.error,
          statusKeys: Object.keys(status),
        });

        return {
          success: false,
          error: "Unexpected order status",
        };
      } else {
        console.log(`❌ API response not OK or missing status:`, {
          status: response.status,
          hasResponse: !!response.response,
          hasData: !!response.response?.data,
          hasStatuses: !!response.response?.data?.statuses,
          statusesLength: response.response?.data?.statuses?.length || 0,
        });

        // Try to extract error message from various possible locations
        let errorMessage = "Unknown error";

        if (typeof response.response === "string") {
          errorMessage = response.response;
        } else if (response.response?.data?.msg) {
          errorMessage = response.response.data.msg;
        } else if (response.response?.message) {
          errorMessage = response.response.message;
        } else if (response.response?.error) {
          errorMessage = response.response.error;
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      console.error(`❌ Exception in placeOrder:`, error);
      return {
        success: false,
        error: `Failed to place order: ${error}`,
      };
    }
  }

  async placeOrders(requests: OrderRequest[]): Promise<OrderResponse[]> {
    if (!Array.isArray(requests) || requests.length === 0) return [];
    if (requests.length === 1) {
      const resp = await this.placeOrder(requests[0]);
      return [resp];
    }
    try {
      // Build SDK-specific order objects (not OrderRequest)
      // This is NOT an OrderRequest[]!
      const sdkOrders = requests.map((req) => ({
        coin: this.normalizeSymbol(req.symbol),
        is_buy: req.side === "buy",
        sz: req.size,
        limit_px: req.price,
        order_type: { limit: { tif: "Gtc" } },
        reduce_only: req.reduceOnly || false,
      }));
      // Call the SDK batch order endpoint (accepts custom order type)
      // Type assertion is safe: SDK expects this structure, not our OrderRequest[]
      const response = await (this.sdk.exchange.placeOrder as any)({
        orders: sdkOrders,
      });
      if (
        response.status === "ok" &&
        response.response?.data?.statuses &&
        Array.isArray(response.response.data.statuses)
      ) {
        return response.response.data.statuses.map((status: any) => {
          if (status.error) {
            return { success: false, error: status.error };
          }
          if (status.resting?.oid) {
            return { success: true, orderId: status.resting.oid };
          }
          if (status.filled?.oid) {
            return {
              success: true,
              orderId: status.filled.oid,
              immediatelyFilled: true,
              fillPrice: parseFloat(status.filled.avgPx),
              fillSize: parseFloat(status.filled.totalSz),
            };
          }
          return { success: false, error: "Unknown status" };
        });
      }
      return requests.map(() => ({
        success: false,
        error: "Batch order failed or unexpected response",
      }));
    } catch (error) {
      return requests.map(() => ({
        success: false,
        error: `Batch order exception: ${error}`,
      }));
    }
  }

  async cancelOrder(request: CancelOrderRequest): Promise<boolean> {
    try {
      const response = await this.sdk.exchange.cancelOrder({
        coin: this.normalizeSymbol(request.symbol),
        o: Number(request.orderId),
      });

      return response.status === "ok";
    } catch (error) {
      console.error(`Failed to cancel order ${request.orderId}:`, error);
      return false;
    }
  }

  async cancelOrders(
    requests: CancelOrderRequest[]
  ): Promise<CancelOrderResponse[]> {
    if (!Array.isArray(requests) || requests.length === 0) {
      return [];
    }

    // Handle single order case
    if (requests.length === 1) {
      const request = requests[0];
      try {
        const success = await this.cancelOrder(request);
        return [
          {
            success,
            orderId: request.orderId,
            error: success ? undefined : "Failed to cancel order",
          },
        ];
      } catch (error) {
        return [
          {
            success: false,
            orderId: request.orderId,
            error: `Exception: ${error}`,
          },
        ];
      }
    }

    try {
      // Build SDK-specific cancel requests
      const cancelRequests = requests.map((req) => ({
        coin: this.normalizeSymbol(req.symbol),
        o: Number(req.orderId),
      }));

      console.log(
        `🚀 BULK CANCEL: Cancelling ${cancelRequests.length} orders simultaneously`
      );

      // Call the SDK bulk cancel endpoint
      const response = await this.sdk.exchange.cancelOrder(cancelRequests);

      // For bulk cancellation, Hyperliquid doesn't provide per-order status
      // so we assume all succeeded if the overall response is OK
      if (response.status === "ok") {
        return requests.map((req) => ({
          success: true,
          orderId: req.orderId,
        }));
      } else {
        // If bulk cancel failed, mark all as failed
        const errorMessage =
          typeof response.response === "string"
            ? response.response
            : "Bulk cancel failed";

        return requests.map((req) => ({
          success: false,
          orderId: req.orderId,
          error: errorMessage,
        }));
      }
    } catch (error) {
      console.error("❌ Exception in bulk cancel:", error);
      // If exception occurred, mark all as failed
      return requests.map((req) => ({
        success: false,
        orderId: req.orderId,
        error: `Bulk cancel exception: ${error}`,
      }));
    }
  }

  async cancelAllOrders(symbol: string): Promise<boolean> {
    try {
      const normalizedSymbol = this.normalizeSymbol(symbol);
      const openOrders = await this.getOpenOrders(normalizedSymbol);

      if (openOrders.length === 0) {
        return true;
      }

      const cancelRequests = openOrders.map((order) => ({
        coin: this.normalizeSymbol(order.symbol),
        o: Number(order.orderId),
      }));

      const response = await this.sdk.exchange.cancelOrder(cancelRequests);
      return response.status === "ok";
    } catch (error) {
      console.error(`Failed to cancel all orders for ${symbol}:`, error);
      return false;
    }
  }

  async getOpenOrders(symbol?: string): Promise<OpenOrder[]> {
    try {
      const orders = await this.sdk.info.getUserOpenOrders(
        this.config.walletAddress
      );

      const filteredOrders = symbol
        ? orders.filter((order) => order.coin === symbol)
        : orders;

      return filteredOrders.map((order) => ({
        symbol: order.coin,
        orderId: order.oid,
        side: order.side.toLowerCase() as "buy" | "sell",
        size: parseFloat(order.sz),
        price: parseFloat(order.limitPx),
        filled: 0, // Hyperliquid doesn't provide partial fill info in open orders
      }));
    } catch (error) {
      throw new Error(`Failed to get open orders: ${error}`);
    }
  }

  async getBalance(symbol?: string): Promise<Balance[]> {
    try {
      // TODO: Implement proper balance fetching for Hyperliquid
      // For now, return a placeholder implementation
      return [
        {
          symbol: "USD",
          free: 0,
          locked: 0,
          total: 0,
        },
      ];
    } catch (error) {
      throw new Error(`Failed to get balance: ${error}`);
    }
  }

  async getPosition(symbol: string): Promise<Position> {
    try {
      // Use Hyperliquid InfoAPI getClearinghouseState to get real perpetual positions
      // TODO: Add support for SpotInfoAPI - SpotInfoAPI.getClearinghouseState for spot trading
      const clearinghouseState =
        await this.sdk.info.perpetuals.getClearinghouseState(
          this.config.walletAddress
        );

      // Find the position for the specified symbol
      const position = clearinghouseState.assetPositions.find((pos: any) =>
        symbol.includes(pos.position.coin)
      );

      if (!position || !position.position) {
        // No position found for this symbol
        return {
          symbol,
          size: 0,
          side: "flat",
        };
      }

      const positionData = position.position;
      const size = Math.abs(parseFloat(positionData.szi));
      const side =
        size === 0
          ? "flat"
          : parseFloat(positionData.szi) > 0
          ? "long"
          : "short";

      const avgPrice = positionData.entryPx
        ? parseFloat(positionData.entryPx)
        : undefined;

      const unrealizedPnl = positionData.unrealizedPnl
        ? parseFloat(positionData.unrealizedPnl)
        : undefined;

      // Extract leverage and other position data
      const leverage = positionData.leverage?.value;

      const leverageType = positionData.leverage?.type || undefined;

      const liquidationPrice = positionData.liquidationPx
        ? parseFloat(positionData.liquidationPx)
        : undefined;

      const marginUsed = positionData.marginUsed
        ? parseFloat(positionData.marginUsed)
        : undefined;

      const maxLeverage = positionData.maxLeverage || undefined;

      const positionValue = positionData.positionValue
        ? parseFloat(positionData.positionValue)
        : undefined;

      const returnOnEquity = positionData.returnOnEquity
        ? parseFloat(positionData.returnOnEquity)
        : undefined;

      // Extract cumulative funding data
      const cumFunding = positionData.cumFunding
        ? {
            allTime: parseFloat(positionData.cumFunding.allTime),
            sinceChange: parseFloat(positionData.cumFunding.sinceChange),
            sinceOpen: parseFloat(positionData.cumFunding.sinceOpen),
          }
        : undefined;

      return {
        symbol,
        size,
        side,
        averagePrice: avgPrice,
        unrealizedPnl,
        leverage,
        liquidationPrice,
        marginUsed,
        maxLeverage,
        positionValue,
        returnOnEquity,
        leverageType: leverageType as "isolated" | "cross",
        cumFunding,
      };

      // TODO: Add support for SpotInfoAPI when spot trading is implemented
      // For spot positions, we would need to use different API endpoints
      // and handle different position data structures
    } catch (error) {
      console.error(`❌ Failed to get position for ${symbol}:`, error);
      throw new Error(`Failed to get position for ${symbol}: ${error}`);
    }
  }

  async subscribeToOrderFills(
    callback: (fill: HyperliquidOrderFill) => void
  ): Promise<void> {
    try {
      // Check connection status before subscribing
      if (!this.connected || !this.authenticated) {
        console.log(
          `⚠️ WebSocket not connected or not authenticated for order fills. Attempting to reconnect...`
        );
        await this.connect();
      }

      // Verify connection again after attempt
      if (!this.connected || !this.authenticated) {
        throw new Error(
          "WebSocket is not connected or authenticated after reconnection attempt"
        );
      }

      console.log(
        `📡 Subscribing to order fills for ${this.config.walletAddress}...`
      );
      await this.sdk.subscriptions.subscribeToUserFills(
        this.config.walletAddress,
        (data) => {
          for (const fill of data.fills) {
            // Pass through all WsUserFill data as HyperliquidOrderFill
            const hyperliquidFill: HyperliquidOrderFill = {
              symbol: fill.coin,
              orderId: fill.oid,
              side: fill.side.toLowerCase() as "buy" | "sell",
              size: parseFloat(fill.sz),
              price: parseFloat(fill.px),
              timestamp: fill.time,
              startPosition: fill.startPosition,
              dir: fill.dir,
              closedPnl: fill.closedPnl,
              hash: fill.hash,
              crossed: fill.crossed,
              fee: fill.fee,
              tid: fill.tid,
            };
            callback(hyperliquidFill);
          }
        }
      );

      this.fillCallback = callback;
      console.log(`✅ Successfully subscribed to order fills`);
    } catch (error) {
      console.error(`❌ Failed to subscribe to order fills:`, error);
      throw new Error(`Failed to subscribe to order fills: ${error}`);
    }
  }

  async unsubscribeFromOrderFills(): Promise<void> {
    // Hyperliquid SDK doesn't have explicit unsubscribe for fills
    // The subscription will be cleaned up when connection is closed
    this.fillCallback = undefined;
  }

  getExchangeName(): string {
    return "Hyperliquid";
  }

  getMinOrderSize(symbol: string): number {
    // Hyperliquid-specific minimum order sizes
    // This would ideally come from exchange info endpoint
    return 0.001;
  }

  getPricePrecision(symbol: string): number {
    // Hyperliquid-specific price precision
    // This would ideally come from exchange info endpoint
    return 5;
  }

  getSizePrecision(symbol: string): number {
    // Hyperliquid-specific size precision
    // This would ideally come from exchange info endpoint
    return 6;
  }

  async getAssetMetadata(
    symbol: string
  ): Promise<{ name: string; szDecimals: number; maxLeverage: number }> {
    try {
      // Get the symbol without -PERP suffix for metadata lookup
      const assetName = symbol.replace("-PERP", "");

      // Use the SDK to get metadata
      const metaResponse = await this.sdk.info.perpetuals.getMetaAndAssetCtxs();
      const meta = metaResponse[0]; // PerpMetaResponse

      console.log(
        `🔍 Debug - Looking for asset: ${assetName} from symbol: ${symbol}`
      );
      console.log(
        `🔍 Debug - Available assets in universe:`,
        meta.universe.map((asset: any) => ({
          name: asset.name,
          szDecimals: asset.szDecimals,
          maxLeverage: asset.maxLeverage,
        }))
      );

      // Try different matching strategies
      let assetMeta = meta.universe.find(
        (asset: any) => asset.name === assetName
      );

      if (!assetMeta) {
        // Try case-insensitive match
        assetMeta = meta.universe.find(
          (asset: any) => asset.name.toLowerCase() === assetName.toLowerCase()
        );
      }

      if (!assetMeta) {
        // Try exact symbol match (in case the symbol includes -PERP in metadata)
        assetMeta = meta.universe.find((asset: any) => asset.name === symbol);
      }

      if (!assetMeta) {
        // Try partial match
        assetMeta = meta.universe.find(
          (asset: any) =>
            asset.name.includes(assetName) || assetName.includes(asset.name)
        );
      }

      if (!assetMeta) {
        console.error(
          `❌ No asset found for ${assetName}. Available assets:`,
          meta.universe.map((asset: any) => asset.name).join(", ")
        );
        throw new Error(
          `Asset metadata not found for ${assetName}. Available assets: ${meta.universe
            .map((asset: any) => asset.name)
            .join(", ")}`
        );
      }

      console.log(`✅ Found asset metadata:`, {
        name: assetMeta.name,
        szDecimals: assetMeta.szDecimals,
        maxLeverage: assetMeta.maxLeverage,
      });

      return {
        name: assetMeta.name,
        szDecimals: assetMeta.szDecimals,
        maxLeverage: assetMeta.maxLeverage,
      };
    } catch (error) {
      console.error(`❌ Failed to get asset metadata for ${symbol}:`, error);
      throw error;
    }
  }
}
