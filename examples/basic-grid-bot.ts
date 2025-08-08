#!/usr/bin/env tsx

/**
 * Basic Grid Bot Example
 *
 * This example demonstrates how to set up a simple grid trading bot
 * on Hyperliquid testnet. Perfect for beginners!
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

async function runBasicGridBot() {
  console.log("🤖 Starting Basic Grid Bot Example");
  console.log("==================================");

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
      testnet: true, // Always use testnet for examples
      enableWs: true,
    });

    // 2. Configure grid strategy
    const config: TradingBotConfig = {
      botType: BOT_TYPE.GRID,
      symbol: "ETH", // Trading ETH-PERP
      investmentSize: 200, // $100 USD total investment
      maxPosition: 0.1, // Maximum 0.1 ETH position
      stopLoss: 5, // 5% stop loss
      takeProfit: 10, // 10% take profit
      metadata: {
        // Grid-specific configuration
        gridSpacing: 0.5, // 0.5% spacing between grid levels
        gridQuantity: 10, // 10 total grid levels (5 buy, 5 sell)
        gridMode: "arithmetic", // Arithmetic spacing
        activeLevels: 2, // Keep 2 buy and 2 sell orders active
        // Optional bounds (comment out to use dynamic bounds)
        // upperBound: 2500,
        // lowerBound: 2000,
      },
    };

    // 3. Create and configure bot
    console.log("🏗️ Creating grid bot...");
    const bot = new TradingBot(exchange, config);

    // 4. Set up event listeners for monitoring
    setupEventListeners(bot);

    // 5. Initialize and start bot
    console.log("🚀 Initializing bot...");
    await bot.initialize();

    console.log("▶️ Starting grid bot...");
    await bot.start();

    console.log("✅ Grid bot is now running!");
    console.log("📊 Monitor the logs for trading activity");
    console.log("⏹️ Press Ctrl+C to stop the bot");

    // Keep the process running
    await keepAlive(bot);
  } catch (error) {
    console.error("❌ Error running grid bot:", error);
    process.exit(1);
  }
}

function setupEventListeners(bot: TradingBot) {
  // Lifecycle events
  bot.on("initialized", () => {
    console.log("✅ Bot initialized successfully");
  });

  bot.on("started", () => {
    console.log("🟢 Bot started trading");
  });

  bot.on("stopped", () => {
    console.log("🔴 Bot stopped");
  });

  // Trading events
  bot.on("orderPlaced", (order: any) => {
    console.log(
      `📝 Order placed: ${order.side} (${order.size} ETH / $${(
        order.size * order.price
      ).toFixed(2)} USD) at $${order.price}`
    );
  });

  bot.on("orderFilled", (fill: any) => {
    const usdValue = (fill.size * fill.price).toFixed(2);
    console.log(
      `✅ Order filled: ${fill.side} (${fill.size} ETH / $${usdValue} USD) at $${fill.price}`
    );
    console.log(`💰 P&L: $${fill.pnl || "N/A"}`);
  });

  bot.on("orderCancelled", (order: any) => {
    console.log(`❌ Order cancelled: ${order.id}`);
  });

  // Grid-specific events
  bot.on("gridRebalanced", (newBasePrice: number) => {
    console.log(`🔲 Grid rebalanced around $${newBasePrice}`);
  });

  // Risk management events
  bot.on("positionLimitWarning", (position: number) => {
    console.log(`⚠️ Position limit warning: ${position} ETH`);
  });

  bot.on("stopLossTriggered", (details: any) => {
    console.log(`🛑 Stop loss triggered:`, details);
  });

  bot.on("takeProfitTriggered", (details: any) => {
    console.log(`🎯 Take profit triggered:`, details);
  });

  // Error handling
  bot.on("error", (error: Error) => {
    console.error("❌ Bot error:", error.message);
  });

  // Log statistics every minute
  setInterval(() => {
    const stats = bot.getStatistics();
    console.log("\n📊 Current Statistics:");
    console.log(`   Trades: ${stats.totalTrades}`);
    console.log(`   Position: ${stats.currentPosition} ETH`);
    console.log(`   Total Volume: $${stats.volume.totalVolumeUSD.toFixed(2)}`);
    console.log(`   P&L: $${(stats.totalPnL || 0).toFixed(2)}`);
    console.log("");
  }, 60000); // Every minute
}

async function keepAlive(bot: TradingBot): Promise<void> {
  // Graceful shutdown handling
  process.on("SIGINT", async () => {
    console.log("\n🛑 Received interrupt signal");
    console.log("🔄 Stopping bot gracefully...");

    try {
      await bot.stop();
      console.log("✅ Bot stopped successfully");
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
║           Nimbus v1.0.0               ║
║         Basic Grid Bot Example        ║
╚═══════════════════════════════════════╝
`);

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  runBasicGridBot().catch(console.error);
}

export { runBasicGridBot };
