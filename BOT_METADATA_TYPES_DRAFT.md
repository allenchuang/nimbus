# Bot Metadata Types - Comprehensive Draft

## Overview

This document defines comprehensive metadata schemas for all trading bot strategies. All strategy-specific configuration is stored in the `metadata` JSONB column of the `bot_configs` table.

## Common Base Metadata

### Shared Risk Management

```typescript
interface RiskManagementMetadata {
  // Stop loss configuration
  stop_loss?: {
    enabled: boolean;
    percentage: number; // % loss to trigger stop
    type: "percentage" | "fixed"; // Percentage of position or fixed price
  };

  // Take profit configuration
  take_profit?: {
    enabled: boolean;
    percentage: number; // % profit to trigger take profit
    type: "percentage" | "fixed";
  };

  // Position limits
  max_position_percentage?: number; // Max position as % of total portfolio
  max_daily_loss?: number; // Max daily loss limit
  max_drawdown?: number; // Max overall drawdown before pause

  // Safety controls
  circuit_breaker?: {
    enabled: boolean;
    max_consecutive_losses: number;
    pause_duration_minutes: number;
  };
}
```

### Shared Performance Tracking

```typescript
interface PerformanceTrackingMetadata {
  // Statistics collection
  track_detailed_stats: boolean;
  save_trade_history: boolean;
  calculate_sharpe_ratio: boolean;

  // Reporting intervals
  performance_snapshot_interval_hours: number;
  send_performance_alerts: boolean;

  // Benchmark comparison
  benchmark_symbol?: string; // e.g., "BTC-USD" for comparison
}
```

## Strategy-Specific Metadata

### 1. Grid Bot Metadata

```typescript
interface GridBotMetadata extends BotMetadata {
  // Core grid configuration
  grid_spacing: number; // Percentage spacing between levels
  grid_quantity: number; // Total number of grid levels
  grid_mode: "arithmetic" | "geometric"; // Spacing calculation method
  active_levels: number; // Number of active levels per side

  // Grid bounds
  upper_bound?: number; // Optional upper price limit
  lower_bound?: number; // Optional lower price limit
  auto_adjust_bounds: boolean; // Dynamically adjust bounds
  bounds_buffer_percentage: number; // Buffer for auto-adjustment

  // Advanced grid features
  grid_rebalancing: {
    enabled: boolean;
    rebalance_on_fill: boolean; // Recreate grid after each fill
    rebalance_threshold_percentage: number; // Price drift % to trigger rebalance
  };

  // Grid order management
  order_type: "limit" | "post_only"; // Order type for grid levels
  price_tolerance_percentage: number; // Allowed price deviation for orders

  // Risk management (extends base)
  risk_management: RiskManagementMetadata;

  // Performance tracking
  performance_tracking: PerformanceTrackingMetadata;
}
```

### 2. DCA Bot Metadata

