# HyperBot Quick Start Guide

Get your trading bot up and running in under 5 minutes! 🚀

## 📋 Prerequisites

- **Node.js** v18+ and **pnpm** installed
- **Hyperliquid account** with testnet access
- **Wallet** with some testnet funds

## 🚀 Installation

```bash
# Install the package
pnpm add @hyperliquid-bot/hyper-bot

# Or clone the repo and navigate to the package
cd packages/hyper-bot
pnpm install
```

## 🔐 Environment Setup

### Step 1: Create Environment File

Create a `.env` file in your project root with your Hyperliquid credentials:

```bash
# Create .env file
touch .env
```

### Step 2: Add Required Variables

Add the following to your `.env` file:

```bash
# =============================================================================
# HYPERLIQUID CREDENTIALS (REQUIRED)
# =============================================================================
HYPERLIQUID_WALLET_ADDRESS=0x1234567890123456789012345678901234567890
HYPERLIQUID_PRIVATE_KEY=0x1234567890123456789012345678901234567890123456789012345678901234
```

That's it! All other settings (testnet, investment amounts, etc.) are configured in your bot code.

### Step 3: Get Your Credentials

#### **Wallet Address:**

1. Open MetaMask (or your wallet)
2. Copy your wallet address (starts with `0x`)
3. Paste into `HYPERLIQUID_WALLET_ADDRESS`

#### **Private Key:**

1. In MetaMask: Account menu → Account details → Export private key
2. Enter your password
3. Copy the private key (64 characters after `0x`)
4. Paste into `HYPERLIQUID_PRIVATE_KEY`

#### **Testnet Setup:**

1. Go to [Hyperliquid Testnet](https://app.hyperliquid-testnet.xyz)
2. Connect your wallet
3. Get testnet funds from faucet
4. Keep `HYPERLIQUID_TESTNET=true` for testing

### Step 4: Security Checklist

✅ **Before proceeding:**

- [ ] Private key is 64 characters (plus `0x`)
- [ ] `.env` file is in `.gitignore`
- [ ] Never shared private key with anyone
- [ ] Have testnet funds in wallet

⚠️ **CRITICAL SECURITY NOTES:**

- **NEVER** commit your `.env` file to git
- **ALWAYS** start with testnet
- **SECURE** your private key like cash
- **ROTATE** keys regularly

## 🎯 Option 1: Interactive CLI (Recommended)

The easiest way to get started:

```bash
# Start the interactive CLI
pnpm run cli

# Follow the prompts to:
# 1. Configure exchange connection
# 2. Select trading strategy
# 3. Set risk management
# 4. Start the bot
```

### CLI Features:

- 🎯 **Guided Setup** - Step-by-step configuration
- 💾 **Save/Load Configs** - Reuse configurations
- 🔍 **Validation** - Checks your settings before starting
- 📊 **Live Monitoring** - Real-time performance display

## 🎯 Option 2: Run Examples

Try pre-built examples for different strategies:

### Grid Trading Bot

```bash
pnpm run example:grid
```

Perfect for sideways markets - profits from price volatility by placing buy/sell orders at regular intervals.

### DCA (Dollar Cost Averaging) Bot

```bash
pnpm run example:dca
```

Great for long-term accumulation - buys assets at regular intervals regardless of price.

### Portfolio Rebalancing Bot

```bash
pnpm run example:portfolio
```

Maintains target allocations across multiple assets - automatically rebalances when drift exceeds thresholds.

## 🎯 Option 3: Programmatic Usage

For developers who want full control:

```typescript
import {
  TradingBot,
  ExchangeFactory,
  BotType,
} from "@hyperliquid-bot/hyper-bot";

// 1. Create exchange connection
const exchange = ExchangeFactory.create("hyperliquid", {
  walletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS!,
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY!,
  testnet: true,
});

// 2. Configure bot
const config = {
  botType: "grid" as BotType,
  symbol: "ETH",
  investmentAmount: 100,
  maxPosition: 0.1,
  stopLoss: 5,
  takeProfit: 10,
  metadata: {
    gridSpacing: 0.5,
    gridQuantity: 10,
    activeLevels: 2,
  },
};

// 3. Create and start bot
const bot = new TradingBot(exchange, config);
await bot.initialize();
await bot.start();

console.log("🤖 Bot is running!");
```

## 📊 Strategy Quick Reference

| Strategy       | Best For               | Risk Level | Setup Complexity |
| -------------- | ---------------------- | ---------- | ---------------- |
| **Grid**       | Sideways markets       | Medium     | ⭐⭐             |
| **DCA**        | Long-term accumulation | Low        | ⭐               |
| **Martingale** | Mean-reverting markets | High ⚠️    | ⭐⭐⭐           |
| **Portfolio**  | Diversification        | Medium     | ⭐⭐⭐           |

## 🛡️ Safety First

### Always Start with Testnet

```bash
HYPERLIQUID_TESTNET=true
```

### Use Stop Losses

```javascript
stopLoss: 5, // 5% stop loss
takeProfit: 10, // 10% take profit
```

### Start Small

```javascript
investmentAmount: 100, // Start with $100
maxPosition: 0.1, // Limit position size
```

## 📊 Monitoring Your Bot

### Console Output

All examples include real-time logging:

```
✅ Order filled: sell 0.05 ETH at $2,400
🔲 Grid rebalanced around $2,395
📊 Stats: 5 trades | $12.50 P&L
```

### Event Listeners

```typescript
bot.on("orderFilled", (fill) => {
  console.log(`Trade: ${fill.side} ${fill.size} at $${fill.price}`);
});

bot.on("error", (error) => {
  console.error("Bot error:", error);
});
```

### Statistics

```typescript
const stats = bot.getStatistics();
console.log({
  trades: stats.totalTrades,
  pnl: stats.totalPnL,
  position: stats.currentPosition,
});
```

## 🔧 Common Issues & Solutions

### Connection Issues

```
❌ Error: WebSocket connection failed
```

**Solution**: Check your internet connection and set `enableWs: false` to use REST API.

### Invalid Orders

```
❌ Error: Order size too small
```

**Solution**: Increase your `investmentAmount` or check exchange minimum order sizes.

### Authentication Failed

```
❌ Error: Invalid signature
```

**Solution**: Verify your wallet address and private key are correct.

## 📈 Next Steps

### 1. Optimize Your Strategy

- Adjust grid spacing based on asset volatility
- Fine-tune position sizes for your risk tolerance
- Experiment with different time intervals for DCA

### 2. Monitor Performance

- Track P&L over time
- Analyze which strategies work best
- Adjust parameters based on market conditions

### 3. Scale Up

- Once comfortable, move to mainnet
- Increase position sizes gradually
- Consider running multiple strategies

### 4. Advanced Features

- Set up webhook notifications
- Implement custom risk management
- Create your own trading strategies

## 🆘 Getting Help

- 📖 **Documentation**: See the main README for detailed docs
- 💬 **Examples**: Check the `examples/` folder for more use cases
- 🐛 **Issues**: Report bugs on GitHub
- 💡 **Ideas**: Join our Discord community

## ⚠️ Risk Disclaimer

- **Always use testnet first**
- **Start with small amounts**
- **Never risk more than you can afford to lose**
- **Crypto trading is highly risky**
- **Past performance doesn't guarantee future results**

---

**Ready to start?** Run `pnpm run cli` and let the interactive guide walk you through your first bot setup! 🤖✨
