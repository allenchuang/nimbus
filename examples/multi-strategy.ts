#!/usr/bin/env tsx

/**
 * Multi-Strategy Bot Example
 *
 * This example demonstrates how to run multiple trading strategies
 * simultaneously with different configurations and risk management.
 * Perfect for portfolio diversification and strategy comparison!
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

interface BotInstance {
  name: string;
  bot: TradingBot;
  config: TradingBotConfig;
  startTime: Date;
}

async function runMultiStrategyExample() {
  console.log("🚀 Starting Multi-Strategy Bot Example");
  console.log("=====================================");

  // Validate environment variables
  const walletAddress = process.env.HYPERLIQUID_WALLET_ADDRESS;
  const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;

  if (!walletAddress || !privateKey) {
    console.error("❌ Missing required environment variables");
    process.exit(1);
  }

  const botInstances: BotInstance[] = [];

  try {
    // Create exchange connection (shared across all bots)
    console.log("🔌 Connecting to Hyperliquid testnet...");
    const exchange = ExchangeFactory.create("hyperliquid", {
      walletAddress,
      privateKey,
      testnet: true,
      enableWs: true,
    });

    // Bot 1: Grid Trading on ETH
    const gridConfig: TradingBotConfig = {
      botType: BOT_TYPE.GRID,
      symbol: "ETH",
      investmentAmount: 1000,
      maxPosition: 1.0,
      stopLoss: 8,
      takeProfit: 15,
      metadata: {
        gridSpacing: 0.5,
        gridQuantity: 12,
        gridMode: "arithmetic",
        activeLevels: 3,
      },
    };

    // Bot 2: DCA on BTC
    const dcaConfig: TradingBotConfig = {
      botType: BOT_TYPE.DCA,
      symbol: "BTC",
      investmentAmount: 2000,
      maxPosition: 0.5,
      stopLoss: 15,
      metadata: {
        interval_hours: 12, // Every 12 hours
        order_size: 100,
        max_orders: 20,
        max_daily_orders: 2,
        min_order_size: 50,
        max_order_size: 150,
      },
    };

    // Bot 3: Portfolio Rebalancing
    const portfolioConfig: TradingBotConfig = {
      botType: BOT_TYPE.PORTFOLIO,
      symbol: "BTC", // Primary symbol for reporting
      investmentAmount: 3000,
      maxPosition: 20.0,
      stopLoss: 12,
      takeProfit: 25,
      metadata: {
        target_allocations: {
          BTC: 0.5, // 50% Bitcoin
          ETH: 0.3, // 30% Ethereum
          SOL: 0.2, // 20% Solana
        },
        rebalance_threshold: 0.08, // 8% drift threshold
        rebalance_interval: 48, // Every 48 hours
        trading_config: {
          order_type: "market",
          slippage_tolerance: 0.015,
          limit_order_timeout_minutes: 45,
        },
        portfolio_limits: {
          min_allocation_percentage: 0.1,
          max_allocation_percentage: 0.7,
          min_rebalance_amount: 50,
        },
      },
    };

    // Create bot instances
    const configs = [
      { name: "Grid-ETH", config: gridConfig },
      { name: "DCA-BTC", config: dcaConfig },
      { name: "Portfolio-Multi", config: portfolioConfig },
    ];

    for (const { name, config } of configs) {
      console.log(`🏗️ Creating ${name} bot...`);
      const bot = new TradingBot(exchange, config);

      botInstances.push({
        name,
        bot,
        config,
        startTime: new Date(),
      });

      // Set up individual bot monitoring
      setupBotMonitoring(bot, name);
    }

    // Initialize all bots
    console.log("🚀 Initializing all bots...");
    for (const instance of botInstances) {
      await instance.bot.initialize();
      console.log(`✅ ${instance.name} initialized`);
    }

    // Start all bots
    console.log("▶️ Starting all bots...");
    for (const instance of botInstances) {
      await instance.bot.start();
      console.log(`🟢 ${instance.name} started`);
    }

    console.log("\n🎉 All bots are now running!");
    console.log("📊 Monitor the logs for trading activity");
    console.log("⏹️ Press Ctrl+C to stop all bots");

    // Show strategy summary
    showStrategyOverview(botInstances);

    // Set up consolidated monitoring
    setupConsolidatedMonitoring(botInstances);

    // Keep the process running
    await keepAlive(botInstances);
  } catch (error) {
    console.error("❌ Error running multi-strategy bots:", error);

    // Clean shutdown on error
    for (const instance of botInstances) {
      try {
        await instance.bot.stop();
      } catch (stopError) {
        console.error(`Error stopping ${instance.name}:`, stopError);
      }
    }

    process.exit(1);
  }
}

function setupBotMonitoring(bot: TradingBot, botName: string) {
  const prefix = `[${botName}]`;

  // Strategy-specific events
  bot.on("orderFilled", (fill: any) => {
    console.log(
      `${prefix} ✅ Order filled: ${fill.side} ${fill.size} at $${fill.price}`
    );
  });

  bot.on("gridRebalanced", (price: number) => {
    console.log(`${prefix} 🔲 Grid rebalanced around $${price}`);
  });

  bot.on("dcaOrderExecuted", (order: any) => {
    console.log(
      `${prefix} 📈 DCA: ${order.size} at $${order.price} (Total: $${order.totalInvested})`
    );
  });

  bot.on("portfolioRebalanced", (rebalance: any) => {
    console.log(
      `${prefix} 🔄 Portfolio rebalanced (${rebalance.actions.length} actions)`
    );
  });

  // Risk management events
  bot.on("stopLossTriggered", (details: any) => {
    console.log(`${prefix} 🛑 STOP LOSS TRIGGERED:`, details);
  });

  bot.on("takeProfitTriggered", (details: any) => {
    console.log(`${prefix} 🎯 TAKE PROFIT TRIGGERED:`, details);
  });

  // Error handling
  bot.on("error", (error: Error) => {
    console.error(`${prefix} ❌ Error:`, error.message);
  });
}

function showStrategyOverview(instances: BotInstance[]) {
  console.log("\n📋 Strategy Overview:");
  console.log("===================");

  instances.forEach((instance, i) => {
    const config = instance.config;
    console.log(`\n${i + 1}. ${instance.name}`);
    console.log(`   Strategy: ${config.botType.toUpperCase()}`);
    console.log(`   Symbol: ${config.symbol}`);
    console.log(`   Investment: $${config.investmentAmount}`);
    console.log(`   Max Position: ${config.maxPosition}`);
    console.log(`   Stop Loss: ${config.stopLoss || "None"}%`);
    console.log(`   Take Profit: ${config.takeProfit || "None"}%`);

    // Strategy-specific details
    if (config.botType === BOT_TYPE.GRID) {
      console.log(`   Grid Spacing: ${config.metadata.gridSpacing}%`);
      console.log(`   Grid Levels: ${config.metadata.gridQuantity}`);
    } else if (config.botType === BOT_TYPE.DCA) {
      console.log(`   Interval: ${config.metadata.interval_hours}h`);
      console.log(`   Order Size: $${config.metadata.order_size}`);
    } else if (config.botType === BOT_TYPE.PORTFOLIO) {
      console.log(
        `   Assets: ${Object.keys(config.metadata.target_allocations).join(", ")}`
      );
      console.log(
        `   Rebalance Threshold: ${config.metadata.rebalance_threshold * 100}%`
      );
    }
  });

  console.log("\n💡 Strategy Rationale:");
  console.log("   • Grid ETH: Profit from ETH volatility");
  console.log("   • DCA BTC: Long-term BTC accumulation");
  console.log("   • Portfolio: Diversification across top assets");
  console.log("");
}

function setupConsolidatedMonitoring(instances: BotInstance[]) {
  // Consolidated statistics every 10 minutes
  setInterval(() => {
    console.log("\n" + "=".repeat(80));
    console.log("📊 CONSOLIDATED PERFORMANCE REPORT");
    console.log("=".repeat(80));

    let totalPnL = 0;
    let totalTrades = 0;
    let totalVolume = 0;

    instances.forEach((instance) => {
      const stats = instance.bot.getStatistics();
      const uptime = Math.floor(
        (Date.now() - instance.startTime.getTime()) / 1000 / 60
      ); // minutes

      console.log(`\n📈 ${instance.name} (${uptime}m uptime):`);
      console.log(`   Trades: ${stats.totalTrades}`);
      console.log(`   P&L: $${(stats.totalPnL || 0).toFixed(2)}`);
      console.log(
        `   Volume: $${(stats.volume?.totalVolumeUSD || 0).toFixed(2)}`
      );
      console.log(
        `   Position: ${stats.currentPosition} ${instance.config.symbol}`
      );

      totalPnL += stats.totalPnL || 0;
      totalTrades += stats.totalTrades || 0;
      totalVolume += stats.volume?.totalVolumeUSD || 0;
    });

    console.log(`\n💰 TOTAL PORTFOLIO:`);
    console.log(`   Combined P&L: $${totalPnL.toFixed(2)}`);
    console.log(`   Total Trades: ${totalTrades}`);
    console.log(`   Total Volume: $${totalVolume.toFixed(2)}`);
    console.log(`   Active Strategies: ${instances.length}`);

    console.log("=".repeat(80) + "\n");
  }, 600000); // Every 10 minutes

  // Performance comparison every hour
  setInterval(() => {
    console.log("\n📊 Strategy Performance Comparison:");
    console.log("==================================");

    const performance = instances
      .map((instance) => {
        const stats = instance.bot.getStatistics();
        const roi = stats.totalPnL
          ? (stats.totalPnL / instance.config.investmentAmount) * 100
          : 0;

        return {
          name: instance.name,
          pnl: stats.totalPnL || 0,
          roi: roi,
          trades: stats.totalTrades || 0,
          volume: stats.volume?.totalVolumeUSD || 0,
        };
      })
      .sort((a, b) => b.roi - a.roi); // Sort by ROI descending

    performance.forEach((perf, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "📊";
      console.log(
        `${medal} ${perf.name}: ${perf.roi.toFixed(2)}% ROI | $${perf.pnl.toFixed(2)} P&L | ${perf.trades} trades`
      );
    });

    console.log("");
  }, 3600000); // Every hour
}

async function keepAlive(instances: BotInstance[]): Promise<void> {
  // Graceful shutdown handling
  process.on("SIGINT", async () => {
    console.log("\n🛑 Received interrupt signal");
    console.log("🔄 Stopping all bots gracefully...");

    try {
      // Stop all bots in parallel
      await Promise.all(
        instances.map(async (instance) => {
          try {
            await instance.bot.stop();
            console.log(`✅ ${instance.name} stopped`);
          } catch (error) {
            console.error(`❌ Error stopping ${instance.name}:`, error);
          }
        })
      );

      // Show final summary
      console.log("\n📊 Final Multi-Strategy Summary:");
      console.log("=================================");

      let totalPnL = 0;
      let totalTrades = 0;

      instances.forEach((instance) => {
        const stats = instance.bot.getStatistics();
        const runtime = Math.floor(
          (Date.now() - instance.startTime.getTime()) / 1000 / 60
        ); // minutes

        console.log(`${instance.name}:`);
        console.log(`  Runtime: ${runtime} minutes`);
        console.log(`  Trades: ${stats.totalTrades}`);
        console.log(`  P&L: $${(stats.totalPnL || 0).toFixed(2)}`);
        console.log(
          `  ROI: ${stats.totalPnL ? ((stats.totalPnL / instance.config.investmentAmount) * 100).toFixed(2) : "0.00"}%`
        );

        totalPnL += stats.totalPnL || 0;
        totalTrades += stats.totalTrades || 0;
      });

      console.log(`\nCombined Results:`);
      console.log(`  Total P&L: $${totalPnL.toFixed(2)}`);
      console.log(`  Total Trades: ${totalTrades}`);
      console.log(`  Strategies: ${instances.length}`);

      console.log("\n✅ All bots stopped successfully");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error during shutdown:", error);
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
║        Multi-Strategy Example         ║
║     "Diversification is the only      ║
║         free lunch in finance"        ║
╚═══════════════════════════════════════╝
`);

// Educational note about multi-strategy trading
console.log(`
💡 Multi-Strategy Benefits:
   • Risk diversification across strategies
   • Performance comparison and optimization
   • Reduced correlation between trading approaches
   • Better risk-adjusted returns

⚙️ Strategy Mix:
   • Grid Trading: Profits from volatility
   • DCA: Systematic accumulation
   • Portfolio: Asset diversification

⚠️ Considerations:
   • More complex to monitor and manage
   • Higher capital requirements
   • Potential strategy conflicts
   • Increased transaction costs
`);

// Run the example
if (require.main === module) {
  runMultiStrategyExample().catch(console.error);
}

export { runMultiStrategyExample };