```typescript
interface DCABotMetadata extends BotMetadata {
  // Core DCA configuration
  interval_hours: number; // Base interval between orders
  order_size: number; // Base order size (USD)
  max_orders: number; // Maximum number of open orders

  // Scheduling options
  schedule_type: "fixed_interval" | "price_based" | "hybrid";
  schedule_config: {
    // Fixed interval settings
    fixed_interval?: {
      hours: number;
      start_time?: string; // "HH:mm" format for daily start
      trading_days?: number[]; // 0=Sunday, 1=Monday, etc.
    };

    // Price-based triggering
    price_based?: {
      price_drop_threshold: number; // % drop to trigger extra order
      price_spike_threshold: number; // % spike to pause orders
      reference_period_hours: number; // Period for price comparison
    };

    // Hybrid (combines both)
    hybrid?: {
      base_interval_hours: number;
      price_adjustment_factor: number; // Multiplier for interval adjustment
    };
  };

  // Dynamic order sizing
  order_sizing: {
    strategy: "fixed" | "price_scaled" | "dca_scaled" | "fibonacci";

    // Price-based scaling
    price_scaling?: {
      enabled: boolean;
      base_price?: number; // Reference price for scaling
      scaling_factor: number; // How much to scale orders
      max_scaling_multiplier: number; // Maximum scaling (e.g., 3x)
    };

    // DCA scaling (buy more when averaging down)
    dca_scaling?: {
      enabled: boolean;
      scale_on_loss: boolean; // Increase size when position is down
      scaling_factor: number;
    };

    // Fibonacci scaling
    fibonacci?: {
      enabled: boolean;
      fibonacci_levels: number[]; // Custom fibonacci sequence
    };
  };

  // Target management
  target_config: {
    target_price?: number; // Optional target price
    target_amount?: number; // Total amount to accumulate
    profit_taking: {
      enabled: boolean;
      take_profit_percentage: number;
      partial_profit_levels: number[]; // e.g., [10, 25, 50] for 3 levels
    };
  };

  // Safety limits
  safety_limits: {
    max_daily_orders: number;
    max_weekly_investment: number;
    min_order_size: number;
    max_order_size: number;
    pause_on_significant_drop: {
      enabled: boolean;
      drop_percentage: number; // % drop to pause DCA
      pause_duration_hours: number;
    };
  };

  // Average cost tracking
  cost_basis_tracking: {
    enabled: boolean;
    include_fees: boolean;
    reset_on_full_exit: boolean;
  };

  // Risk management (extends base)
  risk_management: RiskManagementMetadata;

  // Performance tracking
  performance_tracking: PerformanceTrackingMetadata;
}
```

### 3. Martingale Bot Metadata

```typescript
interface MartingaleBotMetadata extends BotMetadata {
  // Core martingale configuration
  step_multiplier: number; // Position size multiplier (e.g., 2.0)
  max_orders: number; // Maximum number of positions
  base_order_size: number; // Initial order size

  // Position scaling strategy
  scaling_strategy: {
    type: "fixed_multiplier" | "dynamic_multiplier" | "custom_sequence";

    // Fixed multiplier (classic martingale)
    fixed_multiplier?: {
      multiplier: number; // e.g., 2.0 for doubling
    };

    // Dynamic multiplier (adjusts based on conditions)
    dynamic_multiplier?: {
      base_multiplier: number;
      volatility_adjustment: boolean; // Adjust based on market volatility
      max_multiplier: number; // Cap on multiplier
      min_multiplier: number; // Floor on multiplier
    };

    // Custom sequence
    custom_sequence?: {
      multipliers: number[]; // e.g., [1, 1.5, 2, 2.5, 3]
      repeat_last: boolean; // Repeat last multiplier if exceeded
    };
  };

  // Entry strategy
  entry_strategy: {
    trigger_type: "price_drop" | "trailing_entry" | "rsi_oversold";

    // Price drop entry
    price_drop?: {
      drop_percentage: number; // % drop to trigger entry
      reference_period_minutes: number; // Period for measuring drop
    };

    // Trailing entry
    trailing_entry?: {
      trail_percentage: number; // % trail below recent high
      min_trail_distance: number; // Minimum distance to maintain
    };

    // RSI-based entry
    rsi_oversold?: {
      rsi_period: number; // RSI calculation period
      oversold_threshold: number; // RSI level to trigger (e.g., 30)
    };
  };

  // Exit strategy
  exit_strategy: {
    type: "break_even_plus" | "percentage_profit" | "trailing_profit";

    // Break even plus small profit
    break_even_plus?: {
      profit_percentage: number; // Small profit % above break even
      include_fees: boolean;
    };

    // Fixed percentage profit
    percentage_profit?: {
      profit_percentage: number;
    };

    // Trailing profit
    trailing_profit?: {
      trail_percentage: number;
      activation_profit: number; // Profit % to activate trailing
    };
  };

  // Recovery mode (when max orders reached)
  recovery_mode: {
    strategy: "hold_and_wait" | "average_down" | "partial_exit" | "forced_exit";

    // Hold and wait for recovery
    hold_and_wait?: {
      max_hold_duration_hours: number;
      exit_on_timeout: boolean;
    };

    // Continue averaging down with smaller sizes
    average_down?: {
      reduced_size_percentage: number; // Reduce size by this %
      max_additional_orders: number;
    };

    // Partial exit strategy
    partial_exit?: {
      exit_percentage: number; // % of position to exit
      exit_intervals_hours: number; // How often to exit portions
    };

    // Forced exit conditions
    forced_exit?: {
      max_loss_percentage: number;
      max_position_size_multiple: number; // e.g., 10x initial investment
    };
  };

  // Safety controls
  safety_controls: {
    max_position_multiple: number; // Max position as multiple of base
    daily_loss_limit: number; // Daily loss limit
    volatility_pause: {
      enabled: boolean;
      volatility_threshold: number; // Pause if volatility exceeds
      measurement_period_hours: number;
    };

    // Circuit breaker
    circuit_breaker: {
      enabled: boolean;
      consecutive_loss_limit: number;
      pause_duration_hours: number;
      reset_on_profit: boolean;
    };
  };

  // Risk management (extends base)
  risk_management: RiskManagementMetadata;

  // Performance tracking
  performance_tracking: PerformanceTrackingMetadata;
}
```

