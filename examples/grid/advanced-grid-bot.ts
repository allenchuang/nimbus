#!/usr/bin/env tsx

/**
 * Advanced Grid Bot Example
 *
 * This example demonstrates advanced grid trading features including:
 * - Geometric grid spacing
 * - Dynamic bounds adjustment
 * - Advanced risk management
 * - Multiple order types
 * - Performance optimization
 */

import { config } from "dotenv";
import {
  TradingBot,
  ExchangeFactory,
  BotType,
  BOT_TYPE,
  TradingBotConfig,
} from "../../index.js";

// Load environment variables
config();

async function runAdvancedGridBot() {
  console.log("⚡ Starting Advanced Grid Bot Example");
  console.log("====================================");

  // Validate environment variables
  const walletAddress = process.env.HYPERLIQUID_WALLET_ADDRESS;
  const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;

  if (!walletAddress || !privateKey) {
    console.error("❌ Missing required environment variables:");
    console.error("   HYPERLIQUID_WALLET_ADDRESS");
    console.error("   HYPERLIQUID_PRIVATE_KEY");
    console.error("   Please check your .env file");
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

    // 2. Configure advanced grid strategy
    const config: TradingBotConfig = {
      botType: BOT_TYPE.GRID,
      symbol: "SOL", // Trading SOL-PERP for higher volatility
      investmentAmount: 2500, // $2500 USD total investment
      maxPosition: 5.0, // Maximum 5 SOL position
      stopLoss: 12, // 12% stop loss
      takeProfit: 25, // 25% take profit
      metadata: {
        // Advanced grid configuration
        gridSpacing: 0.8, // 0.8% spacing between grid levels
        gridQuantity: 20, // 20 total grid levels (10 buy, 10 sell)
        gridMode: "geometric", // Geometric spacing for better volatility coverage
        activeLevels: 5, // Keep 5 buy and 5 sell orders active

        // Dynamic bounds (auto-adjusting)
        bounds_strategy: "dynamic",
        dynamic_bounds: {
          lookback_hours: 168, // 1 week lookback for bounds calculation
          volatility_multiplier: 2.5, // 2.5x recent volatility for bounds
          min_range_percentage: 15, // Minimum 15% range
          max_range_percentage: 40, // Maximum 40% range
          rebalance_trigger: 0.1, // Rebalance bounds when price moves 10% outside
        },

        // Advanced order management
        order_management: {
          order_type: "post_only", // Use post-only orders for better fees
          renewal_threshold: 0.02, // Renew orders when 2% away from market
          partial_fill_handling: "accumulate", // Accumulate partial fills
          timeout_minutes: 60, // Cancel unfilled orders after 60 minutes
        },

        // Profit optimization
        profit_taking: {
          enabled: true,
          partial_profit_percentage: 0.3, // Take 30% profit at intermediate levels
          trailing_profit: {
            enabled: true,
            activation_percentage: 0.05, // Activate trailing after 5% profit
            trail_percentage: 0.02, // Trail by 2%
          },
        },

        // Advanced risk management
        risk_management: {
          position_sizing: {
            base_size_percentage: 0.02, // 2% of investment per order
            volatility_adjustment: true, // Adjust size based on volatility
            max_single_order_percentage: 0.1, // Max 10% in single order
          },
          drawdown_protection: {
            enabled: true,
            max_drawdown_percentage: 0.15, // Stop if 15% drawdown
            reduce_size_threshold: 0.1, // Reduce size at 10% drawdown
          },
          correlation_limits: {
            max_correlated_exposure: 0.7, // Max 70% in correlated assets
            correlation_lookback_days: 30,
          },
        },

        // Performance monitoring
        monitoring: {
          performance_window_hours: 24,
          rebalance_frequency_minutes: 30,
          profit_target_adjustment: true,
          adaptive_spacing: {
            enabled: true,
            volatility_based: true,
            min_spacing: 0.3, // Minimum 0.3% spacing
            max_spacing: 1.5, // Maximum 1.5% spacing
          },
        },
      },
    };

    // 3. Create and configure bot
    console.log("🏗️ Creating advanced grid bot...");
    const bot = new TradingBot(exchange, config);

    // 4. Set up advanced event listeners
    setupAdvancedEventListeners(bot);

    // 5. Initialize and start bot
    console.log("🚀 Initializing advanced grid bot...");
    await bot.initialize();

    console.log("▶️ Starting advanced grid bot...");
    await bot.start();

    console.log("✅ Advanced grid bot is now running!");
    console.log(
      "⚡ Advanced features: Geometric spacing, dynamic bounds, adaptive sizing"
    );
    console.log("📊 Monitor the logs for advanced trading activity");
    console.log("⏹️ Press Ctrl+C to stop the bot");

    // Show advanced configuration summary
    showAdvancedConfig(config);

    // Keep the process running
    await keepAlive(bot);
  } catch (error) {
    console.error("❌ Error running advanced grid bot:", error);
    process.exit(1);
  }
}

