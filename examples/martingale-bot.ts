#!/usr/bin/env tsx

/**
 * Martingale Bot Example
 *
 * ⚠️ WARNING: Martingale is a HIGH RISK strategy!
 * This example demonstrates the martingale strategy where position sizes
 * are doubled after each loss to recover all previous losses with one win.
 *
 * USE WITH EXTREME CAUTION and ONLY on testnet first!
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

async function runMartingaleBot() {
  console.log("🎲 Starting Martingale Bot Example");
  console.log("=================================");
  console.log("⚠️  WARNING: HIGH RISK STRATEGY!");
  console.log("🧪 Only use on testnet with small amounts");

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
      testnet: true, // ALWAYS use testnet for Martingale!
      enableWs: true,
    });

    // 2. Configure Martingale strategy with CONSERVATIVE settings
    const config: TradingBotConfig = {
      botType: BOT_TYPE.MARTINGALE,
      symbol: "ETH", // Trading ETH-PERP
      investmentSize: 500, // $500 total budget (SMALL amount for testing)
      maxPosition: 2.0, // Maximum 2 ETH total exposure
      stopLoss: 25, // 25% portfolio stop loss (CRITICAL for risk management)
      metadata: {
        // Martingale configuration
        step_multiplier: 2.0, // Double position size on each step
        max_orders: 4, // Maximum 4 martingale orders (limits total risk)
        base_order_size: 25, // Start with $25 orders (SMALL for testing)

        // Entry trigger (when to start martingale sequence)
        entry_trigger: {
          price_drop_percentage: 3.0, // Start sequence on 3% price drop
        },

        // Exit strategy (when to close profitable positions)
        exit_strategy: {
          profit_percentage: 2.0, // Exit when 2% profitable on total position
        },

        // Safety controls (CRITICAL for risk management)
        safety_controls: {
          max_position_multiple: 8, // Max total position = 8x base order
        },

        // Enhanced risk management
        risk_management: {
          stop_loss: {
            enabled: true,
            percentage: 25, // Stop entire strategy if down 25%
          },
          take_profit: {
            enabled: true,
            percentage: 10, // Take profit when up 10% overall
          },
        },
      },
    };

    // 3. Show risk warning and configuration
    showRiskWarning(config);

    // Ask for confirmation (in a real app, you'd want user input)
    console.log("🤔 Review the configuration above carefully...");
    await new Promise((resolve) => setTimeout(resolve, 3000)); // 3 second pause

    // 4. Create and configure bot
    console.log("🏗️ Creating Martingale bot...");
    const bot = new TradingBot(exchange, config);

    // 5. Set up event listeners with extra risk monitoring
    setupMartingaleEventListeners(bot);

    // 6. Initialize and start bot
    console.log("🚀 Initializing Martingale bot...");
    await bot.initialize();

    console.log("▶️ Starting Martingale bot...");
    await bot.start();

    console.log("✅ Martingale bot is now running!");
    console.log("🎲 Will start doubling down on 3% price drops");
    console.log("⚠️ Monitor closely - this strategy can lose money quickly!");
    console.log("⏹️ Press Ctrl+C to stop the bot");

    // Keep the process running
    await keepAlive(bot);
  } catch (error) {
    console.error("❌ Error running Martingale bot:", error);
    process.exit(1);
  }
}

function setupMartingaleEventListeners(bot: TradingBot) {
  // Martingale-specific events
  bot.on("martingaleSequenceStarted", (details: any) => {
    console.log("\n🎲 MARTINGALE SEQUENCE STARTED!");
    console.log("==============================");
    console.log(`   Trigger: ${details.trigger}% price drop`);
    console.log(`   Entry price: $${details.entryPrice}`);
    console.log(`   Base order size: $${details.baseOrderSize}`);
    console.log(`   Max orders in sequence: ${details.maxOrders}`);
    console.log("");
  });

  bot.on("martingaleOrderPlaced", (order: any) => {
    console.log(`🎯 Martingale Order #${order.sequenceNumber}:`);
    console.log(`   Size: $${order.amountUSD} (${order.size} ETH)`);
    console.log(`   Price: $${order.price}`);
    console.log(`   Total position: ${order.totalPosition} ETH`);
    console.log(`   Total invested: $${order.totalInvested}`);
    console.log(`   Required profit price: $${order.profitTargetPrice}`);
  });

  bot.on("martingaleOrderFilled", (fill: any) => {
    console.log(`✅ Martingale Order #${fill.sequenceNumber} FILLED:`);
    console.log(`   Filled: ${fill.size} ETH at $${fill.price}`);
    console.log(`   New average entry: $${fill.newAveragePrice}`);
    console.log(`   Unrealized P&L: $${fill.unrealizedPnL}`);

    if (fill.sequenceNumber >= 3) {
      console.log(
        `⚠️ WARNING: Deep in martingale sequence (order #${fill.sequenceNumber})`
      );
    }
  });

  bot.on("martingaleSequenceCompleted", (result: any) => {
    console.log("\n🎉 MARTINGALE SEQUENCE COMPLETED!");
    console.log("=================================");
    console.log(`   Result: ${result.outcome} (${result.profitPercentage}%)`);
    console.log(`   Total orders: ${result.totalOrders}`);
    console.log(`   Final P&L: $${result.finalPnL}`);
    console.log(`   Sequence duration: ${result.duration} minutes`);
    console.log("");
  });

  bot.on("martingaleMaxOrdersReached", (details: any) => {
    console.log("\n🚨 MARTINGALE MAX ORDERS REACHED!");
    console.log("=================================");
    console.log(`   Orders executed: ${details.ordersExecuted}`);
    console.log(`   Total position: ${details.totalPosition} ETH`);
    console.log(`   Total invested: $${details.totalInvested}`);
    console.log(`   Current unrealized P&L: $${details.unrealizedPnL}`);
    console.log(
      `   Waiting for price recovery to: $${details.profitTargetPrice}`
    );
    console.log("⚠️ No more orders will be placed in this sequence!");
    console.log("");
  });

  // Risk management events (CRITICAL for Martingale)
  bot.on("riskLimitExceeded", (risk: any) => {
    console.log("🚨 RISK LIMIT EXCEEDED!");
    console.log(`   Risk type: ${risk.type}`);
    console.log(`   Current value: ${risk.currentValue}`);
    console.log(`   Limit: ${risk.limit}`);
    console.log("   Halting all new orders!");
  });

  bot.on("stopLossTriggered", (details: any) => {
    console.log("🛑 MARTINGALE STOP LOSS TRIGGERED!");
    console.log(`   Loss percentage: ${details.lossPercentage}%`);
    console.log(`   Total loss: $${details.totalLoss}`);
    console.log("   Liquidating all positions...");
  });

  bot.on("takeProfitTriggered", (details: any) => {
    console.log("🎯 MARTINGALE TAKE PROFIT TRIGGERED!");
    console.log(`   Profit percentage: ${details.profitPercentage}%`);
    console.log(`   Total profit: $${details.totalProfit}`);
    console.log("   Closing all positions...");
  });

  // Position monitoring (important for risk)
  bot.on("positionUpdate", (position: any) => {
    console.log(
      `📊 Position: ${position.size} ETH | P&L: $${position.unrealizedPnL} | Margin used: ${position.marginUsed}%`
    );
  });

  // Error handling
  bot.on("error", (error: Error) => {
    console.error("❌ Martingale Bot error:", error.message);
  });

  // Enhanced risk monitoring every 30 seconds
  setInterval(() => {
    const stats = bot.getStatistics();
    console.log("\n🎲 Martingale Risk Monitor:");
    console.log(`   Active sequences: ${stats.activeSequences || 0}`);
    console.log(`   Total trades: ${stats.totalTrades}`);
    console.log(`   Current position: ${stats.currentPosition} ETH`);
    console.log(
      `   Total invested: $${stats.volume.totalVolumeUSD.toFixed(2)}`
    );
    console.log(`   Unrealized P&L: $${(stats.totalPnL || 0).toFixed(2)}`);
    console.log(`   Portfolio drawdown: ${stats.currentDrawdown || 0}%`);
    console.log(`   Risk level: ${stats.riskLevel || "Normal"}`);

    // Risk warnings
    if (stats.currentDrawdown > 10) {
      console.log("⚠️ WARNING: Significant drawdown detected!");
    }
    if (stats.activeSequences > 0) {
      console.log(
        `🎯 Active sequence orders: ${stats.sequenceOrders || "N/A"}`
      );
    }
    console.log("");
  }, 30000); // Every 30 seconds
}

function showRiskWarning(config: TradingBotConfig) {
  console.log("\n" + "⚠️".repeat(20));
  console.log("🚨 MARTINGALE STRATEGY RISK WARNING 🚨");
  console.log("⚠️".repeat(20));
  console.log("\n📋 Configuration Summary:");
  console.log(`   Symbol: ${config.symbol}`);
  console.log(`   Total budget: $${config.investmentSize}`);
  console.log(`   Base order: $${config.metadata.base_order_size}`);
  console.log(`   Max orders: ${config.metadata.max_orders}`);
  console.log(`   Step multiplier: ${config.metadata.step_multiplier}x`);
  console.log(
    `   Max total position: $${
      config.metadata.base_order_size *
      config.metadata.safety_controls.max_position_multiple
    }`
  );
  console.log(`   Stop loss: ${config.stopLoss}%`);

  console.log("\n🚨 RISKS:");
  console.log("   • Can lose your ENTIRE investment quickly");
  console.log("   • Exponential position growth on continued losses");
  console.log("   • Requires significant capital for safety");
  console.log(
    "   • Market can stay irrational longer than you can stay solvent"
  );

  console.log("\n✅ SAFETY MEASURES:");
  console.log(`   • Limited to ${config.metadata.max_orders} orders maximum`);
  console.log(`   • ${config.stopLoss}% stop loss to prevent total loss`);
  console.log("   • Small base order size for testing");
  console.log("   • Testnet only (NEVER use on mainnet without experience)");

  console.log("\n📊 Example sequence with current settings:");
  let totalRisk = 0;
  for (let i = 1; i <= config.metadata.max_orders; i++) {
    const orderSize =
      config.metadata.base_order_size *
      Math.pow(config.metadata.step_multiplier, i - 1);
    totalRisk += orderSize;
    console.log(`   Order ${i}: $${orderSize} (Total: $${totalRisk})`);
  }
  console.log(`   MAXIMUM TOTAL RISK: $${totalRisk}`);
  console.log("\n" + "⚠️".repeat(20) + "\n");
}

async function keepAlive(bot: TradingBot): Promise<void> {
  // Graceful shutdown handling
  process.on("SIGINT", async () => {
    console.log("\n🛑 Received interrupt signal");
    console.log("🔄 Stopping Martingale bot...");

    try {
      await bot.stop();

      // Show final Martingale summary
      const stats = bot.getStatistics();
      console.log("\n🎲 Final Martingale Summary:");
      console.log("============================");
      console.log(`   Total sequences: ${stats.totalSequences || 0}`);
      console.log(`   Successful sequences: ${stats.successfulSequences || 0}`);
      console.log(`   Failed sequences: ${stats.failedSequences || 0}`);
      console.log(`   Win rate: ${stats.winRate || "N/A"}%`);
      console.log(`   Total trades: ${stats.totalTrades}`);
      console.log(
        `   Total volume: $${stats.volume.totalVolumeUSD.toFixed(2)}`
      );
      console.log(`   Final P&L: $${(stats.totalPnL || 0).toFixed(2)}`);
      console.log(`   Max drawdown: ${stats.maxDrawdown || "N/A"}%`);
      console.log(
        `   Largest sequence: ${stats.largestSequence || "N/A"} orders`
      );

      console.log("✅ Martingale bot stopped successfully");
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
║           Nimbus v1.0.0               ║
║        Martingale Bot Example         ║
║     ⚠️ HIGH RISK STRATEGY ⚠️           ║
║        "Double or Nothing"            ║
╚═══════════════════════════════════════╝
`);

// Educational note about Martingale strategy
console.log(`
💡 How Martingale Works:
   1. Place initial order
   2. If price moves against us, double the position
   3. Continue doubling until price recovers
   4. One winning trade covers all previous losses

⚠️ Why Martingale is Risky:
   • Exponential position growth
   • Can exhaust capital before recovery
   • Works until it doesn't (and then you lose everything)
   • Small profits vs. catastrophic losses

📊 When Martingale Might Work:
   • Ranging/sideways markets
   • With proper position sizing
   • With strict stop losses
   • With significant capital reserves

🚨 NEVER use Martingale without:
   • Thorough backtesting
   • Proper risk management
   • Understanding of maximum drawdown
   • Ability to lose the entire investment
`);

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  runMartingaleBot().catch(console.error);
}

export { runMartingaleBot };
