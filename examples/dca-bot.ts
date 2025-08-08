#!/usr/bin/env tsx

/**
 * Dollar Cost Averaging (DCA) Bot Example
 *
 * This example demonstrates how to set up a DCA bot that automatically
 * buys crypto at regular intervals, regardless of price.
 * Perfect for long-term accumulation strategies!
 */

import { config } from "dotenv";
import {
  TradingBot,
  ExchangeFactory,
  BOT_TYPE,
  TradingBotConfig,
} from "../index.js";

// Load environment variables
config();

async function runDCABot() {
  console.log("📈 Starting DCA Bot Example");
  console.log("==========================");

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

    // 2. Configure DCA strategy
    const config: TradingBotConfig = {
      botType: BOT_TYPE.DCA,
      symbol: "BTC", // DCA into Bitcoin
      investmentSize: 1000, // $1000 total budget
      maxPosition: 1.0, // Maximum 1 BTC position
      stopLoss: 15, // 15% stop loss (optional for DCA)
      metadata: {
        // DCA-specific configuration
        interval_hours: 24, // Buy every 24 hours
        order_size: 50, // $50 per purchase
        max_orders: 20, // Maximum 20 orders total
        max_daily_orders: 1, // Maximum 1 order per day
        min_order_size: 25, // Minimum $25 per order
        max_order_size: 100, // Maximum $100 per order

        // Risk management for DCA
        risk_management: {
          stop_loss: {
            enabled: true,
            percentage: 15, // Stop if down 15% from average cost
          },
          take_profit: {
            enabled: false, // DCA typically doesn't use take profit
            percentage: 50,
          },
        },
      },
    };

    // 3. Create and configure bot
    console.log("🏗️ Creating DCA bot...");
    const bot = new TradingBot(exchange, config);

    // 4. Set up event listeners
    setupEventListeners(bot);

    // 5. Initialize and start bot
    console.log("🚀 Initializing DCA bot...");
    await bot.initialize();

    console.log("▶️ Starting DCA bot...");
    await bot.start();

    console.log("✅ DCA bot is now running!");
    console.log("📈 Will buy $50 worth of BTC every 24 hours");
    console.log("⏹️ Press Ctrl+C to stop the bot");

    // Show DCA schedule
    showDCASchedule();

    // Keep the process running
    await keepAlive(bot);
  } catch (error) {
    console.error("❌ Error running DCA bot:", error);
    process.exit(1);
  }
}

function setupEventListeners(bot: TradingBot) {
  // DCA-specific events
  bot.on("dcaOrderExecuted", (order: any) => {
    console.log(`📈 DCA Purchase: ${order.size} BTC at $${order.price}`);
    console.log(`💵 Spent: $${order.cost}`);
    console.log(`📊 Total invested: $${order.totalInvested}`);
    console.log(`📈 Average cost: $${order.averageCost}`);
  });

  bot.on("dcaScheduleNext", (nextTime: Date) => {
    console.log(
      `⏰ Next DCA purchase scheduled for: ${nextTime.toLocaleString()}`
    );
  });

  // Risk management events
  bot.on("stopLossTriggered", (details: any) => {
    console.log(`🛑 DCA Stop Loss triggered - protecting your investment!`);
    console.log(`   Average cost: $${details.averageCost}`);
    console.log(`   Current price: $${details.currentPrice}`);
    console.log(`   Loss: ${details.lossPercentage}%`);
  });

  // Position updates
  bot.on("positionUpdate", (position: any) => {
    console.log(`📊 Position updated: ${position.size} BTC`);
    console.log(`💰 Unrealized P&L: $${position.unrealizedPnl}`);
  });

  // Error handling
  bot.on("error", (error: Error) => {
    console.error("❌ DCA Bot error:", error.message);
  });

  // Enhanced statistics every hour
  setInterval(() => {
    const stats = bot.getStatistics();
    console.log("\n📊 DCA Performance Summary:");
    console.log(`   Total Orders: ${stats.totalTrades}`);
    console.log(`   BTC Accumulated: ${stats.currentPosition} BTC`);
    console.log(
      `   Total Invested: $${stats.volume.totalVolumeUSD.toFixed(2)}`
    );
    console.log(`   Average Cost: $${stats.averageCost || "N/A"}`);
    console.log(`   Current P&L: $${(stats.totalPnL || 0).toFixed(2)}`);

    if (stats.averageCost && stats.currentPrice) {
      const performancePercent = (
        ((stats.currentPrice - stats.averageCost) / stats.averageCost) *
        100
      ).toFixed(2);
      console.log(`   Performance: ${performancePercent}%`);
    }
    console.log("");
  }, 3600000); // Every hour
}

function showDCASchedule() {
  console.log("\n📅 DCA Schedule:");
  console.log("   Frequency: Every 24 hours");
  console.log("   Amount: $50 per purchase");
  console.log("   Target: Accumulate BTC over time");
  console.log("   Strategy: Buy regardless of price");

  // Calculate next few purchase times
  const now = new Date();
  for (let i = 1; i <= 5; i++) {
    const nextPurchase = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    console.log(`   Purchase ${i}: ${nextPurchase.toLocaleString()}`);
  }
  console.log("");
}

async function keepAlive(bot: TradingBot): Promise<void> {
  // Graceful shutdown handling
  process.on("SIGINT", async () => {
    console.log("\n🛑 Received interrupt signal");
    console.log("🔄 Stopping DCA bot...");

    try {
      await bot.stop();

      // Show final DCA summary
      const stats = bot.getStatistics();
      console.log("\n📊 Final DCA Summary:");
      console.log(`   Total BTC accumulated: ${stats.currentPosition}`);
      console.log(
        `   Total invested: $${stats.volume.totalVolumeUSD.toFixed(2)}`
      );
      console.log(`   Average cost per BTC: $${stats.averageCost || "N/A"}`);
      console.log(`   Final P&L: $${(stats.totalPnL || 0).toFixed(2)}`);

      console.log("✅ DCA bot stopped successfully");
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
║         DCA Bot Example               ║
║      "Time in market beats            ║
║       timing the market"              ║
╚═══════════════════════════════════════╝
`);

// Educational note about DCA
console.log(`
💡 DCA Strategy Benefits:
   • Reduces impact of volatility
   • Eliminates timing decisions
   • Builds positions over time
   • Proven long-term strategy

⚠️  DCA Considerations:
   • Works best in trending markets
   • Requires patience and discipline
   • May underperform lump sum in bull markets
   • Set stop-loss for protection
`);

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  runDCABot().catch(console.error);
}

export { runDCABot };
