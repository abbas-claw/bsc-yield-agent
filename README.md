# BSC Yield Agent 🤖

An autonomous AI agent that maximizes yield on BNB Smart Chain by intelligently allocating funds across Venus Protocol and Aave V3.

![BSC Yield Agent](https://img.shields.io/badge/BSC-Yield%20Agent-yellow?style=for-the-badge&logo=binance)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript)
![ethers.js](https://img.shields.io/badge/ethers.js-3C3C3D?style=for-the-badge&logo=ethereum)

## Features

### 🎯 Yield Optimization
- **Real-time rate comparison** across Venus + Aave
- **AI-powered strategies** that find the best opportunities
- **Auto-rebalancing** when better rates appear
- **Health factor monitoring** to avoid liquidations

### 🔒 Safety First
- Configurable max LTV limits
- Health factor alerts
- Gas price limits
- Emergency withdrawal threshold
- Slippage protection

### 💼 Supported Assets
| Token | Type | Venus | Aave V3 |
|-------|------|-------|---------|
| BNB | Major | ✅ | ✅ |
| ETH | Major | ✅ | ✅ |
| BTCB | Major | ✅ | ✅ |
| USDT | Stable | ✅ | ✅ |
| USDC | Stable | ✅ | ✅ |
| FDUSD | Stable | ✅ | ✅ |

### 🤖 Autonomous Agent
- Runs periodic checks (every 5 minutes)
- Identifies yield opportunities
- Can auto-execute safe strategies
- Tracks all actions with reasoning

## Quick Start

### Prerequisites
- Node.js 18+
- BSC wallet with funds

### Installation

```bash
# Clone and install
git clone <repo>
cd bsc-yield-agent
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start development
npm run dev
```

### Configuration

```env
# BSC RPC URL (optional - uses public nodes by default)
BSC_RPC_URL=https://bsc-dataseed1.binance.org

# Private key for autonomous execution (KEEP SECURE!)
PRIVATE_KEY=0x...
```

## Usage

### Web Dashboard

Visit `http://localhost:3000` for the full dashboard:

1. **Rates Tab** — Live APY comparison
2. **Portfolio Tab** — View your positions
3. **Strategies Tab** — AI recommendations
4. **Agent Tab** — Control autonomous mode

### API

```bash
# Get current rates
curl http://localhost:3000/api/rates

# Get portfolio
curl "http://localhost:3000/api/positions?address=0x..."

# Get strategy recommendations
curl "http://localhost:3000/api/strategy?address=0x..."

# Execute transaction
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "protocol": "venus",
    "action": "supply",
    "token": "USDT",
    "amount": "100"
  }'

# Control agent
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

## Strategy Engine

The agent automatically generates recommendations based on:

### Best Yield Strategy
Finds the highest APY across all tokens and protocols.

### Stable Yield Strategy
Focuses on stablecoins for low-risk yield.

### Rate Arbitrage Strategy
Identifies opportunities to supply at high rates and borrow at low rates.

### Rebalance Strategy
Suggests moving funds when better rates appear elsewhere.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐
│   Web Dashboard │────▶│  Next.js Server  │
└─────────────────┘     └────────┬─────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
  │   Strategy  │         │    Venus    │         │   Aave V3   │
  │    Engine   │◄───────▶│  Protocol   │◄───────▶│  Protocol   │
  └──────┬──────┘         └─────────────┘         └─────────────┘
         │
         ▼
  ┌─────────────┐
  │   Executor  │◄─────── Wallet (optional)
  └─────────────┘
```

### Key Components

- **Rate Fetcher** — Pulls live APY data from both protocols
- **Strategy Engine** — Analyzes data and generates recommendations
- **Executor** — Handles transaction signing and submission
- **Monitor** — Periodic health checks and auto-execution

## Safety

### Health Factor Monitoring
The agent continuously monitors your health factor:
- **> 2.0**: Healthy 🟢
- **1.5 - 2.0**: Moderate 🟡
- **< 1.5**: Warning 🔴
- **< 1.1**: Emergency ⚠️

### Risk Controls
- `maxLTV`: Maximum loan-to-value (default: 65%)
- `minHealthFactor`: Minimum HF before rebalancing (default: 1.5)
- `maxGasPrice`: Max gas price in gwei (default: 5)
- `emergencyWithdrawThreshold`: HF to trigger emergency actions (default: 1.1)

## Contract Addresses (BSC Mainnet)

### Venus Protocol
- Comptroller: `0xfD36E2c2a6789Db23113685031d7F16329158384`
- vBNB: `0xA07c5b74C9B40447a954e1466938b865b6BBea36`
- vUSDT: `0xfD5840Cd36d94D7229439859C0112a4185BC0255`

### Aave V3
- Pool: `0x6807dc923806fE8Fd134338EABCA509979a7e0cB`
- Pool Data Provider: `0xc90Df74A7c16245c5F5C5870327Ceb38Fe5d5328`
- Oracle: `0x39bc1bfDa2130d6Bb6DBEfd366939b4c7aa7C697`

## Development

```bash
# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start
```

## Contributing

This is a DeFi tool. Please:
1. Test with small amounts first
2. Understand the risks of lending/borrowing
3. Keep your private keys secure
4. Review all transactions before confirming

## Disclaimer

This software is for educational purposes. Use at your own risk:
- Smart contract risk
- Oracle risk
- Liquidation risk
- Gas price volatility

Always DYOR (Do Your Own Research).

## License

MIT