function setupAdvancedEventListeners(bot: TradingBot) {
  // Enhanced lifecycle events
  bot.on("initialized", () => {
    console.log("✅ Advanced grid bot initialized with dynamic bounds");
  });

  bot.on("started", () => {
    console.log("🟢 Advanced grid bot started with geometric spacing");
  });

  // Advanced trading events
  bot.on("orderPlaced", (order: any) => {
    console.log(
      `📝 Order placed [${order.type}]: ${order.side} ${order.size} at $${
        order.price
      } (Grid level: ${order.gridLevel || "N/A"})`
    );
  });

  bot.on("orderFilled", (fill: any) => {
    console.log(`✅ Order filled: ${fill.side} ${fill.size} at $${fill.price}`);
    console.log(
      `💰 P&L: $${fill.pnl || "N/A"} | Grid efficiency: ${
        fill.efficiency || "N/A"
      }%`
    );
  });

  // Advanced grid events
  bot.on("gridRebalanced", (details: any) => {
    console.log(`🔲 Grid rebalanced around $${details.newBasePrice}`);
    console.log(
      `   New bounds: $${details.lowerBound} - $${details.upperBound}`
    );
    console.log(`   Grid efficiency: ${details.efficiency}%`);
  });

  bot.on("boundsAdjusted", (bounds: any) => {
    console.log(`📏 Dynamic bounds adjusted:`);
    console.log(`   Lower: $${bounds.lower} | Upper: $${bounds.upper}`);
    console.log(
      `   Range: ${bounds.rangePercentage}% | Volatility: ${bounds.volatility}`
    );
  });

  bot.on("adaptiveSpacingChanged", (spacing: any) => {
    console.log(
      `📐 Adaptive spacing changed: ${spacing.oldSpacing}% → ${spacing.newSpacing}%`
    );
    console.log(
      `   Reason: ${spacing.reason} | Volatility: ${spacing.currentVolatility}`
    );
  });

  // Advanced profit events
  bot.on("partialProfitTaken", (profit: any) => {
    console.log(
      `💎 Partial profit taken: $${profit.amount} (${profit.percentage}%)`
    );
  });

  bot.on("trailingProfitActivated", (details: any) => {
    console.log(
      `🎯 Trailing profit activated at $${details.price} (${details.percentage}% profit)`
    );
  });

  bot.on("trailingProfitTriggered", (details: any) => {
    console.log(`🏃 Trailing profit triggered: $${details.amount} secured`);
  });

  // Advanced risk management events
  bot.on("drawdownWarning", (drawdown: any) => {
    console.log(
      `⚠️ Drawdown warning: ${drawdown.percentage}% (threshold: ${drawdown.threshold}%)`
    );
  });

  bot.on("sizingAdjusted", (adjustment: any) => {
    console.log(
      `📊 Position sizing adjusted: ${adjustment.oldSize} → ${adjustment.newSize}`
    );
    console.log(
      `   Reason: ${adjustment.reason} | Volatility factor: ${adjustment.volatilityFactor}`
    );
  });

  bot.on("correlationAlert", (alert: any) => {
    console.log(
      `🔗 Correlation alert: ${alert.correlation}% with ${alert.asset}`
    );
  });

  // Error handling with context
  bot.on("error", (error: Error) => {
    console.error("❌ Advanced grid bot error:", error.message);
  });

  // Enhanced statistics every 2 minutes for advanced monitoring
  setInterval(() => {
    const stats = bot.getStatistics();
    console.log("\n📊 Advanced Grid Statistics:");
    console.log(
      `   Trades: ${stats.totalTrades} | Active orders: ${
        stats.activeOrders || "N/A"
      }`
    );
    console.log(`   Position: ${stats.currentPosition} SOL`);
    console.log(`   Grid efficiency: ${stats.gridEfficiency || "N/A"}%`);
    console.log(
      `   Current bounds: $${stats.lowerBound || "N/A"} - $${
        stats.upperBound || "N/A"
      }`
    );
    console.log(`   Total Volume: $${stats.volume.totalVolumeUSD.toFixed(2)}`);
    console.log(
      `   P&L: $${(stats.totalPnL || 0).toFixed(2)} | ROI: ${
        stats.roi || "N/A"
      }%`
    );
    console.log(
      `   Sharpe ratio: ${stats.sharpeRatio || "N/A"} | Max drawdown: ${
        stats.maxDrawdown || "N/A"
      }%`
    );
    console.log("");
  }, 120000); // Every 2 minutes
}

