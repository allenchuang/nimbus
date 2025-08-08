#!/usr/bin/env tsx

/**
 * Custom Strategy Bot Example
 *
 * This example demonstrates how to create and implement custom trading strategies
 * by extending the base strategy framework. This particular custom strategy
 * implements a "Mean Reversion with Momentum Filter" approach.
 */

import { config } from "dotenv";
import {
  TradingBot,
  ExchangeFactory,
  BotType,
  BOT_TYPE,
  TradingBotConfig,
} from "../index.js";

// Load environment variables
config();

/**
 * Custom Strategy: Mean Reversion with Momentum Filter
 *
 * Strategy Logic:
 * 1. Calculate price deviation from moving average
 * 2. Confirm with RSI oversold/overbought levels
 * 3. Add momentum filter using MACD
 * 4. Enter positions when all conditions align
 * 5. Exit using dynamic take profit and trailing stop
 */
async function runCustomStrategyBot() {
  console.log("🎨 Starting Custom Strategy Bot Example");
  console.log("=======================================");
  console.log("📊 Strategy: Mean Reversion + Momentum Filter");

  // Validate environment variables
  const walletAddress = process.env.HYPERLIQUID_WALLET_ADDRESS;
  const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;

  if (!walletAddress || !privateKey) {
    console.error("❌ Missing required environment variables");
    process.exit(1);
  }

  try {
    // 1. Create exchange connection
    console.log("🔌 Connecting to Hyperliquid testnet...");
    const exchange = ExchangeFactory.create("hyperliquid", {
      walletAddress,
      privateKey,
      testnet: true,
      enableWs: true,
    });

    // 2. Configure custom strategy
    const config: TradingBotConfig = {
      botType: BOT_TYPE.SIGNAL, // Using signal strategy type for custom logic
      symbol: "AVAX", // Trading AVAX-PERP
      investmentAmount: 1500, // $1500 total investment
      maxPosition: 10.0, // Maximum 10 AVAX position
      stopLoss: 8, // 8% stop loss
      takeProfit: 12, // 12% take profit
      metadata: {
        // Custom strategy configuration
        strategy_name: "MeanReversionMomentum",
        strategy_version: "1.0.0",

        // Technical indicators configuration
        indicators: {
          // Moving averages for mean reversion
          sma_short: {
            period: 20, // 20-period SMA for short-term trend
            weight: 0.3,
          },
          sma_long: {
            period: 50, // 50-period SMA for long-term trend
            weight: 0.2,
          },

          // RSI for momentum confirmation
          rsi: {
            period: 14,
            oversold_threshold: 30,
            overbought_threshold: 70,
            weight: 0.25,
          },

          // MACD for trend momentum
          macd: {
            fast_period: 12,
            slow_period: 26,
            signal_period: 9,
            weight: 0.25,
          },

          // Bollinger Bands for volatility
          bollinger: {
            period: 20,
            std_dev: 2,
            weight: 0.2,
          },
        },

        // Entry conditions
        entry_conditions: {
          mean_reversion_threshold: 0.02, // 2% deviation from SMA
          rsi_confirmation_required: true,
          macd_momentum_filter: true,
          minimum_volume_threshold: 10000, // Minimum daily volume
          volatility_filter: {
            enabled: true,
            max_atr_percentage: 0.05, // Max 5% ATR for entry
          },
        },

        // Exit strategy
        exit_strategy: {
          dynamic_take_profit: {
            enabled: true,
            base_percentage: 0.12, // 12% base take profit
            volatility_adjustment: true,
            max_percentage: 0.25, // Max 25% take profit
          },
          trailing_stop: {
            enabled: true,
            activation_percentage: 0.05, // Activate after 5% profit
            trail_percentage: 0.03, // Trail by 3%
            step_adjustment: true, // Adjust steps based on volatility
          },
          time_based_exit: {
            enabled: true,
            max_hold_hours: 72, // Exit after 72 hours regardless
          },
        },

        // Risk management
        risk_management: {
          position_sizing: {
            method: "volatility_adjusted", // Adjust size based on volatility
            base_percentage: 0.02, // 2% of portfolio per trade
            volatility_lookback: 20, // 20 periods for volatility calculation
            max_leverage: 3, // Maximum 3x leverage
          },
          correlation_check: {
            enabled: true,
            max_correlation: 0.7, // Don't enter if >70% correlated with existing positions
          },
          drawdown_protection: {
            enabled: true,
            max_drawdown: 0.15, // Stop trading if 15% drawdown
            cooling_off_hours: 24, // Wait 24 hours after drawdown
          },
        },

        // Custom signals and filters
        custom_filters: {
          market_regime: {
            enabled: true,
            trending_threshold: 0.6, // ADX threshold for trending market
            ranging_threshold: 0.3, // ADX threshold for ranging market
          },
          volatility_regime: {
            enabled: true,
            low_vol_threshold: 0.15, // VIX equivalent threshold
            high_vol_threshold: 0.35,
          },
          news_sentiment: {
            enabled: false, // Could integrate news sentiment API
            threshold: 0.5,
          },
        },
      },
    };

    // 3. Create and configure bot
    console.log("🏗️ Creating custom strategy bot...");
    const bot = new TradingBot(exchange, config);

    // 4. Set up custom event listeners
    setupCustomEventListeners(bot);

    // 5. Initialize and start bot
    console.log("🚀 Initializing custom strategy bot...");
    await bot.initialize();

    console.log("▶️ Starting custom strategy bot...");
    await bot.start();

    console.log("✅ Custom strategy bot is now running!");
    console.log("🎨 Strategy: Mean Reversion with Momentum Filter");
    console.log("📊 Monitor the logs for custom trading signals");
    console.log("⏹️ Press Ctrl+C to stop the bot");

    // Show strategy configuration
    showCustomStrategyConfig(config);

    // Keep the process running
    await keepAlive(bot);
  } catch (error) {
    console.error("❌ Error running custom strategy bot:", error);
    process.exit(1);
  }
}

