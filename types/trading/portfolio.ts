import type { BasicRiskManagement } from "../shared/risk";

export interface PortfolioBotMetadata {
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
}
