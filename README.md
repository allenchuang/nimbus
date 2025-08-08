# Nimbus - Production-Ready Automated Trading System

[![npm version](https://badge.fury.io/js/%40hyperliquid-bot%2Fhyper-bot.svg)](https://badge.fury.io/js/%40hyperliquid-bot%2Fhyper-bot)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A professional-grade, modular trading bot system with advanced strategies and robust risk management. Built for Hyperliquid and easily extensible to other exchanges.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Nimbus System                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ TradingBot  │    │ Strategies  │    │   Risk Management   │  │
│  │   Engine    │◄──►│   System    │◄──►│       Layer         │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│         │                  │                        │           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │  Exchange   │    │  Strategy   │    │   Event-Driven      │  │
│  │  Interface  │    │  Factory    │    │   Architecture      │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│         │                                          │            │
│  ┌──────────────────────────────────────────────────────────────┤
│  │               Exchange Implementations                       │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │  │ Hyperliquid │  │   Binance   │  │      Future         │   │
│  │  │ (Complete)  │  │  (Planned)  │  │   Exchanges         │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │
│  └──────────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. **TradingBot Engine** (`core/TradingBot.ts`)

- Strategy-agnostic bot engine
- Event-driven architecture
- Real-time position management
- Advanced error handling and recovery

#### 2. **Strategy System** (`core/strategies/`)

- Pluggable strategy architecture
- 5 implemented strategies (Grid, DCA, Martingale, Portfolio, Smart Portfolio)
- 3 planned strategies (Arbitrage, Flywheel, TWAP/VWAP, Signal)

#### 3. **Exchange Interface** (`interfaces/IExchange.ts`)

- Standardized API across all exchanges
- WebSocket and REST support
- Order management and execution

#### 4. **Risk Management**

- Strategy-level risk controls
- Portfolio-wide limits
- Circuit breakers and safety mechanisms

## 🚀 Quick Start Guide

### Installation

```bash
# Using pnpm (recommended)
pnpm add @hyperliquid-bot/hyper-bot

# Using npm
npm install @hyperliquid-bot/hyper-bot

# Using yarn
yarn add @hyperliquid-bot/hyper-bot
```

### Environment Setup

Before running any bots, you need to configure your environment variables. Create a `.env` file in your project root:

```bash
# Copy example environment file
cp .env.example .env
```

#### Required Environment Variables

```bash
# =============================================================================
# HYPERLIQUID EXCHANGE CREDENTIALS (REQUIRED)
# =============================================================================

# Your Hyperliquid wallet address (required)
HYPERLIQUID_WALLET_ADDRESS=0x1234567890123456789012345678901234567890

# Your private key for signing transactions (required)
# ⚠️  SECURITY: Never commit this to version control!
HYPERLIQUID_PRIVATE_KEY=0x1234567890123456789012345678901234567890123456789012345678901234
```

That's it! The bot will work with just these two required variables. All other settings (testnet, WebSocket, investment amounts, risk management) are configured directly in your bot code.

#### Security Best Practices

⚠️ **CRITICAL SECURITY NOTES:**

1. **Never commit your `.env` file** to version control
2. **Use testnet first** - Set `HYPERLIQUID_TESTNET=true` for testing
3. **Secure your private key** - Consider using hardware wallets or secure key management
4. **Use environment-specific files** - `.env.development`, `.env.production`
5. **Rotate keys regularly** - Update your credentials periodically

#### Getting Your Hyperliquid Credentials

1. **Wallet Address**: Your Ethereum wallet address

   ```bash
   # Example format
   HYPERLIQUID_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b8D66dE3C64AC67F2B
   ```

2. **Private Key**: Export from your wallet (MetaMask, etc.)

   ```bash
   # Example format (64 characters after 0x)
   HYPERLIQUID_PRIVATE_KEY=0x1234567890abcdef...
   ```

3. **Testnet Setup**: For testing without real funds
   ```bash
   # Use the same credentials, but configure testnet in your bot code
   HYPERLIQUID_WALLET_ADDRESS=0x...  # Your testnet address
   HYPERLIQUID_PRIVATE_KEY=0x...     # Your testnet private key
   ```

#### Environment File Examples

**Example `.env` file:**

```bash
HYPERLIQUID_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b8D66dE3C64AC67F2B
HYPERLIQUID_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

#### Loading Environment Variables

The bot automatically loads environment variables using `dotenv`:

```typescript
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Access in your code
const walletAddress = process.env.HYPERLIQUID_WALLET_ADDRESS;
const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
```

### Basic Usage

```typescript
import dotenv from "dotenv";
import {
  TradingBot,
  ExchangeFactory,
  BOT_TYPE,
  TradingBotConfig,
} from "@hyperliquid-bot/hyper-bot";

// Load environment variables
dotenv.config();

// 1. Create exchange connection using environment variables
const exchange = ExchangeFactory.create("hyperliquid", {
  walletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS!,
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
  testnet: true, // Set to false for mainnet
});

// 2. Configure bot strategy using type-safe constants
const config: TradingBotConfig = {
  botType: BOT_TYPE.GRID, // Type-safe constant
  symbol: "BTC",
  investmentAmount: 100, // $100 USD
  maxPosition: 0.1, // Max 0.1 BTC position

  // Strategy-specific configuration
  metadata: {
    gridSpacing: 0.5, // 0.5% between grid levels
    gridQuantity: 10, // 10 total grid levels
    activeLevels: 2, // Keep 2 buy/sell orders active
  },
};

// 3. Create and start bot
const bot = new TradingBot(exchange, config);

// Set up event listeners
bot.on("orderFilled", (fill) => {
  console.log(`✅ Order filled: ${fill.side} ${fill.size} at $${fill.price}`);
});

bot.on("error", (error) => {
  console.error("❌ Bot error:", error);
});

// Initialize and start
await bot.initialize();
await bot.start();

console.log("🤖 Bot is now running!");

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down bot...");
  await bot.stop();
  process.exit(0);
});
```

## 🎯 Bot Type Constants

Nimbus now uses **type-safe constants** instead of string literals for better developer experience and fewer runtime errors.

### Import and Usage

```typescript
import { BOT_TYPE, BotType } from "@hyperliquid-bot/hyper-bot";

