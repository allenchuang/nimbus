import type { BasicRiskManagement } from "../shared/risk";

export interface DCABotMetadata {
  // Core DCA configuration (ALL REQUIRED)
  interval_hours: number; // Range: 1-168 (1 hour to 1 week)
  order_size: number; // Range: 10-10000 USD
  max_orders: number; // Range: 1-100

  // Basic safety (REQUIRED)
  max_daily_orders: number; // Range: 1-10
  min_order_size: number; // Range: 1-1000, must be <= order_size
  max_order_size: number; // Range: order_size-50000, must be >= order_size

  // Risk management (OPTIONAL)
  risk_management?: BasicRiskManagement;
}

export interface DCAPosition {
  symbol: string;
  totalPosition: number;
  averagePrice: number;
  totalInvested: number;
  unrealizedPnL: number;
  orderCount: number;
  lastOrderTime: Date;
}

export interface DCAOrder {
  id: string;
  symbol: string;
  size: number;
  price?: number; // undefined for market orders
  timestamp: Date;
  status: "pending" | "filled" | "cancelled";
  orderId?: string;
}