### 4. Portfolio Bot Metadata

```typescript
interface PortfolioBotMetadata extends BotMetadata {
  // Core portfolio configuration
  target_allocations: Record<string, number>; // symbol -> percentage (must sum to 1.0)
  rebalance_threshold: number; // % drift before rebalancing
  rebalance_interval: number; // Hours between rebalances

  // Portfolio composition
  portfolio_config: {
    min_allocation_percentage: number; // Minimum allocation per asset
    max_allocation_percentage: number; // Maximum allocation per asset
    allow_new_assets: boolean; // Allow adding new assets
    remove_small_positions: {
      enabled: boolean;
      threshold_percentage: number; // Remove if below this %
      threshold_usd: number; // Remove if below this USD value
    };
  };

  // Rebalancing strategy
  rebalancing_strategy: {
    method:
      | "threshold_based"
      | "time_based"
      | "volatility_adjusted"
      | "momentum_based";

    // Threshold-based rebalancing
    threshold_based?: {
      individual_threshold: number; // Per-asset drift threshold
      portfolio_threshold: number; // Overall portfolio drift
      min_rebalance_amount: number; // Minimum trade size
    };

    // Time-based rebalancing
    time_based?: {
      interval_hours: number;
      rebalance_time?: string; // "HH:mm" for specific time
      skip_small_adjustments: boolean;
    };

    // Volatility-adjusted rebalancing
    volatility_adjusted?: {
      base_interval_hours: number;
      volatility_multiplier: number; // Adjust frequency based on volatility
      max_frequency_hours: number; // Minimum time between rebalances
      min_frequency_hours: number; // Maximum time between rebalances
    };

    // Momentum-based rebalancing
    momentum_based?: {
      lookback_period_hours: number;
      momentum_threshold: number;
      anti_momentum: boolean; // Rebalance against momentum
    };
  };

  // Trading configuration
  trading_config: {
    order_type: "market" | "limit" | "post_only";
    slippage_tolerance: number; // Max slippage for market orders
    limit_order_timeout_minutes: number; // Cancel unfilled limits
    batch_orders: boolean; // Execute rebalancing in batches

    // Fee optimization
    fee_optimization: {
      enabled: boolean;
      max_fee_percentage: number; // Don't rebalance if fees exceed this
      fee_threshold_override: number; // Override for large imbalances
    };
  };

  // Risk management
  portfolio_risk: {
    correlation_limits: {
      enabled: boolean;
      max_correlation: number; // Max correlation between assets
      correlation_period_days: number;
    };

    // Concentration limits
    concentration_limits: {
      max_single_asset: number; // Max % in single asset
      max_sector_exposure?: number; // If sector data available
    };

    // Volatility management
    volatility_management: {
      enabled: boolean;
      max_portfolio_volatility: number;
      rebalance_on_volatility_spike: boolean;
      volatility_lookback_days: number;
    };
  };

  // Performance tracking
  portfolio_analytics: {
    benchmark_allocations?: Record<string, number>; // Benchmark portfolio
    track_alpha: boolean; // Track alpha vs benchmark
    track_beta: boolean; // Track beta vs market
    track_sharpe_ratio: boolean;
    track_sortino_ratio: boolean;

    // Attribution analysis
    performance_attribution: {
      enabled: boolean;
      attribution_period_days: number;
      calculate_asset_contribution: boolean;
    };
  };

  // Advanced features
  advanced_features: {
    // Dynamic allocation adjustment
    dynamic_allocation: {
      enabled: boolean;
      momentum_factor: number; // Tilt towards momentum
      mean_reversion_factor: number; // Tilt towards mean reversion
      volatility_scaling: boolean; // Scale allocation by inverse volatility
    };

    // Risk parity
    risk_parity: {
      enabled: boolean;
      volatility_lookback_days: number;
      correlation_lookback_days: number;
      rebalance_frequency_days: number;
    };

    // Tax optimization (if applicable)
    tax_optimization: {
      enabled: boolean;
      harvest_losses: boolean;
      defer_gains: boolean;
      wash_sale_protection: boolean;
    };
  };

  // Risk management (extends base)
  risk_management: RiskManagementMetadata;

  // Performance tracking
  performance_tracking: PerformanceTrackingMetadata;
}
```

