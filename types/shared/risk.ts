export interface BasicRiskManagement {
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

export interface AdvancedRiskManagement extends BasicRiskManagement {
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