// ✅ NEW WAY - Type safe constants
const config = {
  botType: BOT_TYPE.GRID, // Auto-complete, no typos!
  symbol: "ETH",
  // ...
};

// ❌ OLD WAY - String literals (deprecated)
const config = {
  botType: "grid" as BotType, // Prone to typos
  // ...
};
```

### Available Constants

| Constant              | Value          | Status         | Description              |
| --------------------- | -------------- | -------------- | ------------------------ |
| `BOT_TYPE.GRID`       | `"grid"`       | ✅ Implemented | Grid trading strategy    |
| `BOT_TYPE.DCA`        | `"dca"`        | ✅ Implemented | Dollar cost averaging    |
| `BOT_TYPE.MARTINGALE` | `"martingale"` | ✅ Implemented | Martingale strategy      |
| `BOT_TYPE.PORTFOLIO`  | `"portfolio"`  | ✅ Implemented | Portfolio rebalancing    |
| `BOT_TYPE.ARBITRAGE`  | `"arbitrage"`  | 🚧 Planned     | Cross-exchange arbitrage |
| `BOT_TYPE.FLYWHEEL`   | `"flywheel"`   | 🚧 Planned     | Flywheel strategy        |
| `BOT_TYPE.TWAP_VWAP`  | `"twap_vwap"`  | 🚧 Planned     | TWAP/VWAP execution      |
| `BOT_TYPE.SIGNAL`     | `"signal"`     | 🚧 Planned     | TradingView signals      |

### Benefits

- **Type Safety**: Catch typos at compile time
- **IDE Support**: Auto-completion and IntelliSense
- **Refactoring**: Safe renames across codebase
- **Consistency**: Single source of truth

### Switch Statement Example

```typescript
function handleStrategy(botType: BotType) {
  switch (botType) {
    case BOT_TYPE.GRID:
      return setupGridStrategy();
    case BOT_TYPE.DCA:
      return setupDCAStrategy();
    case BOT_TYPE.MARTINGALE:
      return setupMartingaleStrategy();
    case BOT_TYPE.PORTFOLIO:
      return setupPortfolioStrategy();
    default:
      throw new Error(`Unsupported bot type: ${botType}`);
  }
}
```

## 📊 Trading Strategies

### 1. Grid Trading Strategy 🔲

**Best for:** Sideways markets, high-volume trading pairs

Grid trading places buy and sell orders at predetermined intervals around the current price, profiting from market volatility.

```typescript
const gridConfig = {
  botType: "grid" as BotType,
  symbol: "ETH",
  investmentAmount: 500,
  maxPosition: 2.0,
  metadata: {
    gridSpacing: 0.5, // 0.5% spacing between levels
    gridQuantity: 20, // 20 total grid levels (10 buy, 10 sell)
    gridMode: "arithmetic", // or "geometric"
    activeLevels: 3, // Keep 3 orders active on each side
    upperBound: 2500, // Optional: upper price limit
    lowerBound: 2000, // Optional: lower price limit
  },
};
```

**Strategy Flow:**

```
Price Movement:  ↑ → ↓ → ↑ → ↓
Grid Action:     Sell → Buy → Sell → Buy
Result:          Profit from each round trip
```

### 2. Dollar Cost Averaging (DCA) 📈

**Best for:** Long-term accumulation, volatile markets

DCA systematically buys at regular intervals regardless of price, reducing average cost over time.

```typescript
const dcaConfig = {
  botType: "dca" as BotType,
  symbol: "BTC",
  investmentAmount: 1000,
  maxPosition: 1.0,
  metadata: {
    interval_hours: 24, // Buy every 24 hours
    order_size: 50, // $50 per order
    max_orders: 20, // Maximum 20 orders
    max_daily_orders: 1, // Maximum 1 order per day
    min_order_size: 25, // Minimum $25 per order
    max_order_size: 100, // Maximum $100 per order
  },
};
```

### 3. Martingale Strategy ⚡

**Best for:** Mean-reverting markets (Use with caution!)

Doubles position size after each loss, aiming to recover all losses with one winning trade.

```typescript
const martingaleConfig = {
  botType: "martingale" as BotType,
  symbol: "SOL",
  investmentAmount: 200,
  maxPosition: 5.0,
  metadata: {
    step_multiplier: 2.0, // Double position each step
    max_orders: 5, // Maximum 5 doubling steps
    base_order_size: 10, // Start with $10 orders
    entry_trigger: {
      price_drop_percentage: 2, // Enter on 2% price drop
    },
    exit_strategy: {
      profit_percentage: 1, // Exit at 1% profit
    },
    safety_controls: {
      max_position_multiple: 16, // Max 16x original position
    },
  },
};
```

⚠️ **Warning:** Martingale strategy carries high risk and can lead to significant losses.

### 4. Portfolio Rebalancing 🔄

**Best for:** Diversified portfolio management

Automatically maintains target allocations across multiple assets by rebalancing when thresholds are exceeded.

```typescript
const portfolioConfig = {
  botType: "portfolio" as BotType,
  symbol: "BTC", // Primary symbol for reporting
  investmentAmount: 2000,
  maxPosition: 10.0,
  metadata: {
    target_allocations: {
      // Must sum to 1.0
      BTC: 0.4, // 40% Bitcoin
      ETH: 0.3, // 30% Ethereum
      SOL: 0.2, // 20% Solana
      MATIC: 0.1, // 10% Polygon
    },
    rebalance_threshold: 0.05, // Rebalance when >5% off target
    rebalance_interval: 24, // Check every 24 hours
    trading_config: {
      order_type: "market", // or "limit"
      slippage_tolerance: 0.01, // 1% slippage tolerance
      limit_order_timeout_minutes: 30,
    },
    portfolio_limits: {
      min_allocation_percentage: 0.05, // Min 5% per asset
      max_allocation_percentage: 0.6, // Max 60% per asset
      min_rebalance_amount: 10, // Min $10 rebalance size
    },
  },
};
```

### 5. Smart Portfolio Strategy 🧠

**Best for:** Dynamic portfolio optimization

Advanced portfolio management with automatic asset scoring and allocation adjustments.

```typescript
const smartPortfolioConfig = {
  botType: "portfolio" as BotType, // Uses portfolio strategy with smart features
  symbol: "BTC",
  investmentAmount: 5000,
  maxPosition: 50.0,
  metadata: {
    // Same as portfolio but with smart features enabled
    smart_rebalancing: true,
    performance_tracking: true,
    risk_adjusted_scoring: true,
  },
};
```

## 🛡️ Risk Management

All strategies support comprehensive risk management:

```typescript
const riskManagement = {
  stop_loss: {
    enabled: true,
    percentage: 10, // Stop at 10% loss
  },
  take_profit: {
    enabled: true,
    percentage: 20, // Take profit at 20% gain
  },
  max_position_percentage: 50, // Max 50% of portfolio
  max_daily_loss: 100, // Max $100 loss per day
  circuit_breaker: {
    enabled: true,
    max_consecutive_losses: 3,
    pause_duration_minutes: 60,
  },
};
```

## 🔧 Configuration Reference

### Exchange Configuration

#### Hyperliquid

```typescript
interface HyperliquidConfig {
  walletAddress: string; // Your wallet address
  privateKey: string; // Private key (keep secure!)
  testnet?: boolean; // Use testnet (default: true)
  enableWs?: boolean; // Enable WebSocket (default: true)
  maxReconnectAttempts?: number; // Max reconnection attempts
}
```

### Strategy Configurations

#### Base Strategy Config

```typescript
interface StrategyConfig {
  symbol: string; // Trading pair (e.g., "BTC", "ETH")
  investmentAmount: number; // Total capital to allocate (USD)
  maxPosition: number; // Maximum position size
  stopLoss?: number; // Stop loss percentage
  takeProfit?: number; // Take profit percentage
  metadata?: any; // Strategy-specific configuration
}
```

## 📊 Events & Monitoring

The bot emits comprehensive events for monitoring:

```typescript
// Lifecycle events
bot.on("initialized", () => console.log("Bot initialized"));
bot.on("started", () => console.log("Bot started"));
bot.on("stopped", () => console.log("Bot stopped"));