## Configuration Examples

### Example DCA Bot Configuration

```json
{
  "interval_hours": 24,
  "order_size": 100,
  "max_orders": 30,
  "schedule_type": "hybrid",
  "schedule_config": {
    "hybrid": {
      "base_interval_hours": 24,
      "price_adjustment_factor": 0.5
    }
  },
  "order_sizing": {
    "strategy": "price_scaled",
    "price_scaling": {
      "enabled": true,
      "scaling_factor": 1.5,
      "max_scaling_multiplier": 3
    }
  },
  "safety_limits": {
    "max_daily_orders": 2,
    "max_weekly_investment": 1000,
    "min_order_size": 10,
    "max_order_size": 500
  },
  "risk_management": {
    "stop_loss": {
      "enabled": true,
      "percentage": 20,
      "type": "percentage"
    }
  }
}
```

### Example Portfolio Bot Configuration

```json
{
  "target_allocations": {
    "BTC-USD": 0.4,
    "ETH-USD": 0.35,
    "SOL-USD": 0.25
  },
  "rebalance_threshold": 0.05,
  "rebalance_interval": 24,
  "rebalancing_strategy": {
    "method": "threshold_based",
    "threshold_based": {
      "individual_threshold": 0.03,
      "portfolio_threshold": 0.05,
      "min_rebalance_amount": 10
    }
  },
  "portfolio_risk": {
    "correlation_limits": {
      "enabled": true,
      "max_correlation": 0.8,
      "correlation_period_days": 30
    },
    "concentration_limits": {
      "max_single_asset": 0.5
    }
  }
}
```

## Discussion Points

### 1. **Complexity vs. Usability**

- Are these metadata schemas too complex for initial implementation?
- Should we start with simplified versions and add features gradually?
- How to balance power-user features with ease of use?

### 2. **Default Values Strategy**

- Which fields should have sensible defaults vs. required configuration?
- How to handle backward compatibility with existing simple configs?
- Should we have "preset" configurations (conservative, aggressive, etc.)?

### 3. **Validation Requirements**

- How to validate that portfolio allocations sum to 1.0?
- Range validation for percentages, multipliers, etc.?
- Cross-field validation (e.g., max_orders vs. safety limits)?

### 4. **Performance Implications**

- Will complex metadata schemas impact database performance?
- How to handle metadata migrations/updates?
- Indexing strategy for frequently queried metadata fields?

### 5. **Feature Priority**

- Which advanced features are essential vs. nice-to-have?
- Should risk management be mandatory or optional?
- How to handle features that require external data (correlation, volatility)?

## Next Steps for Review

1. **Review each strategy's metadata for completeness**
2. **Identify fields that should be simplified or combined**
3. **Determine which features are MVP vs. advanced**
4. **Define validation rules and constraints**
5. **Create simplified "preset" configurations**
6. **Plan migration strategy for existing bots**
