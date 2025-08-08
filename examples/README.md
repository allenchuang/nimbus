# Examples

This folder contains complete, runnable examples for different trading strategies organized by strategy type.

## 🚀 Quick Start

1. **Install dependencies**:

   ```bash
   cd nimbus
   pnpm install
   ```

2. **Set up environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Run an example**:
   ```bash
   pnpm tsx examples/grid/basic-grid-bot.ts
   ```

## �� Available Examples

| File                            | Strategy   | Difficulty   | Description                          |
| ------------------------------- | ---------- | ------------ | ------------------------------------ |
| `/grid/basic-grid-bot.ts`       | Grid       | Beginner     | Simple grid trading setup            |
| `/grid/advanced-grid-bot.ts`    | Grid       | Intermediate | Advanced grid with geometric spacing |
| `/dca/dca-bot.ts`               | DCA        | Beginner     | Dollar cost averaging                |
| `/martingale/martingale-bot.ts` | Martingale | Advanced     | Martingale strategy (HIGH RISK)      |
| `/portfolio/portfolio-bot.ts`   | Portfolio  | Intermediate | Portfolio rebalancing                |
| `/mixed/multi-strategy.ts`      | Mixed      | Advanced     | Running multiple strategies          |
| `/custom/custom-strategy.ts`    | Custom     | Expert       | Creating custom strategies           |

## ⚙️ Configuration

### Environment Variables

```bash
# Hyperliquid Configuration
HYPERLIQUID_WALLET_ADDRESS=0x...
HYPERLIQUID_PRIVATE_KEY=0x...
HYPERLIQUID_TESTNET=true

# Optional: Monitoring
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

### Example Configuration Files

- `config/grid-config.json` - Grid strategy configs
- `config/dca-config.json` - DCA strategy configs
- `config/portfolio-config.json` - Portfolio strategy configs
- `config/risk-management.json` - Risk management settings

## 🔧 Running Examples

### Development Mode

```bash
# Grid strategies
pnpm tsx examples/grid/basic-grid-bot.ts
pnpm tsx examples/grid/advanced-grid-bot.ts

# DCA strategies
pnpm tsx examples/dca/dca-bot.ts

# Martingale strategies (⚠️ HIGH RISK)
pnpm tsx examples/martingale/martingale-bot.ts

# Portfolio strategies
pnpm tsx examples/portfolio/portfolio-bot.ts

# Multi-strategy
pnpm tsx examples/mixed/multi-strategy.ts

# Custom strategies
pnpm tsx examples/custom/custom-strategy.ts
```

### Production Mode

```bash
pnpm build
node dist/examples/grid/basic-grid-bot.js
```

### With Custom Config

```bash
CONFIG_FILE=./config/my-config.json pnpm tsx examples/grid/basic-grid-bot.ts
```

## 📊 Strategy Overview

### 🔲 Grid Trading

- **Best for**: Ranging/sideways markets
- **Risk**: Low to Medium
- **Complexity**: Beginner to Intermediate
- **Profit mechanism**: Buying low, selling high in ranges

### 📈 Dollar Cost Averaging (DCA)

- **Best for**: Long-term accumulation
- **Risk**: Low to Medium
- **Complexity**: Beginner
- **Profit mechanism**: Time-based averaging into positions

### 🎲 Martingale ⚠️

- **Best for**: Experienced traders only
- **Risk**: VERY HIGH
- **Complexity**: Advanced
- **Profit mechanism**: Doubling down on losses
- **Warning**: Can lose entire investment quickly

### 🔄 Portfolio Management

- **Best for**: Diversified exposure
- **Risk**: Medium
- **Complexity**: Intermediate
- **Profit mechanism**: Rebalancing allocations

### 🚀 Multi-Strategy

- **Best for**: Risk diversification
- **Risk**: Varies by strategy mix
- **Complexity**: Advanced
- **Profit mechanism**: Multiple approaches combined

### 🎨 Custom Strategies

- **Best for**: Experienced developers
- **Risk**: Depends on implementation
- **Complexity**: Expert
- **Profit mechanism**: User-defined logic

## 📊 Monitoring Examples

All examples include:

- Real-time console logging
- Performance metrics
- Error handling
- Graceful shutdown

## ⚠️ Safety Notes

1. **Always use testnet first**
2. **Start with small amounts**
3. **Monitor your bots closely**
4. **Have stop-loss configured**
5. **Keep private keys secure**
6. **Understand the risks of each strategy**

### Strategy-Specific Warnings

- **Martingale**: Can lose your entire investment quickly
- **Grid**: Performance depends on market conditions
- **DCA**: Best in long-term trending markets
- **Portfolio**: Requires multiple assets and capital
- **Custom**: Test thoroughly before deploying

## 🆘 Need Help?

- Check the main README for detailed documentation
- Join our Discord community
- Open an issue on GitHub
- Review strategy-specific documentation in each folder

## 📚 Learning Path

1. **Start**: Basic Grid Bot (`/grid/basic-grid-bot.ts`)
2. **Learn**: DCA Bot (`/dca/dca-bot.ts`)
3. **Advance**: Advanced Grid (`/grid/advanced-grid-bot.ts`)
4. **Diversify**: Portfolio Bot (`/portfolio/portfolio-bot.ts`)
5. **Scale**: Multi-Strategy (`/mixed/multi-strategy.ts`)
6. **Create**: Custom Strategy (`/custom/custom-strategy.ts`)
7. **⚠️ Avoid until experienced**: Martingale (`/martingale/martingale-bot.ts`)
