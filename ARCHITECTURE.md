# Nimbus Architecture

This document provides detailed architectural diagrams and explanations of the Nimbus trading system.

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Nimbus Trading System                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │    CLI      │    │  Examples   │    │   Library   │    │   Docs      │   │
│  │ Interface   │    │   & Demos   │    │   Package   │    │ & Guides    │   │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘   │
│         │                   │                   │                   │       │
│  ┌──────────────────────────────────────────────────────────────────────────┤  │
│  │                         Core Bot Engine                                  │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────┐   │  │
│  │  │ TradingBot  │    │ Strategies  │    │      Risk Management        │   │  │
│  │  │   Engine    │◄──►│   System    │◄──►│         Layer               │   │  │
│  │  └─────────────┘    └─────────────┘    └─────────────────────────────┘   │  │
│  │         │                  │                          │                  │  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────┐   │  │
│  │  │  Exchange   │    │  Strategy   │    │     Event-Driven            │   │  │
│  │  │  Interface  │    │  Factory    │    │     Architecture            │   │  │
│  │  └─────────────┘    └─────────────┘    └─────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────────┤  │
│                                   │                                          │
│  ┌───────────────────────────────────────────────────────────────────────────┤  │
│  │                     Exchange Implementations                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │  │
│  │  │ Hyperliquid │  │   Binance   │  │    ByBit     │  │     Future      │  │  │
│  │  │ (Complete)  │  │  (Planned)  │  │  (Planned)   │  │   Exchanges     │  │  │
│  │  │             │  │             │  │              │  │                 │  │  │
│  │  │ • WebSocket │  │ • REST API  │  │ • WebSocket  │  │ • Custom APIs   │  │  │
│  │  │ • REST API  │  │ • WebSocket │  │ • REST API   │  │ • DEX Support   │  │  │
│  │  │ • Testnet   │  │ • Futures   │  │ • Derivatives│  │ • Multi-chain   │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────────┤  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🎯 Strategy Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        Strategy System Architecture                        │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     ITradingStrategy Interface                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │  • initialize()    • start()        • stop()                │    │   │
│  │  │  • handleOrderFill() • handlePriceUpdate()                  │    │   │
│  │  │  • getState()      • updateConfig()  • getStatistics()      │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                      │
│                            ┌────────┴────────┐                             │
│                            │ StrategyFactory │                             │
│                            │    (Router)     │                             │
│                            └────────┬────────┘                             │
│                                     │                                      │
│    ┌──────────────┬─────────────────┼─────────────────┬──────────────┐     │
│    │              │                 │                 │              │     │
│ ┌──▼───┐    ┌─────▼─────┐    ┌──────▼─────┐    ┌─────▼─────┐    ┌────▼───┐ │
│ │ Grid │    │    DCA    │    │ Martingale │    │ Portfolio │    │ Future │ │
│ │ Bot  │    │   Bot     │    │    Bot     │    │    Bot    │    │ Bots   │ │
│ └──────┘    └───────────┘    └────────────┘    └───────────┘    └────────┘ │
│    │              │                 │                 │              │     │
│ ┌──▼───────────────▼─────────────────▼─────────────────▼──────────────▼──┐ │
│ │                    BaseTradingStrategy                                 │ │
│ │  • Common event handling    • Risk management integration              │ │
│ │  • Statistics tracking      • Error handling & recovery                │ │
│ │  • Configuration validation • Graceful shutdown                        │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Grid Strategy Flow

```
Grid Trading Strategy - Order Placement & Management
═══════════════════════════════════════════════════

Current Price: $2400 (ETH)
Grid Spacing: 0.5% (±$12)
Active Levels: 3 per side

      Price Level          Order Type       Status
    ┌─────────────────────────────────────────────────┐
    │ $2436 (+1.5%)  │    SELL #3     │   📝 Active   │
    │ $2424 (+1.0%)  │    SELL #2     │   📝 Active    │
    │ $2412 (+0.5%)  │    SELL #1     │   📝 Active  │
    ├─────────────────────────────────────────────────┤
    │ $2400 (0.0%)   │ ◄ CURRENT PRICE ► │   🎯 Base  │
    ├─────────────────────────────────────────────────┤
    │ $2388 (-0.5%)  │    BUY #1      │   📝 Active  │
    │ $2376 (-1.0%)  │    BUY #2      │   📝 Active  │
    │ $2364 (-1.5%)  │    BUY #3      │   📝 Active  │
    └─────────────────────────────────────────────────┘

Trading Flow:
1. Price drops to $2388 → BUY order fills → Place new SELL at $2400
2. Price rises to $2412 → SELL order fills → Place new BUY at $2400
3. Repeat for all grid levels → Profit from volatility

Grid Rebalancing:
• If price moves >3 levels → Recalculate grid around new price
• Cancel all orders → Calculate new levels → Place fresh orders
• Maintains optimal spread around current market price
```

## 📈 DCA Strategy Timeline