// Trading events
bot.on("orderPlaced", (order) => {
  console.log(
    `📝 Order placed: ${order.side} ${order.size} at $${order.price}`
  );
});

bot.on("orderFilled", (fill) => {
  console.log(`✅ Order filled: ${fill.side} ${fill.size} at $${fill.price}`);
});

bot.on("orderCancelled", (order) => {
  console.log(`❌ Order cancelled: ${order.id}`);
});

// Strategy-specific events
bot.on("gridRebalanced", (newBasePrice) => {
  console.log(`🔲 Grid rebalanced around $${newBasePrice}`);
});

bot.on("dcaOrderExecuted", (order) => {
  console.log(`📈 DCA order executed: ${order.size} at $${order.price}`);
});

bot.on("portfolioRebalanced", (allocations) => {
  console.log(`🔄 Portfolio rebalanced:`, allocations);
});

// Risk management events
bot.on("positionLimitWarning", (position) => {
  console.log(`⚠️ Position limit warning: ${position}`);
});

bot.on("stopLossTriggered", (details) => {
  console.log(`🛑 Stop loss triggered:`, details);
});

bot.on("takeProfitTriggered", (details) => {
  console.log(`🎯 Take profit triggered:`, details);
});

// Error handling
bot.on("error", (error) => {
  console.error("❌ Bot error:", error);
});
```

## 📈 Statistics & Analytics

Get real-time performance metrics:

```typescript
const stats = bot.getStatistics();
console.log({
  // Trading metrics
  totalTrades: stats.totalTrades,
  winRate: stats.winRate,
  avgProfit: stats.avgProfit,

  // Position info
  currentPosition: stats.currentPosition,
  totalPosition: stats.totalPosition,

  // Volume metrics
  totalVolume: stats.volume.totalVolume,
  totalVolumeUSD: stats.volume.totalVolumeUSD,

  // P&L
  realizedPnL: stats.realizedPnL,
  unrealizedPnL: stats.unrealizedPnL,
  totalPnL: stats.totalPnL,
});
```

## 🔌 Supported Exchanges

| Exchange        | Status      | Grid | DCA | Martingale | Portfolio | Notes                  |
| --------------- | ----------- | ---- | --- | ---------- | --------- | ---------------------- |
| **Hyperliquid** | ✅ Complete | ✅   | ✅  | ✅         | ✅        | Full WebSocket support |
| **Binance**     | 🚧 Planned  | -    | -   | -          | -         | Coming soon            |
| **ByBit**       | 🚧 Planned  | -    | -   | -          | -         | Coming soon            |
| **dYdX**        | 🚧 Planned  | -    | -   | -          | -         | Coming soon            |

## 🛠️ Development

### Adding New Strategies

1. **Create Strategy Class**:

```typescript
// core/strategies/MyStrategy.ts
export class MyStrategy extends BaseTradingStrategy {
  async initialize(): Promise<void> {
    // Initialize strategy
  }

