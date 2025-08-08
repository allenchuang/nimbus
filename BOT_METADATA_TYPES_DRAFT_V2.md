# Bot Metadata Types - Draft 2 (MVP-First Approach)

## Design Principles

1. **MVP-First**: Core functionality to create and configure working bots
2. **Extensible**: Designed to add advanced features without breaking changes
3. **No Schema Changes**: All configuration in existing `metadata` JSONB column
4. **Strict Validation**: Required fields have clear validation rules
5. **Backward Compatible**: Simple configs work, advanced features are optional

## Common Base Types

### Shared Risk Management (MVP)

```typescript
interface BasicRiskManagement {
  // Stop loss (optional but recommended)
  stop_loss?: {
    enabled: boolean;
    percentage: number; // Required if enabled, range: 1-50
  };

  // Take profit (optional)
  take_profit?: {
    enabled: boolean;
    percentage: number; // Required if enabled, range: 1-100
  };
}
```

### Shared Risk Management (Advanced)

```typescript
interface AdvancedRiskManagement extends BasicRiskManagement {
  // Advanced position limits
  max_position_percentage?: number; // Max position as % of portfolio
  max_daily_loss?: number; // Daily loss limit
  max_drawdown?: number; // Overall drawdown before pause

  // Circuit breakers
  circuit_breaker?: {
    enabled: boolean;
    max_consecutive_losses: number;
    pause_duration_minutes: number;
  };
}
```

## Strategy Metadata Definitions

### 1. DCA Bot Metadata

#### MVP Version

```typescript
interface DCABotMetadataMVP {
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
```

#### Advanced Features (Future Extensions)

```typescript
interface DCABotMetadataAdvanced extends DCABotMetadataMVP {
  // Advanced scheduling
  schedule_type?: "fixed_interval" | "price_based" | "hybrid";
  schedule_config?: {
    price_based?: {
      price_drop_threshold: number;
      price_spike_threshold: number;
    };
    hybrid?: {
      price_adjustment_factor: number;
    };
  };

  // Dynamic order sizing
  order_sizing?: {
    strategy: "fixed" | "price_scaled" | "fibonacci";
    price_scaling?: {
      base_price: number;
      scaling_factor: number;
      max_scaling_multiplier: number;
    };
  };

  // Target management
  target_config?: {
    target_price?: number;
    target_amount?: number;
    profit_taking?: {
      enabled: boolean;
      take_profit_percentage: number;
    };
  };

  // Advanced safety
  safety_limits?: {
    max_weekly_investment: number;
    pause_on_significant_drop?: {
      enabled: boolean;
      drop_percentage: number;
      pause_duration_hours: number;
    };
  };

  // Cost tracking
  cost_basis_tracking?: {
    enabled: boolean;
    include_fees: boolean;
  };

  // Advanced risk management
  risk_management?: AdvancedRiskManagement;
}
```

### 2. Martingale Bot Metadata

#### MVP Version

```typescript
interface MartingaleBotMetadataMVP {
  // Core martingale configuration (ALL REQUIRED)
  step_multiplier: number; // Range: 1.1-5.0 (conservative to aggressive)
  max_orders: number; // Range: 2-10 (safety limit)
  base_order_size: number; // Range: 10-1000 USD

  // Basic entry trigger (REQUIRED)
  entry_trigger: {
    price_drop_percentage: number; // Range: 0.5-10.0 (% drop to trigger)
  };

  // Basic exit strategy (REQUIRED)
  exit_strategy: {
    profit_percentage: number; // Range: 0.1-5.0 (% profit to exit all)
  };

  // Safety controls (REQUIRED)
  safety_controls: {
    max_position_multiple: number; // Range: 5-20 (max position vs base investment)
  };

  // Risk management (OPTIONAL)
  risk_management?: BasicRiskManagement;
}
```

#### Advanced Features (Future Extensions)

```typescript
interface MartingaleBotMetadataAdvanced extends MartingaleBotMetadataMVP {
  // Advanced scaling strategies
  scaling_strategy?: {
    type: "fixed_multiplier" | "dynamic_multiplier" | "custom_sequence";
    dynamic_multiplier?: {
      volatility_adjustment: boolean;
      max_multiplier: number;
      min_multiplier: number;
    };
    custom_sequence?: {
      multipliers: number[];
      repeat_last: boolean;
    };
  };

  // Advanced entry strategies
  entry_strategy?: {
    trigger_type: "price_drop" | "trailing_entry" | "rsi_oversold";
    trailing_entry?: {
      trail_percentage: number;
      min_trail_distance: number;
    };
    rsi_oversold?: {
      rsi_period: number;
      oversold_threshold: number;
    };
  };

  // Advanced exit strategies
  exit_strategy?: {
    type: "break_even_plus" | "percentage_profit" | "trailing_profit";
    trailing_profit?: {
      trail_percentage: number;
      activation_profit: number;
    };
  };

  // Recovery modes
  recovery_mode?: {
    strategy: "hold_and_wait" | "average_down" | "partial_exit" | "forced_exit";
    hold_and_wait?: {
      max_hold_duration_hours: number;
    };
    forced_exit?: {
      max_loss_percentage: number;
    };
  };

  // Advanced safety
  safety_controls?: {
    daily_loss_limit: number;
    volatility_pause?: {
      enabled: boolean;
      volatility_threshold: number;
    };
    circuit_breaker?: {
      enabled: boolean;
      consecutive_loss_limit: number;
      pause_duration_hours: number;
    };
  };

  // Advanced risk management
  risk_management?: AdvancedRiskManagement;
}
```