function setupCustomEventListeners(bot: TradingBot) {
  // Custom strategy-specific events
  bot.on("customSignalGenerated", (signal: any) => {
    console.log("\n🎯 Custom Signal Generated:");
    console.log("==========================");
    console.log(`   Signal type: ${signal.type} (${signal.strength}/10)`);
    console.log(`   Trigger: ${signal.trigger}`);
    console.log(`   Confidence: ${signal.confidence}%`);
    console.log(`   Price: $${signal.price}`);

    // Show indicator values
    if (signal.indicators) {
      console.log("📊 Indicator Values:");
      Object.entries(signal.indicators).forEach(
        ([name, value]: [string, any]) => {
          console.log(`   ${name}: ${value}`);
        }
      );
    }
    console.log("");
  });

  bot.on("customEntryConditionMet", (condition: any) => {
    console.log(`✅ Entry condition met: ${condition.name}`);
    console.log(
      `   Value: ${condition.value} | Threshold: ${condition.threshold}`
    );
    console.log(`   Weight: ${condition.weight} | Score: ${condition.score}`);
  });

  bot.on("customEntryConditionFailed", (condition: any) => {
    console.log(`❌ Entry condition failed: ${condition.name}`);
    console.log(
      `   Value: ${condition.value} | Required: ${condition.threshold}`
    );
  });

  bot.on("customPositionOpened", (position: any) => {
    console.log("\n🎨 Custom Position Opened:");
    console.log("==========================");
    console.log(`   Strategy: ${position.strategy}`);
    console.log(`   Side: ${position.side}`);
    console.log(`   Size: ${position.size} AVAX ($${position.notional})`);
    console.log(`   Entry price: $${position.entryPrice}`);
    console.log(`   Stop loss: $${position.stopLoss}`);
    console.log(`   Take profit: $${position.takeProfit}`);
    console.log(`   Confidence score: ${position.confidenceScore}/10`);
    console.log("");
  });

  bot.on("customPositionClosed", (position: any) => {
    console.log("\n🏁 Custom Position Closed:");
    console.log("==========================");
    console.log(`   Strategy: ${position.strategy}`);
    console.log(`   Duration: ${position.duration} hours`);
    console.log(`   Exit reason: ${position.exitReason}`);
    console.log(
      `   Entry: $${position.entryPrice} | Exit: $${position.exitPrice}`
    );
    console.log(`   P&L: $${position.pnl} (${position.pnlPercentage}%)`);
    console.log(`   Fees: $${position.fees}`);
    console.log("");
  });

  // Dynamic exit events
  bot.on("trailingStopAdjusted", (adjustment: any) => {
    console.log(
      `🏃 Trailing stop adjusted: $${adjustment.oldStop} → $${adjustment.newStop}`
    );
    console.log(
      `   Trigger: ${adjustment.trigger} | Profit secured: $${adjustment.profitSecured}`
    );
  });

  bot.on("takeProfitAdjusted", (adjustment: any) => {
    console.log(
      `🎯 Take profit adjusted: ${adjustment.oldTarget}% → ${adjustment.newTarget}%`
    );
    console.log(
      `   Reason: ${adjustment.reason} | Volatility: ${adjustment.currentVolatility}`
    );
  });

  // Risk management events
  bot.on("correlationWarning", (warning: any) => {
    console.log(
      `🔗 Correlation warning: ${warning.correlation}% with ${warning.symbol}`
    );
    console.log(`   Action: ${warning.action}`);
  });

  bot.on("volatilityRegimeChange", (regime: any) => {
    console.log(`📈 Volatility regime changed: ${regime.from} → ${regime.to}`);
    console.log(`   Current volatility: ${regime.currentVolatility}%`);
    console.log(`   Strategy adjustment: ${regime.strategyAdjustment}`);
  });

  bot.on("marketRegimeChange", (regime: any) => {
    console.log(`📊 Market regime changed: ${regime.from} → ${regime.to}`);
    console.log(
      `   ADX: ${regime.adx} | Trend strength: ${regime.trendStrength}`
    );
  });

  // Error handling
  bot.on("error", (error: Error) => {
    console.error("❌ Custom strategy bot error:", error.message);
  });

  // Enhanced statistics every 5 minutes
  setInterval(() => {
    const stats = bot.getStatistics();
    console.log("\n🎨 Custom Strategy Performance:");
    console.log("===============================");
    console.log(`   Signals generated: ${stats.signalsGenerated || 0}`);
    console.log(`   Signals acted upon: ${stats.signalsActedUpon || 0}`);
    console.log(`   Signal accuracy: ${stats.signalAccuracy || "N/A"}%`);
    console.log(`   Current position: ${stats.currentPosition} AVAX`);
    console.log(`   Active trades: ${stats.activeTrades || 0}`);
    console.log(`   Total trades: ${stats.totalTrades}`);
    console.log(`   Win rate: ${stats.winRate || "N/A"}%`);
    console.log(`   Total P&L: $${(stats.totalPnL || 0).toFixed(2)}`);
    console.log(`   Sharpe ratio: ${stats.sharpeRatio || "N/A"}`);
    console.log(`   Max drawdown: ${stats.maxDrawdown || "N/A"}%`);

    // Custom strategy metrics
    if (stats.customMetrics) {
      console.log("📊 Custom Metrics:");
      console.log(
        `   Mean reversion accuracy: ${
          stats.customMetrics.meanReversionAccuracy || "N/A"
        }%`
      );
      console.log(
        `   Momentum filter effectiveness: ${
          stats.customMetrics.momentumFilterEffectiveness || "N/A"
        }%`
      );
      console.log(
        `   Average hold time: ${
          stats.customMetrics.averageHoldTime || "N/A"
        } hours`
      );
    }
    console.log("");
  }, 300000); // Every 5 minutes
}