  async start(): Promise<void> {
    // Start trading logic
  }

  async handleOrderFill(fill: OrderFill): Promise<void> {
    // Handle order fills
  }
}
```

2. **Register in Factory**:

```typescript
// core/strategies/StrategyFactory.ts
case "mystrategy":
  return new MyStrategy(exchange, config, botId, userId);
```

3. **Add to Types**:

```typescript
export type BotType = "grid" | "dca" | "martingale" | "mystrategy";
```

### Adding New Exchanges

1. **Implement IExchange**:

```typescript
export class NewExchange implements IExchange {
  async connect(): Promise<void> {
    /* ... */
  }
  async placeOrder(request: OrderRequest): Promise<OrderResponse> {
    /* ... */
  }
  // ... implement all methods
}
```

2. **Add to Factory**:

```typescript
case "newexchange":
  return new NewExchange(config);
```

## 📦 Package Structure

```
nimbus/
├── core/                     # Core bot logic
│   ├── TradingBot.ts        # Main bot engine
│   ├── strategies/          # Strategy implementations
│   │   ├── ITradingStrategy.ts    # Strategy interface
│   │   ├── StrategyFactory.ts     # Strategy factory
│   │   ├── GridStrategy.ts        # Grid trading
│   │   ├── DCAStrategy.ts         # Dollar cost averaging
│   │   ├── MartingaleStrategy.ts  # Martingale strategy
│   │   └── PortfolioStrategy.ts   # Portfolio rebalancing
│   ├── types/               # Type definitions
│   └── services/            # Utility services
├── exchanges/               # Exchange implementations
│   └── HyperliquidExchange.ts    # Hyperliquid integration
├── interfaces/              # Interface definitions
│   └── IExchange.ts        # Exchange interface
├── factories/              # Factory patterns
│   └── ExchangeFactory.ts  # Exchange factory
├── examples/               # Usage examples
├── cli/                    # CLI interface
└── README.md              # This file
```

## 🧪 Testing

```bash
# Run type checks
pnpm run type-check

# Build the package
pnpm run build

# Clean build artifacts
pnpm run clean
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## ⚠️ Risk Disclaimer

**Trading cryptocurrencies involves substantial risk and may not be suitable for all investors.**

- Past performance does not guarantee future results
- You may lose some or all of your investment
- Only trade with funds you can afford to lose
- Always test strategies on testnet first
- Consider your risk tolerance and investment objectives

**This software is provided for educational and research purposes. Use at your own risk.**

## 🆘 Support

- 📖 Documentation: See `/examples` folder
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/hyperliquid-bot/issues)
- 💬 Discord: [Join our community](https://discord.gg/your-server)
- 📧 Email: support@hyperliquid-bot.com

---

Built with ❤️ by the Nimbus team