### 3. Portfolio Bot Metadata

#### MVP Version

```typescript
interface PortfolioBotMetadataMVP {
  // Core portfolio configuration (ALL REQUIRED)
  target_allocations: Record<string, number>; // Must sum to 1.0, 2-10 assets max
  rebalance_threshold: number; // Range: 0.01-0.20 (1%-20%)
  rebalance_interval: number; // Range: 1-168 hours

  // Basic trading configuration (REQUIRED)
  trading_config: {
    order_type: "market" | "limit"; // Default: "limit"
    slippage_tolerance: number; // Range: 0.001-0.05 (0.1%-5%)
    limit_order_timeout_minutes: number; // Range: 1-60 minutes
  };

  // Basic portfolio limits (REQUIRED)
  portfolio_limits: {
    min_allocation_percentage: number; // Range: 0.01-0.10 (1%-10%)
    max_allocation_percentage: number; // Range: 0.30-0.80 (30%-80%)
    min_rebalance_amount: number; // Range: 5-100 USD
  };

  // Risk management (OPTIONAL)
  risk_management?: BasicRiskManagement;
}
```

#### Advanced Features (Future Extensions)

```typescript
interface PortfolioBotMetadataAdvanced extends PortfolioBotMetadataMVP {
  // Advanced rebalancing strategies
  rebalancing_strategy?: {
    method:
      | "threshold_based"
      | "time_based"
      | "volatility_adjusted"
      | "momentum_based";
    volatility_adjusted?: {
      base_interval_hours: number;
      volatility_multiplier: number;
    };
    momentum_based?: {
      lookback_period_hours: number;
      momentum_threshold: number;
      anti_momentum: boolean;
    };
  };

  // Advanced trading features
  trading_config?: {
    batch_orders: boolean;
    fee_optimization?: {
      enabled: boolean;
      max_fee_percentage: number;
    };
  };

  // Risk management
  portfolio_risk?: {
    correlation_limits?: {
      enabled: boolean;
      max_correlation: number;
      correlation_period_days: number;
    };
    concentration_limits?: {
      max_single_asset: number;
    };
    volatility_management?: {
      enabled: boolean;
      max_portfolio_volatility: number;
    };
  };

  // Performance analytics
  portfolio_analytics?: {
    benchmark_allocations?: Record<string, number>;
    track_alpha: boolean;
    track_beta: boolean;
    track_sharpe_ratio: boolean;
    performance_attribution?: {
      enabled: boolean;
      attribution_period_days: number;
    };
  };

  // Advanced features
  advanced_features?: {
    dynamic_allocation?: {
      enabled: boolean;
      momentum_factor: number;
      mean_reversion_factor: number;
    };
    risk_parity?: {
      enabled: boolean;
      volatility_lookback_days: number;
    };
  };

  // Advanced risk management
  risk_management?: AdvancedRiskManagement;
}
```

### 4. Grid Bot Metadata (Enhanced MVP)

#### MVP Version (Current + Small Enhancements)

```typescript
interface GridBotMetadataMVP {
  // Core grid configuration (ALL REQUIRED - existing)
  grid_spacing: number; // Range: 0.001-0.10 (0.1%-10%)
  grid_quantity: number; // Range: 2-50
  grid_mode: "arithmetic" | "geometric"; // Default: "arithmetic"
  active_levels: number; // Range: 1-10, default: 2

  // Grid bounds (OPTIONAL)
  upper_bound?: number; // Must be > current price
  lower_bound?: number; // Must be < current price

  // Basic order management (REQUIRED)
  order_config: {
    order_type: "limit" | "post_only"; // Default: "limit"
    price_tolerance_percentage: number; // Range: 0.001-0.01 (0.1%-1%)
  };

  // Risk management (OPTIONAL)
  risk_management?: BasicRiskManagement;
}
```

#### Advanced Features (Future Extensions)