function showCustomStrategyConfig(config: TradingBotConfig) {
  console.log("\n🎨 Custom Strategy Configuration:");
  console.log("=================================");
  console.log(
    `   Strategy: ${config.metadata.strategy_name} v${config.metadata.strategy_version}`
  );
  console.log(`   Symbol: ${config.symbol}`);
  console.log(`   Investment: $${config.investmentAmount}`);
  console.log("");

  console.log("📊 Technical Indicators:");
  Object.entries(config.metadata.indicators).forEach(
    ([name, indicator]: [string, any]) => {
      console.log(
        `   ${name}: Period ${indicator.period || "N/A"} (Weight: ${
          indicator.weight || "N/A"
        })`
      );
    }
  );

  console.log("");
  console.log("🎯 Entry Conditions:");
  console.log(
    `   Mean reversion threshold: ${
      config.metadata.entry_conditions.mean_reversion_threshold * 100
    }%`
  );
  console.log(
    `   RSI confirmation: ${
      config.metadata.entry_conditions.rsi_confirmation_required ? "Yes" : "No"
    }`
  );
  console.log(
    `   MACD momentum filter: ${
      config.metadata.entry_conditions.macd_momentum_filter ? "Yes" : "No"
    }`
  );
  console.log(
    `   Volatility filter: ${
      config.metadata.entry_conditions.volatility_filter.enabled ? "Yes" : "No"
    }`
  );

  console.log("");
  console.log("🚪 Exit Strategy:");
  console.log(
    `   Dynamic take profit: ${
      config.metadata.exit_strategy.dynamic_take_profit.enabled ? "Yes" : "No"
    }`
  );
  console.log(
    `   Trailing stop: ${
      config.metadata.exit_strategy.trailing_stop.enabled ? "Yes" : "No"
    }`
  );
  console.log(
    `   Max hold time: ${config.metadata.exit_strategy.time_based_exit.max_hold_hours} hours`
  );

  console.log("");
}

