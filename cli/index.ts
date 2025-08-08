#!/usr/bin/env node

/**
 * Nimbus Interactive CLI
 *
 * A production-ready command line interface for creating, configuring,
 * and managing trading bots with interactive prompts and validation.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { createInterface } from "readline";
import { config } from "dotenv";
import {
  TradingBot,
  ExchangeFactory,
  BotType,
  BOT_TYPE,
  TradingBotConfig,
  SupportedExchange,
} from "../index.js";

// Load environment variables
config();

interface CLIConfig {
  exchange: {
    type: SupportedExchange;
    walletAddress?: string;
    privateKey?: string;
    testnet: boolean;
  };
  bot: TradingBotConfig;
  monitoring: {
    logLevel: "minimal" | "normal" | "verbose";
    saveToFile: boolean;
    webhookUrl?: string;
  };
}

class NimbusCLI {
  private rl: ReturnType<typeof createInterface>;
  private config: Partial<CLIConfig> = {};
  private configDir = join(process.cwd(), ".nimbus");
  private configFile = join(this.configDir, "config.json");

  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Create config directory if it doesn't exist
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
  }

  async start() {
    this.showBanner();
    await this.loadExistingConfig();
    await this.showMainMenu();
  }

  private showBanner() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     🤖 Nimbus CLI v1.0.0                     ║
║               Production-Ready Trading Bot System            ║
╠══════════════════════════════════════════════════════════════╣
║  • Grid Trading      • DCA Strategy      • Portfolio Mgmt    ║
║  • Martingale        • Risk Management   • Multi-Exchange    ║
╚══════════════════════════════════════════════════════════════╝
`);
  }

  private async showMainMenu() {
    console.log("\n🚀 What would you like to do?");
    console.log("1. 🎯 Create New Bot");
    console.log("2. ⚙️  Configure Bot Settings");
    console.log("3. 📊 Load Configuration from File");
    console.log("4. 💾 Save Current Configuration");
    console.log("5. 🔍 Validate Configuration");
    console.log("6. ▶️  Start Trading Bot");
    console.log("7. 📚 Show Examples");
    console.log("8. ❓ Help & Documentation");
    console.log("9. 🚪 Exit");

    const choice = await this.prompt("\nEnter your choice (1-9): ");

    switch (choice.trim()) {
      case "1":
        await this.createNewBot();
        break;
      case "2":
        await this.configureBotSettings();
        break;
      case "3":
        await this.loadConfigFromFile();
        break;
      case "4":
        await this.saveConfiguration();
        break;
      case "5":
        await this.validateConfiguration();
        break;
      case "6":
        await this.startTradingBot();
        break;
      case "7":
        await this.showExamples();
        break;
      case "8":
        await this.showHelp();
        break;
      case "9":
        console.log("👋 Goodbye! Happy trading!");
        process.exit(0);
        break;
      default:
        console.log("❌ Invalid choice. Please select 1-9.");
        await this.showMainMenu();
    }
  }

  private async createNewBot() {
    console.log("\n🎯 Creating New Trading Bot");
    console.log("============================");

    // Exchange configuration
    await this.configureExchange();

    // Bot strategy selection
    await this.selectBotStrategy();

    // Risk management
    await this.configureRiskManagement();

    // Monitoring settings
    await this.configureMonitoring();

    console.log("✅ Bot configuration complete!");
    await this.showMainMenu();
  }

  private async configureExchange() {
    console.log("\n🔗 Exchange Configuration");
    console.log("-------------------------");

    const exchanges = ["hyperliquid"];
    console.log("Supported exchanges:");
    exchanges.forEach((ex, i) => console.log(`${i + 1}. ${ex}`));

    const choice = await this.prompt("Select exchange (1): ");
    const selectedExchange =
      exchanges[parseInt(choice.trim()) - 1] || "hyperliquid";

    this.config.exchange = {
      type: selectedExchange as SupportedExchange,
      testnet: true,
    };

    // Get credentials
    const walletAddress = await this.prompt(
      "Wallet address (or press Enter to use env): "
    );
    const privateKey = await this.promptSecret(
      "Private key (or press Enter to use env): "
    );

    if (walletAddress.trim()) {
      this.config.exchange.walletAddress = walletAddress.trim();
    }
    if (privateKey.trim()) {
      this.config.exchange.privateKey = privateKey.trim();
    }

    const testnet = await this.prompt("Use testnet? (Y/n): ");
    this.config.exchange.testnet = !testnet.toLowerCase().startsWith("n");

    console.log(
      `✅ Exchange configured: ${selectedExchange} (${
        this.config.exchange.testnet ? "testnet" : "mainnet"
      })`
    );
  }

  private async selectBotStrategy(): Promise<void> {
    console.log("\n🎯 Strategy Selection");
    console.log("--------------------");

    const strategies = [
      {
        type: BOT_TYPE.GRID,
        name: "Grid Trading",
        description: "Buy low, sell high with grid levels",
      },
      {
        type: BOT_TYPE.DCA,
        name: "Dollar Cost Averaging",
        description: "Regular purchases over time",
      },
      {
        type: BOT_TYPE.MARTINGALE,
        name: "Martingale",
        description: "Double down on losses (risky)",
      },
      {
        type: BOT_TYPE.PORTFOLIO,
        name: "Portfolio Rebalancing",
        description: "Maintain target allocations",
      },
    ];

    console.log("Available strategies:");
    strategies.forEach((strategy, i) => {
      console.log(`${i + 1}. ${strategy.name} - ${strategy.description}`);
    });

    const choice = await this.prompt("Select strategy (1-4): ");
    const selectedStrategy = strategies[parseInt(choice.trim()) - 1];

    if (!selectedStrategy) {
      console.log("❌ Invalid strategy selection");
      return await this.selectBotStrategy();
    }

    // Basic bot config
    const symbol = await this.prompt("Trading symbol (e.g., BTC, ETH): ");
    const investmentSize = parseFloat(
      await this.prompt("Investment amount (USD): ")
    );
    const maxPosition = parseFloat(
      await this.prompt("Maximum position size: ")
    );

    this.config.bot = {
      botType: selectedStrategy.type as BotType,
      symbol: symbol.trim().toUpperCase(),
      investmentSize,
      maxPosition,
      metadata: {},
    };

    // Strategy-specific configuration
    await this.configureStrategySpecific(selectedStrategy.type as BotType);

    console.log(`✅ Strategy configured: ${selectedStrategy.name}`);
  }

  private async configureStrategySpecific(strategy: BotType) {
    switch (strategy) {
      case BOT_TYPE.GRID:
        await this.configureGridStrategy();
        break;
      case BOT_TYPE.DCA:
        await this.configureDCAStrategy();
        break;
      case BOT_TYPE.MARTINGALE:
        await this.configureMartingaleStrategy();
        break;
      case BOT_TYPE.PORTFOLIO:
        await this.configurePortfolioStrategy();
        break;
    }
  }

  private async configureGridStrategy() {
    console.log("\n🔲 Grid Strategy Configuration");
    console.log("------------------------------");

    const gridSpacing =
      parseFloat(await this.prompt("Grid spacing (%) [0.5]: ")) || 0.5;
    const gridQuantity =
      parseInt(await this.prompt("Number of grid levels [10]: ")) || 10;
    const activeLevels =
      parseInt(await this.prompt("Active levels per side [2]: ")) || 2;

    const gridMode = await this.prompt(
      "Grid mode (arithmetic/geometric) [arithmetic]: "
    );

    this.config.bot!.metadata = {
      gridSpacing,
      gridQuantity,
      activeLevels,
      gridMode: gridMode.trim() || "arithmetic",
    };

    const useBounds = await this.prompt("Set price bounds? (y/N): ");
    if (useBounds.toLowerCase().startsWith("y")) {
      const upperBound = parseFloat(await this.prompt("Upper price bound: "));
      const lowerBound = parseFloat(await this.prompt("Lower price bound: "));
      this.config.bot!.metadata.upperBound = upperBound;
      this.config.bot!.metadata.lowerBound = lowerBound;
    }
  }

  private async configureDCAStrategy() {
    console.log("\n📈 DCA Strategy Configuration");
    console.log("-----------------------------");

    const intervalHours =
      parseInt(await this.prompt("Purchase interval (hours) [24]: ")) || 24;
    const orderSize =
      parseFloat(await this.prompt("Order size (USD) [50]: ")) || 50;
    const maxOrders =
      parseInt(await this.prompt("Maximum orders [20]: ")) || 20;
    const maxDailyOrders =
      parseInt(await this.prompt("Max daily orders [1]: ")) || 1;

    this.config.bot!.metadata = {
      interval_hours: intervalHours,
      order_size: orderSize,
      max_orders: maxOrders,
      max_daily_orders: maxDailyOrders,
      min_order_size: orderSize * 0.5,
      max_order_size: orderSize * 2,
    };
  }

  private async configureMartingaleStrategy() {
    console.log("\n⚡ Martingale Strategy Configuration");
    console.log("-----------------------------------");
    console.log("⚠️  WARNING: Martingale is a high-risk strategy!");

    const confirm = await this.prompt("Continue with Martingale? (y/N): ");
    if (!confirm.toLowerCase().startsWith("y")) {
      return await this.selectBotStrategy();
    }

    const stepMultiplier =
      parseFloat(await this.prompt("Step multiplier [2.0]: ")) || 2.0;
    const maxOrders = parseInt(await this.prompt("Maximum orders [5]: ")) || 5;
    const baseOrderSize =
      parseFloat(await this.prompt("Base order size (USD) [10]: ")) || 10;
    const entryTrigger =
      parseFloat(await this.prompt("Entry trigger (% drop) [2]: ")) || 2;
    const profitPercentage =
      parseFloat(await this.prompt("Profit target (%) [1]: ")) || 1;

    this.config.bot!.metadata = {
      step_multiplier: stepMultiplier,
      max_orders: maxOrders,
      base_order_size: baseOrderSize,
      entry_trigger: { price_drop_percentage: entryTrigger },
      exit_strategy: { profit_percentage: profitPercentage },
      safety_controls: {
        max_position_multiple: Math.pow(stepMultiplier, maxOrders),
      },
    };
  }

  private async configurePortfolioStrategy() {
    console.log("\n🔄 Portfolio Strategy Configuration");
    console.log("-----------------------------------");

    const assets: Record<string, number> = {};
    let totalAllocation = 0;

    console.log("Enter target allocations (must sum to 1.0):");

    while (totalAllocation < 1.0) {
      const asset = await this.prompt("Asset symbol (or 'done' to finish): ");
      if (asset.toLowerCase() === "done") break;

      const allocation = parseFloat(
        await this.prompt(`Allocation for ${asset} (0-1): `)
      );
      if (allocation > 0 && totalAllocation + allocation <= 1.0) {
        assets[asset.toUpperCase()] = allocation;
        totalAllocation += allocation;
        console.log(
          `Added ${asset}: ${(allocation * 100).toFixed(1)}% (Total: ${(
            totalAllocation * 100
          ).toFixed(1)}%)`
        );
      } else {
        console.log("❌ Invalid allocation or would exceed 100%");
      }
    }

    const rebalanceThreshold =
      parseFloat(await this.prompt("Rebalance threshold (%) [5]: ")) || 5;
    const rebalanceInterval =
      parseInt(await this.prompt("Rebalance interval (hours) [24]: ")) || 24;

    this.config.bot!.metadata = {
      target_allocations: assets,
      rebalance_threshold: rebalanceThreshold / 100,
      rebalance_interval: rebalanceInterval,
      trading_config: {
        order_type: "market",
        slippage_tolerance: 0.01,
        limit_order_timeout_minutes: 30,
      },
      portfolio_limits: {
        min_allocation_percentage: 0.05,
        max_allocation_percentage: 0.6,
        min_rebalance_amount: 10,
      },
    };
  }

  private async configureRiskManagement() {
    console.log("\n🛡️ Risk Management Configuration");
    console.log("--------------------------------");

    const useStopLoss = await this.prompt("Enable stop loss? (Y/n): ");
    if (!useStopLoss.toLowerCase().startsWith("n")) {
      const stopLossPercent =
        parseFloat(await this.prompt("Stop loss percentage [10]: ")) || 10;
      this.config.bot!.stopLoss = stopLossPercent;
    }

    const useTakeProfit = await this.prompt("Enable take profit? (Y/n): ");
    if (!useTakeProfit.toLowerCase().startsWith("n")) {
      const takeProfitPercent =
        parseFloat(await this.prompt("Take profit percentage [20]: ")) || 20;
      this.config.bot!.takeProfit = takeProfitPercent;
    }

    console.log("✅ Risk management configured");
  }

  private async configureMonitoring() {
    console.log("\n📊 Monitoring Configuration");
    console.log("---------------------------");

    const logLevels = ["minimal", "normal", "verbose"];
    console.log("Log levels:");
    logLevels.forEach((level, i) => console.log(`${i + 1}. ${level}`));

    const logChoice = await this.prompt("Select log level (1-3) [2]: ");
    const logLevel = logLevels[parseInt(logChoice.trim()) - 1] || "normal";

    const saveToFile = await this.prompt("Save logs to file? (Y/n): ");
    const webhookUrl = await this.prompt("Webhook URL for alerts (optional): ");

    this.config.monitoring = {
      logLevel: logLevel as "minimal" | "normal" | "verbose",
      saveToFile: !saveToFile.toLowerCase().startsWith("n"),
      webhookUrl: webhookUrl.trim() || undefined,
    };

    console.log("✅ Monitoring configured");
  }

  private async startTradingBot() {
    console.log("\n▶️ Starting Trading Bot");
    console.log("=======================");

    if (!this.config.bot || !this.config.exchange) {
      console.log("❌ Bot not configured. Please create a bot first.");
      return await this.showMainMenu();
    }

    try {
      // Create exchange
      const exchange = ExchangeFactory.create(this.config.exchange.type, {
        walletAddress:
          this.config.exchange.walletAddress ||
          process.env.HYPERLIQUID_WALLET_ADDRESS!,
        privateKey:
          this.config.exchange.privateKey ||
          process.env.HYPERLIQUID_PRIVATE_KEY!,
        testnet: this.config.exchange.testnet,
        enableWs: true,
      });

      // Create bot
      const bot = new TradingBot(exchange, this.config.bot);

      // Set up monitoring
      this.setupBotMonitoring(bot);

      console.log("🚀 Initializing bot...");
      await bot.initialize();

      console.log("▶️ Starting bot...");
      await bot.start();

      console.log("✅ Bot is now running!");
      console.log("📊 Monitor the logs for trading activity");
      console.log("⏹️ Press Ctrl+C to stop the bot");

      // Handle graceful shutdown
      await this.handleGracefulShutdown(bot);
    } catch (error) {
      console.error("❌ Error starting bot:", error);
      await this.showMainMenu();
    }
  }

  private setupBotMonitoring(bot: TradingBot) {
    const logLevel = this.config.monitoring?.logLevel || "normal";

    // Always log critical events
    bot.on("error", (error: Error) => {
      console.error("❌ Bot error:", error.message);
    });

    bot.on("stopLossTriggered", (details: any) => {
      console.log("🛑 STOP LOSS TRIGGERED:", details);
    });

    bot.on("takeProfitTriggered", (details: any) => {
      console.log("🎯 TAKE PROFIT TRIGGERED:", details);
    });

    if (logLevel !== "minimal") {
      bot.on("orderFilled", (fill: any) => {
        console.log(
          `✅ Order filled: ${fill.side} ${fill.size} at $${fill.price}`
        );
      });

      bot.on("orderPlaced", (order: any) => {
        console.log(
          `📝 Order placed: ${order.side} ${order.size} at $${order.price}`
        );
      });
    }

    if (logLevel === "verbose") {
      bot.on("orderCancelled", (order: any) => {
        console.log(`❌ Order cancelled: ${order.id}`);
      });

      bot.on("positionUpdate", (position: any) => {
        console.log(`📊 Position: ${position.size}`);
      });
    }

    // Statistics logging
    setInterval(() => {
      const stats = bot.getStatistics();
      console.log(
        `\n📊 Stats: ${stats.totalTrades} trades | $${(
          stats.totalPnL || 0
        ).toFixed(2)} P&L\n`
      );
    }, 300000); // Every 5 minutes
  }

  private async handleGracefulShutdown(bot: TradingBot): Promise<void> {
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

    // Keep process alive
    return new Promise(() => {});
  }

  private async loadConfigFromFile() {
    const filePath = await this.prompt("Config file path [./config.json]: ");
    const fullPath = filePath.trim() || "./config.json";

    try {
      const configData = readFileSync(fullPath, "utf8");
      this.config = JSON.parse(configData);
      console.log("✅ Configuration loaded successfully");
    } catch (error) {
      console.log("❌ Error loading configuration:", error);
    }

    await this.showMainMenu();
  }

  private async saveConfiguration() {
    if (!this.config.bot) {
      console.log("❌ No configuration to save");
      return await this.showMainMenu();
    }

    const filePath = await this.prompt("Save to file [./config.json]: ");
    const fullPath = filePath.trim() || "./config.json";

    try {
      writeFileSync(fullPath, JSON.stringify(this.config, null, 2));
      console.log(`✅ Configuration saved to ${fullPath}`);
    } catch (error) {
      console.log("❌ Error saving configuration:", error);
    }

    await this.showMainMenu();
  }

  private async validateConfiguration() {
    console.log("\n🔍 Validating Configuration");
    console.log("---------------------------");

    if (!this.config.bot) {
      console.log("❌ No bot configuration found");
      return await this.showMainMenu();
    }

    // Validate basic config
    const errors: string[] = [];

    if (!this.config.bot.symbol) errors.push("Missing trading symbol");
    if (
      !this.config.bot.investmentSize ||
      this.config.bot.investmentSize <= 0
    ) {
      errors.push("Invalid investment amount");
    }
    if (!this.config.bot.maxPosition || this.config.bot.maxPosition <= 0) {
      errors.push("Invalid max position");
    }

    // Strategy-specific validation
    // (Add more validation logic here)

    if (errors.length === 0) {
      console.log("✅ Configuration is valid");
    } else {
      console.log("❌ Configuration errors:");
      errors.forEach((error) => console.log(`   • ${error}`));
    }

    await this.showMainMenu();
  }

  private async showExamples() {
    console.log("\n📚 Example Configurations");
    console.log("=========================");

    const examples = [
      "Grid Bot: ETH with 0.5% spacing, 10 levels",
      "DCA Bot: BTC every 24h, $50 per order",
      "Portfolio: 40% BTC, 30% ETH, 20% SOL, 10% MATIC",
      "Martingale: High risk, 2x multiplier, 5 orders max",
    ];

    examples.forEach((example, i) => {
      console.log(`${i + 1}. ${example}`);
    });

    await this.prompt("\nPress Enter to continue...");
    await this.showMainMenu();
  }

  private async showHelp() {
    console.log(`
📖 Nimbus CLI Help
====================

🎯 Getting Started:
   1. Create a new bot configuration
   2. Configure exchange credentials
   3. Select and configure a trading strategy
   4. Set up risk management
   5. Start the bot

⚙️ Configuration Files:
   • Saved in JSON format
   • Can be loaded and modified
   • Shared between environments

🔐 Security:
   • Store credentials in environment variables
   • Use testnet for testing
   • Enable stop-loss protection

📊 Monitoring:
   • Real-time console output
   • Multiple verbosity levels
   • Webhook notifications

🆘 Support:
   • Documentation: See examples folder
   • Issues: GitHub repository
   • Community: Discord server
`);

    await this.prompt("Press Enter to continue...");
    await this.showMainMenu();
  }

  private async loadExistingConfig() {
    if (existsSync(this.configFile)) {
      try {
        const configData = readFileSync(this.configFile, "utf8");
        this.config = JSON.parse(configData);
        console.log("✅ Loaded existing configuration");
      } catch (error) {
        console.log("⚠️ Could not load existing configuration");
      }
    }
  }

  private async configureBotSettings() {
    console.log("\n⚙️ Configure Bot Settings");
    console.log("=========================");

    if (!this.config.bot) {
      console.log("❌ No bot configuration found. Please create a bot first.");
      return await this.showMainMenu();
    }

    console.log("What would you like to configure?");
    console.log("1. 🎯 Strategy Settings");
    console.log("2. 🛡️ Risk Management");
    console.log("3. 📊 Monitoring");
    console.log("4. 🔙 Back to Main Menu");

    const choice = await this.prompt("Enter choice (1-4): ");

    switch (choice.trim()) {
      case "1":
        await this.configureStrategySpecific(this.config.bot.botType);
        break;
      case "2":
        await this.configureRiskManagement();
        break;
      case "3":
        await this.configureMonitoring();
        break;
      case "4":
        break;
    }

    await this.showMainMenu();
  }

  private async prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  private async promptSecret(question: string): Promise<string> {
    // In a real implementation, you'd want to hide input for passwords
    return this.prompt(question);
  }

  close() {
    this.rl.close();
  }
}

// CLI Entry point
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const cli = new NimbusCLI();

  cli.start().catch((error) => {
    console.error("❌ CLI Error:", error);
    process.exit(1);
  });

  // Cleanup on exit
  process.on("SIGINT", () => {
    cli.close();
    process.exit(0);
  });
}

export { NimbusCLI };
