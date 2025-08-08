# Examples

This folder contains complete, runnable examples for different trading strategies and use cases.

## 🚀 Quick Start

1. **Install dependencies**:

   ```bash
   cd packages/hyper-bot
   pnpm install
   ```

2. **Set up environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Run an example**:
   ```bash
   pnpm tsx examples/01-basic-grid-bot.ts
   ```

## 📁 Available Examples

| File                      | Strategy   | Difficulty   | Description                 |
| ------------------------- | ---------- | ------------ | --------------------------- |
| `01-basic-grid-bot.ts`    | Grid       | Beginner     | Simple grid trading setup   |
| `02-advanced-grid-bot.ts` | Grid       | Intermediate | Grid with advanced settings |
| `03-dca-bot.ts`           | DCA        | Beginner     | Dollar cost averaging       |
| `04-martingale-bot.ts`    | Martingale | Advanced     | Martingale strategy (risky) |
| `05-portfolio-bot.ts`     | Portfolio  | Intermediate | Portfolio rebalancing       |
| `06-multi-strategy.ts`    | Mixed      | Advanced     | Running multiple strategies |
| `07-custom-strategy.ts`   | Custom     | Expert       | Creating custom strategies  |
| `08-backtesting.ts`       | Analysis   | Intermediate | Backtesting strategies      |
| `09-monitoring.ts`        | Tools      | Beginner     | Monitoring and alerts       |
| `10-production-setup.ts`  | Production | Expert       | Production deployment       |

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
pnpm tsx examples/01-basic-grid-bot.ts
```

### Production Mode

```bash
pnpm build
node dist/examples/01-basic-grid-bot.js
```

### With Custom Config

```bash
CONFIG_FILE=./config/my-config.json pnpm tsx examples/01-basic-grid-bot.ts
```

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

## 🆘 Need Help?

- Check the main README for detailed documentation
- Join our Discord community
- Open an issue on GitHub