async function keepAlive(bot: TradingBot): Promise<void> {
  // Graceful shutdown handling
  process.on("SIGINT", async () => {
    console.log("\n🛑 Received interrupt signal");
    console.log("🔄 Stopping custom strategy bot...");

    try {
      await bot.stop();

      // Show final custom strategy summary
      const stats = bot.getStatistics();
      console.log("\n🎨 Final Custom Strategy Summary:");
      console.log("=================================");
      console.log(
        `   Strategy: ${stats.strategyName || "Custom Mean Reversion"}`
      );
      console.log(`   Total signals: ${stats.signalsGenerated || 0}`);
      console.log(`   Signal accuracy: ${stats.signalAccuracy || "N/A"}%`);
      console.log(`   Total trades: ${stats.totalTrades}`);
      console.log(`   Winning trades: ${stats.winningTrades || 0}`);
      console.log(`   Win rate: ${stats.winRate || "N/A"}%`);
      console.log(`   Best trade: $${stats.bestTrade || "N/A"}`);
      console.log(`   Worst trade: $${stats.worstTrade || "N/A"}`);
      console.log(
        `   Total volume: $${stats.volume.totalVolumeUSD.toFixed(2)}`
      );
      console.log(`   Final P&L: $${(stats.totalPnL || 0).toFixed(2)}`);
      console.log(`   ROI: ${stats.roi || "N/A"}%`);
      console.log(`   Sharpe ratio: ${stats.sharpeRatio || "N/A"}`);
      console.log(`   Max drawdown: ${stats.maxDrawdown || "N/A"}%`);

      if (stats.customMetrics) {
        console.log("\n📊 Custom Strategy Metrics:");
        Object.entries(stats.customMetrics).forEach(
          ([metric, value]: [string, any]) => {
            console.log(`   ${metric}: ${value}`);
          }
        );
      }

      console.log("✅ Custom strategy bot stopped successfully");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error stopping bot:", error);
      process.exit(1);
    }
  });

  // Keep process alive
  return new Promise(() => {});
}

// Show startup banner
console.log(`
╔═══════════════════════════════════════╗
║           HyperBot v1.0.0             ║
║        Custom Strategy Example        ║
║   "Build Your Own Trading Logic"     ║
║     Mean Reversion + Momentum         ║
╚═══════════════════════════════════════╝
`);

// Educational note about custom strategies
console.log(`
💡 Custom Strategy Framework:
   • Combine multiple technical indicators
   • Create complex entry/exit conditions
   • Implement custom risk management
   • Add market regime filters
   • Build adaptive algorithms

🏗️ This Example Strategy:
   • Mean reversion using moving averages
   • RSI confirmation for momentum
   • MACD filter for trend direction
   • Dynamic take profit based on volatility
   • Trailing stops with step adjustment

🛠️ How to Customize:
   1. Modify indicator parameters and weights
   2. Adjust entry/exit thresholds
   3. Add new technical indicators
   4. Implement different exit strategies
   5. Create custom risk management rules

📚 Strategy Development Tips:
   • Always backtest thoroughly
   • Start with simple logic, then add complexity
   • Use paper trading before live trading
   • Monitor performance and adjust parameters
   • Consider market regime changes
`);

// Run the example
if (require.main === module) {
  runCustomStrategyBot().catch(console.error);
}

export { runCustomStrategyBot };