```
Dollar Cost Averaging - Time-Based Accumulation
══════════════════════════════════════════════

Timeline: 30 Days | Order Size: $50 | Interval: 24 hours

Day  1  │ $50 @ $40,000 → 0.00125 BTC │ Total: $50    | Avg: $40,000
Day  2  │ $50 @ $41,000 → 0.00122 BTC │ Total: $100   | Avg: $40,500
Day  3  │ $50 @ $38,000 → 0.00132 BTC │ Total: $150   | Avg: $39,667
...     │                              │               │
Day 30  │ $50 @ $45,000 → 0.00111 BTC │ Total: $1,500 | Avg: $42,333

Benefits:
✓ Reduces impact of volatility
✓ Removes emotion from buying decisions
✓ Builds position regardless of market direction
✓ Lower average cost than lump sum (in volatile markets)

Risk Management:
• Stop-loss based on average cost (not current price)
• Position size limits prevent overexposure
• Maximum order limits control total investment
```

## 🔄 Portfolio Rebalancing Logic

```
Portfolio Rebalancing - Multi-Asset Management
════════════════════════════════════════════

Target Allocation: BTC(40%) | ETH(30%) | SOL(20%) | MATIC(10%)
Portfolio Value: $10,000
Rebalance Threshold: 5%

Current State:
┌─────────┬─────────────┬─────────────┬──────────┬─────────────┐
│ Asset   │   Target    │   Current   │   Drift  │   Action    │
├─────────┼─────────────┼─────────────┼──────────┼─────────────┤
│ BTC     │ 40% ($4000) │ 45% ($4500) │   +5%    │ SELL $500   │
│ ETH     │ 30% ($3000) │ 28% ($2800) │   -2%    │ BUY $200    │
│ SOL     │ 20% ($2000) │ 18% ($1800) │   -2%    │ BUY $200    │
│ MATIC   │ 10% ($1000) │  9% ($900)  │   -1%    │ BUY $100    │
└─────────┴─────────────┴─────────────┴──────────┴─────────────┘

Rebalancing Trigger: BTC drift (+5%) ≥ threshold (5%)

Execution Flow:
1. 🔍 Calculate current allocations
2. 📊 Identify assets outside threshold
3. 📉 Sell overweight assets (BTC: -$500)
4. 📈 Buy underweight assets (ETH: +$200, SOL: +$200, MATIC: +$100)
5. ✅ Verify new allocations match targets
```

## 🔌 Exchange Interface Architecture

```
Exchange Abstraction Layer
═════════════════════════

┌─────────────────────────────────────────────────────────────────────┐
│                         IExchange Interface                         │
├─────────────────────────────────────────────────────────────────────┤
│  Connection Management:                                             │
│  • connect() / disconnect()                                         │
│  • isConnected() / getConnectionStatus()                            │
│                                                                     │
│  Order Management:                                                  │
│  • placeOrder(request) → OrderResponse                              │
│  • cancelOrder(request) → CancelResponse                            │
│  • getOpenOrders() → OpenOrder[]                                    │
│                                                                     │
│  Market Data:                                                       │
│  • subscribePriceUpdates(symbol, callback)                          │
│  • getMarkPrice(symbol) → number                                    │
│  • subscribeOrderFills(callback)                                    │
│                                                                     │
│  Account Data:                                                      │
│  • getBalances() → Balance[]                                        │
│  • getPositions() → Position[]                                      │
│  • getAccountInfo() → AccountInfo                                   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌──────▼─────┐ ┌──────▼─────────┐
        │ Hyperliquid  │ │  Binance   │ │   Future       │
        │  Exchange    │ │  Exchange  │ │  Exchanges     │
        │              │ │ (Planned)  │ │  (Planned)     │
        │ ✓ WebSocket  │ │            │ │                │
        │ ✓ REST API   │ │ • Spot     │ │ • DEX Support  │
        │ ✓ Testnet    │ │ • Futures  │ │ • Multi-chain  │
        │ ✓ Real-time  │ │ • Options  │ │ • Cross-chain  │
        └──────────────┘ └────────────┘ └────────────────┘
```

## 🔄 Event-Driven Architecture

```
Event Flow & State Management
═══════════════════════════

┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│    Exchange     │ Events  │   TradingBot     │ Events  │   Strategy      │
│    Events       │────────►│     Engine       │────────►│ Implementation  │
│                 │         │                  │         │                 │
│ • Price Updates │         │ • Event Router   │         │ • Grid Logic    │
│ • Order Fills   │         │ • State Manager  │         │ • DCA Logic     │
│ • Connections   │         │ • Error Handler  │         │ • Portfolio     │
│ • Errors        │         │ • Statistics     │         │ • Martingale    │
└─────────────────┘         └──────────────────┘         └─────────────────┘
         │                           │                           │
         │                           │                           │
    ┌────▼─────┐                ┌────▼─────┐                ┌────▼─────┐
    │  Market  │                │   Risk   │                │  Order   │
    │  Data    │                │   Mgmt   │                │ Manager  │
    │ Updates  │                │ Monitor  │                │          │
    └──────────┘                └──────────┘                └──────────┘
         │                           │                           │
         └─────────────┬─────────────┴─────────────┬─────────────┘
                       │                           │
                  ┌────▼─────┐                ┌────▼─────┐
                  │   User   │                │  External│
                  │Interface │                │  Systems │
                  │ (CLI)    │                │(Webhooks)│
                  └──────────┘                └──────────┘

Event Types:
├─ Trading Events
│  ├─ orderPlaced
│  ├─ orderFilled
│  ├─ orderCancelled
│  └─ positionUpdate
├─ Strategy Events
│  ├─ gridRebalanced
│  ├─ dcaOrderExecuted
│  ├─ portfolioRebalanced
│  └─ martingaleTriggered
├─ Risk Events
│  ├─ stopLossTriggered
│  ├─ takeProfitTriggered
│  ├─ positionLimitWarning
│  └─ circuitBreakerActivated
└─ System Events
   ├─ connected/disconnected
   ├─ initialized/started/stopped
   └─ error/warning/info
```