```typescript
interface GridBotMetadataAdvanced extends GridBotMetadataMVP {
  // Advanced grid features
  auto_adjust_bounds?: boolean;
  bounds_buffer_percentage?: number;

  // Grid rebalancing
  grid_rebalancing?: {
    enabled: boolean;
    rebalance_on_fill: boolean;
    rebalance_threshold_percentage: number;
  };

  // Advanced risk management
  risk_management?: AdvancedRiskManagement;
}
```

## Validation Rules

### Required Field Validation

```typescript
interface ValidationRules {
  DCA: {
    interval_hours: { min: 1; max: 168 };
    order_size: { min: 10; max: 10000 };
    max_orders: { min: 1; max: 100 };
    max_daily_orders: { min: 1; max: 10 };
  };

  Martingale: {
    step_multiplier: { min: 1.1; max: 5.0 };
    max_orders: { min: 2; max: 10 };
    base_order_size: { min: 10; max: 1000 };
    price_drop_percentage: { min: 0.5; max: 10.0 };
    profit_percentage: { min: 0.1; max: 5.0 };
    max_position_multiple: { min: 5; max: 20 };
  };

  Portfolio: {
    target_allocations: {
      min_assets: 2;
      max_assets: 10;
      sum_must_equal: 1.0;
      individual_min: 0.05;
      individual_max: 0.8;
    };
    rebalance_threshold: { min: 0.01; max: 0.2 };
    rebalance_interval: { min: 1; max: 168 };
    slippage_tolerance: { min: 0.001; max: 0.05 };
  };

  Grid: {
    grid_spacing: { min: 0.001; max: 0.1 };
    grid_quantity: { min: 2; max: 50 };
    active_levels: { min: 1; max: 10 };
    price_tolerance_percentage: { min: 0.001; max: 0.01 };
  };
}
```

### Cross-Field Validation

```typescript
interface CrossFieldValidation {
  // DCA Bot
  DCA: {
    min_order_size: "must be <= order_size";
    max_order_size: "must be >= order_size";
    max_daily_orders: "must be <= 24/interval_hours";
  };

  // Portfolio Bot
  Portfolio: {
    target_allocations: "must sum to 1.0 ± 0.001";
    min_allocation_percentage: "must be < max_allocation_percentage";
    primary_symbol: "must be key with highest allocation in target_allocations";
  };

  // Martingale Bot
  Martingale: {
    max_position_multiple: "total potential position must be <= max_position from bot_configs";
  };
}
```

## MVP Configuration Examples

### Simple DCA Bot

```json
{
  "interval_hours": 24,
  "order_size": 100,
  "max_orders": 30,
  "max_daily_orders": 1,
  "min_order_size": 50,
  "max_order_size": 200,
  "risk_management": {
    "stop_loss": {
      "enabled": true,
      "percentage": 15
    }
  }
}
```

### Simple Martingale Bot

```json
{
  "step_multiplier": 2.0,
  "max_orders": 5,
  "base_order_size": 100,
  "entry_trigger": {
    "price_drop_percentage": 2.0
  },
  "exit_strategy": {
    "profit_percentage": 1.0
  },
  "safety_controls": {
    "max_position_multiple": 10
  }
}
```

### Simple Portfolio Bot

```json
{
  "target_allocations": {
    "BTC-USD": 0.5,
    "ETH-USD": 0.3,
    "SOL-USD": 0.2
  },
  "rebalance_threshold": 0.05,
  "rebalance_interval": 24,
  "trading_config": {
    "order_type": "limit",
    "slippage_tolerance": 0.01,
    "limit_order_timeout_minutes": 30
  },
  "portfolio_limits": {
    "min_allocation_percentage": 0.05,
    "max_allocation_percentage": 0.6,
    "min_rebalance_amount": 10
  }
}
```

## Implementation Strategy

### Phase 1: MVP Implementation

1. **Core Types**: Implement MVP metadata types only
2. **Basic Validation**: Strict validation for required fields
3. **Simple Strategies**: Basic strategy implementations
4. **No Breaking Changes**: Advanced features added as optional extensions

### Phase 2: Advanced Features

1. **Incremental Addition**: Add advanced features without breaking MVP bots
2. **Feature Flags**: Advanced features behind configuration flags
3. **Gradual Migration**: Existing bots continue working, new features opt-in

### Benefits of This Approach

- ✅ **Fast MVP**: Can implement working bots quickly
- ✅ **User-Friendly**: Simple configuration for basic users
- ✅ **Extensible**: Advanced users can access complex features later
- ✅ **No Schema Changes**: All in metadata JSONB column
- ✅ **Backward Compatible**: New features don't break existing bots
- ✅ **Strict Validation**: Clear rules for required fields

## Next Steps

1. **Review MVP Requirements**: Are these core features sufficient for working bots?
2. **Validation Implementation**: Create validation functions for metadata
3. **Strategy Implementation**: Start with MVP strategy implementations
4. **Testing**: Create test cases for MVP configurations
5. **Advanced Planning**: Plan roadmap for advanced feature rollout
