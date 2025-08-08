#!/usr/bin/env tsx

/**
 * Portfolio Rebalancing Bot Example
 *
 * This example demonstrates how to set up a portfolio rebalancing bot
 * that maintains target allocations across multiple assets.
 * Perfect for diversified crypto portfolios!
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

async function runPortfolioBot() {
  console.log("🔄 Starting Portfolio Rebalancing Bot");
  console.log("=====================================");

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

    // 2. Configure portfolio strategy
    const config: TradingBotConfig = {
      botType: BOT_TYPE.PORTFOLIO,
      symbol: "BTC", // Primary symbol for reporting
      investmentSize: 5000, // $5000 total portfolio
      maxPosition: 50.0, // Maximum total position
      stopLoss: 20, // 20% portfolio stop loss
      takeProfit: 50, // 50% portfolio take profit
      metadata: {
        // Target portfolio allocations (must sum to 1.0)
        target_allocations: {
          BTC: 0.4, // 40% Bitcoin
          ETH: 0.3, // 30% Ethereum
          SOL: 0.2, // 20% Solana
          MATIC: 0.1, // 10% Polygon
        },

        // Rebalancing configuration
        rebalance_threshold: 0.05, // Rebalance when >5% off target
        rebalance_interval: 24, // Check every 24 hours

        // Trading configuration
        trading_config: {
          order_type: "market", // Use market orders for rebalancing
          slippage_tolerance: 0.01, // 1% slippage tolerance
          limit_order_timeout_minutes: 30,
        },

        // Portfolio limits
        portfolio_limits: {
          min_allocation_percentage: 0.05, // Min 5% per asset
          max_allocation_percentage: 0.6, // Max 60% per asset
          min_rebalance_amount: 25, // Min $25 rebalance size
        },

        // Risk management for portfolio
        risk_management: {
          stop_loss: {
            enabled: true,
            percentage: 20, // Stop entire portfolio if down 20%
          },
          take_profit: {
            enabled: true,
            percentage: 50, // Take profit when up 50%
          },
        },
      },
    };

    // 3. Create and configure bot
    console.log("🏗️ Creating portfolio bot...");
    const bot = new TradingBot(exchange, config);

    // 4. Set up event listeners
    setupEventListeners(bot);

    // 5. Initialize and start bot
    console.log("🚀 Initializing portfolio bot...");
    await bot.initialize();

    console.log("▶️ Starting portfolio bot...");
    await bot.start();

    console.log("✅ Portfolio bot is now running!");
    console.log("🔄 Will rebalance when allocations drift >5% from targets");
    console.log("⏹️ Press Ctrl+C to stop the bot");

    // Show target allocation
    showPortfolioTargets(config.metadata.target_allocations);

    // Keep the process running
    await keepAlive(bot);
  } catch (error) {
    console.error("❌ Error running portfolio bot:", error);
    process.exit(1);
  }
}

function setupEventListeners(bot: TradingBot) {
  // Portfolio-specific events
  bot.on("portfolioRebalanced", (rebalance: any) => {
    console.log("\n🔄 Portfolio Rebalanced!");
    console.log("========================");
    console.log(`   Trigger: ${rebalance.trigger}`);
    console.log(`   Actions taken: ${rebalance.actions.length}`);

    rebalance.actions.forEach((action: any, i: number) => {
      console.log(
        `   ${i + 1}. ${action.type} ${action.amount} ${action.asset} at $${
          action.price
        }`
      );
    });

    console.log("\n📊 New Allocations:");
    Object.entries(rebalance.newAllocations).forEach(
      ([asset, allocation]: [string, any]) => {
        console.log(`   ${asset}: ${(allocation * 100).toFixed(1)}%`);
      }
    );
    console.log("");
  });

  bot.on("allocationDrift", (drift: any) => {
    console.log(
      `📈 Allocation drift detected for ${drift.asset}: ${drift.currentAllocation}% (target: ${drift.targetAllocation}%)`
    );
  });

  bot.on("rebalanceScheduled", (nextTime: Date) => {
    console.log(
      `⏰ Next rebalance check scheduled for: ${nextTime.toLocaleString()}`
    );
  });

  // Risk management events
  bot.on("portfolioStopLoss", (details: any) => {
    console.log("🛑 PORTFOLIO STOP LOSS TRIGGERED!");
    console.log(`   Total portfolio loss: ${details.lossPercentage}%`);
    console.log(`   Portfolio value: $${details.currentValue}`);
    console.log("   Liquidating all positions...");
  });

  bot.on("portfolioTakeProfit", (details: any) => {
    console.log("🎯 PORTFOLIO TAKE PROFIT TRIGGERED!");
    console.log(`   Total portfolio gain: ${details.gainPercentage}%`);
    console.log(`   Portfolio value: $${details.currentValue}`);
    console.log("   Securing profits...");
  });

  // Individual asset events
  bot.on("assetPurchased", (purchase: any) => {
    console.log(
      `📈 Purchased: ${purchase.amount} ${purchase.asset} at $${purchase.price}`
    );
  });

  bot.on("assetSold", (sale: any) => {
    console.log(`📉 Sold: ${sale.amount} ${sale.asset} at $${sale.price}`);
  });

  // Error handling
  bot.on("error", (error: Error) => {
    console.error("❌ Portfolio Bot error:", error.message);
  });

  // Enhanced statistics every 2 hours
  setInterval(() => {
    const stats = bot.getStatistics();
    console.log("\n📊 Portfolio Performance Summary:");
    console.log(`   Total Rebalances: ${stats.totalRebalances || 0}`);
    console.log(`   Portfolio Value: $${stats.portfolioValue || "N/A"}`);
    console.log(`   Total P&L: $${(stats.totalPnL || 0).toFixed(2)}`);
    console.log(`   Portfolio Drift: ${(stats.maxDrift || 0).toFixed(2)}%`);

    if (stats.allocations) {
      console.log("\n📈 Current Allocations:");
      Object.entries(stats.allocations).forEach(
        ([asset, allocation]: [string, any]) => {
          console.log(`   ${asset}: ${(allocation * 100).toFixed(1)}%`);
        }
      );
    }
    console.log("");
  }, 7200000); // Every 2 hours
}

function showPortfolioTargets(targets: Record<string, number>) {
  console.log("\n🎯 Target Portfolio Allocations:");
  console.log("================================");

  Object.entries(targets).forEach(([asset, allocation]) => {
    console.log(`   ${asset}: ${(allocation * 100).toFixed(1)}%`);
  });

  console.log("\n📋 Rebalancing Rules:");
  console.log("   • Rebalance when any asset drifts >5% from target");
  console.log("   • Check allocations every 24 hours");
  console.log("   • Minimum rebalance amount: $25");
  console.log("   • Use market orders for immediate execution");
  console.log("");
}

async function keepAlive(bot: TradingBot): Promise<void> {
  // Graceful shutdown handling
  process.on("SIGINT", async () => {
    console.log("\n🛑 Received interrupt signal");
    console.log("🔄 Stopping portfolio bot...");

    try {
      await bot.stop();

      // Show final portfolio summary
      const stats = bot.getStatistics();
      console.log("\n📊 Final Portfolio Summary:");
      console.log(`   Total rebalances: ${stats.totalRebalances || 0}`);
      console.log(
        `   Final portfolio value: $${stats.portfolioValue || "N/A"}`
      );
      console.log(`   Total P&L: $${(stats.totalPnL || 0).toFixed(2)}`);

      if (stats.allocations) {
        console.log("\n📈 Final Allocations:");
        Object.entries(stats.allocations).forEach(
          ([asset, allocation]: [string, any]) => {
            console.log(`   ${asset}: ${(allocation * 100).toFixed(1)}%`);
          }
        );
      }

      console.log("✅ Portfolio bot stopped successfully");
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
║       Portfolio Rebalancing Bot       ║
║     "Don't put all eggs in one        ║
║         basket" - Automated           ║
╚═══════════════════════════════════════╝
`);

// Educational note about portfolio rebalancing
console.log(`
💡 Portfolio Rebalancing Benefits:
   • Maintains diversification
   • Forces buy low, sell high behavior
   • Reduces portfolio volatility
   • Automates disciplined investing

⚙️ How It Works:
   1. Monitor current vs target allocations
   2. Rebalance when drift exceeds threshold
   3. Sell overweight assets, buy underweight
   4. Maintain target allocation percentages

⚠️ Considerations:
   • Higher trading frequency = more fees
   • Best for medium to long-term strategies
   • Requires careful asset selection
   • Monitor for tax implications
`);

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  runPortfolioBot().catch(console.error);
}

export { runPortfolioBot };