## 🛡️ Risk Management Layer

```
Multi-Level Risk Management
══════════════════════════

┌────────────────────────────────────────────────────────────────────┐
│                         Risk Management Hierarchy                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ Level 1: Position-Level Risk                                       │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ • Stop Loss: Individual position protection                  │   │
│ │ • Take Profit: Lock in gains                                 │   │
│ │ • Position Size Limits: Prevent overexposure                 │   │
│ │ • Maximum Position Age: Force position review                │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                │                                   │
│ Level 2: Strategy-Level Risk                                       │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ • Daily Loss Limits: Stop trading if daily loss exceeded     │   │
│ │ • Maximum Drawdown: Pause strategy if drawdown too high      │   │
│ │ • Consecutive Loss Limits: Circuit breaker activation        │   │
│ │ • Order Rate Limits: Prevent spam/fat finger errors          │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                │                                   │
│ Level 3: Portfolio-Level Risk                                      │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ • Total Portfolio Exposure: Limit overall risk               │   │
│ │ • Correlation Limits: Prevent concentrated exposure          │   │
│ │ • Leverage Limits: Control amplification of risk             │   │
│ │ • Asset Allocation Limits: Maintain diversification          │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                │                                   │
│ Level 4: System-Level Risk                                         │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ • API Rate Limiting: Respect exchange limits                 │   │
│ │ • Connection Monitoring: Handle disconnections gracefully    │   │
│ │ • Order Validation: Prevent invalid orders                   │   │
│ │ • Emergency Shutdown: Immediate stop for critical issues     │   │
│ └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘

Risk Escalation Flow:
Warning → Throttle → Pause → Stop → Emergency Shutdown
```

## 🚀 Deployment Architecture

```
Production Deployment Options
═══════════════════════════

Option 1: Single Instance (Simple)
┌──────────────────────────────────────┐
│           Server Instance            │
│ ┌──────────────────────────────────┐ │
│ │         Nimbus CLI               │ │
│ │ ┌─────────────┬─────────────────┐│ │
│ │ │ Bot 1 (Grid)│ Bot 2 (DCA)     ││ │
│ │ │ ETH/USD     │ BTC/USD         ││ │
│ │ └─────────────┴─────────────────┘│ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │         Monitoring               │ │
│ │ • File Logs  • Console Output    │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘

Option 2: Microservice (Scalable)
┌─────────────────────────────────────────────────────────────┐
│                   Load Balancer                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼───┐    ┌────▼────┐    ┌───▼───┐
│Bot 1  │    │ Bot 2   │    │Bot 3  │
│(Grid) │    │ (DCA)   │    │(Port) │
│ETH    │    │ BTC     │    │Multi  │
└───────┘    └─────────┘    └───────┘
    │             │             │
┌───▼─────────────▼─────────────▼───┐
│         Shared Services           │
│ • Database  • Redis  • Monitoring│
└───────────────────────────────────┘

Option 3: Cloud Native (Enterprise)
┌──────────────────────────────────────────────────────┐
│                 Kubernetes Cluster                   │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐  │
│ │ Bot Pod 1   │ │ Bot Pod 2   │ │ Monitoring Pod  │  │
│ │ (Grid ETH)  │ │ (DCA BTC)   │ │ • Prometheus    │  │
│ │             │ │             │ │ • Grafana       │  │
│ └─────────────┘ └─────────────┘ │ • AlertManager  │  │
│ ┌─────────────┐ ┌─────────────┐ └─────────────────┘  │
│ │ Bot Pod 3   │ │ Config Pod  │ ┌─────────────────┐  │
│ │(Portfolio)  │ │ • API       │ │ Storage         │  │
│ │             │ │ • Dashboard │ │ • PostgreSQL    │  │
│ └─────────────┘ └─────────────┘ │ • Redis Cache   │  │
│                                 └─────────────────┘  │
└──────────────────────────────────────────────────────┘
```

This architecture ensures the Nimbus system is:

- **Modular**: Easy to extend with new strategies and exchanges
- **Scalable**: Can handle multiple bots and high-frequency trading
- **Reliable**: Comprehensive error handling and recovery mechanisms
- **Secure**: Multi-level risk management and validation
- **Observable**: Detailed logging, metrics, and monitoring capabilities
