export interface OrderRequest {
  symbol: string;
  side: "buy" | "sell";
  size: number;
  price: number;
  type?: "limit" | "market";
  reduceOnly?: boolean;
}

export interface OrderResponse {
  success: boolean;
  orderId?: string | number;
  error?: string;
  immediatelyFilled?: boolean;
  fillPrice?: number;
  fillSize?: number;
}

export interface CancelOrderRequest {
  symbol: string;
  orderId: string | number;
}

export interface CancelOrderResponse {
  success: boolean;
  orderId: string | number;
  error?: string;
}

export interface OpenOrder {
  symbol: string;
  orderId: string | number;
  side: "buy" | "sell";
  size: number;
  price: number;
  filled: number;
}

export interface OrderFill {
  symbol: string;
  orderId: string | number;
  side: "buy" | "sell";
  size: number;
  price: number;
  timestamp: number;
  [key: string]: any; // Allow additional properties for exchange-specific fields
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
}

export interface Balance {
  symbol: string;
  free: number;
  locked: number;
  total: number;
}

export interface Position {
  symbol: string;
  size: number;
  side: "long" | "short" | "flat";
  averagePrice?: number;
  unrealizedPnl?: number;
  leverage?: number;
  liquidationPrice?: number;
  marginUsed?: number;
  maxLeverage?: number;
  positionValue?: number;
  returnOnEquity?: number;
  leverageType?: "isolated" | "cross";
  cumFunding?: {
    allTime: number;
    sinceChange: number;
    sinceOpen: number;
  };
}

export interface ExchangeConfig {
  privateKey?: string;
  walletAddress?: string;
  testnet?: boolean;
  enableWs?: boolean;
  maxReconnectAttempts?: number;
  [key: string]: any; // Allow exchange-specific config
}

export interface IExchange {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  isAuthenticated(): boolean;

  // Market data
  getCurrentPrice(symbol: string): Promise<number>;
  subscribeToPriceUpdates(
    symbol: string,
    callback: (update: PriceUpdate) => void
  ): Promise<void>;
  unsubscribeFromPriceUpdates(symbol: string): Promise<void>;

  // Trading
  placeOrder(request: OrderRequest): Promise<OrderResponse>;
  placeOrders(requests: OrderRequest[]): Promise<OrderResponse[]>;
  cancelOrder(request: CancelOrderRequest): Promise<boolean>;
  cancelOrders(requests: CancelOrderRequest[]): Promise<CancelOrderResponse[]>;
  cancelAllOrders(symbol: string): Promise<boolean>;
  getOpenOrders(symbol?: string): Promise<OpenOrder[]>;

  // Account data
  getBalance(symbol?: string): Promise<Balance[]>;
  getPosition(symbol: string): Promise<Position>;
  subscribeToOrderFills(callback: (fill: OrderFill) => void): Promise<void>;
  unsubscribeFromOrderFills(): Promise<void>;

  // Events
  on(
    event: "reconnected" | "disconnected" | "error",
    callback: (...args: any[]) => void
  ): void;
  off(
    event: "reconnected" | "disconnected" | "error",
    callback: (...args: any[]) => void
  ): void;

  // Exchange info
  getExchangeName(): string;
  getMinOrderSize(symbol: string): number;
  getPricePrecision(symbol: string): number;
  getSizePrecision(symbol: string): number;
}