function showAdvancedConfig(config: TradingBotConfig) {
  console.log("\n⚡ Advanced Grid Configuration:");
  console.log("===============================");
  console.log(`   Symbol: ${config.symbol}`);
  console.log(`   Investment: $${config.investmentAmount}`);
  console.log(
    `   Grid mode: ${config.metadata.gridMode} (${config.metadata.gridQuantity} levels)`
  );
  console.log(
    `   Spacing: ${config.metadata.gridSpacing}% (adaptive: ${
      config.metadata.monitoring?.adaptive_spacing?.enabled ? "Yes" : "No"
    })`
  );
  console.log(`   Active levels: ${config.metadata.activeLevels} each side`);
  console.log(
    `   Bounds: ${config.metadata.bounds_strategy} (${config.metadata.dynamic_bounds?.lookback_hours}h lookback)`
  );
  console.log(`   Order type: ${config.metadata.order_management?.order_type}`);
  console.log(
    `   Profit taking: ${
      config.metadata.profit_taking?.enabled ? "Advanced" : "Basic"
    }`
  );
  console.log(`   Risk management: Enhanced with drawdown protection`);
  console.log("");
}

async function keepAlive(bot: TradingBot): Promise<void> {
  // Graceful shutdown handling
  process.on("SIGINT", async () => {
    console.log("\n🛑 Received interrupt signal");
    console.log("🔄 Stopping advanced grid bot gracefully...");

    try {
      await bot.stop();

      // Show enhanced final statistics
      const stats = bot.getStatistics();
      console.log("\n📊 Final Advanced Grid Performance:");
      console.log("===================================");
      console.log(`   Total trades: ${stats.totalTrades}`);
      console.log(`   Grid efficiency: ${stats.gridEfficiency || "N/A"}%`);
      console.log(`   Best performing level: ${stats.bestGridLevel || "N/A"}`);
      console.log(
        `   Total volume: $${stats.volume.totalVolumeUSD.toFixed(2)}`
      );
      console.log(`   Final P&L: $${(stats.totalPnL || 0).toFixed(2)}`);
      console.log(`   ROI: ${stats.roi || "N/A"}%`);
      console.log(`   Sharpe ratio: ${stats.sharpeRatio || "N/A"}`);
      console.log(`   Max drawdown: ${stats.maxDrawdown || "N/A"}%`);
      console.log(`   Win rate: ${stats.winRate || "N/A"}%`);

      console.log("✅ Advanced grid bot stopped successfully");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error stopping bot:", error);
      process.exit(1);
    }
  });

  process.on("SIGTERM", async () => {
    console.log("\n🛑 Received termination signal");
    await bot.stop();
    process.exit(0);
  });

  // Keep process alive
  return new Promise(() => {});
}

// Show startup banner
console.log(`
╔═══════════════════════════════════════╗
║           HyperBot v1.0.0             ║
║       Advanced Grid Bot Example       ║
║    "Advanced features for advanced    ║
║           traders"                    ║
╚═══════════════════════════════════════╝
`);

// Educational note about advanced grid trading
console.log(`
💡 Advanced Grid Features:
   • Geometric spacing for better volatility coverage
   • Dynamic bounds that adjust to market conditions
   • Adaptive order sizing based on volatility
   • Trailing profits and partial profit taking
   • Advanced risk management with drawdown protection

⚙️ Key Improvements over Basic Grid:
   • Better performance in trending markets
   • Reduced risk through dynamic adjustments
   • Higher capital efficiency
   • Enhanced profit optimization

⚠️ Advanced Considerations:
   • More complex configuration
   • Requires market understanding
   • Higher computational requirements
   • Best for experienced traders
`);

// Run the example
if (require.main === module) {
  runAdvancedGridBot().catch(console.error);
}

export { runAdvancedGridBot };
