// Core types for BSC Yield Agent

export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  isStablecoin: boolean;
  logoUrl?: string;
}

export interface ProtocolRate {
  protocol: ProtocolName;
  token: Token;
  supplyAPY: number;      // Annual percentage yield for supplying
  borrowAPY: number;      // Annual percentage yield for borrowing
  supplyAPR: number;      // Annual percentage rate (before compounding)
  borrowAPR: number;
  rewardAPY: number;      // Additional reward token APY (XVS, etc.)
  netSupplyAPY: number;   // supplyAPY + rewardAPY
  netBorrowAPY: number;   // borrowAPY - rewardAPY (negative means you earn)
  totalSupply: string;    // Total supplied in token units
  totalBorrow: string;    // Total borrowed in token units
  utilization: number;    // Utilization rate (0-100)
  liquidity: string;      // Available liquidity
  collateralFactor: number; // LTV ratio (0-1)
  liquidationThreshold: number;
  timestamp: number;
}

export type ProtocolName = 'venus' | 'aave';

export interface Position {
  protocol: ProtocolName;
  token: Token;
  type: 'supply' | 'borrow';
  amount: string;         // Human-readable amount
  amountUSD: number;
  apy: number;
  earnedRewards: string;
  healthFactor?: number;
}

export interface PortfolioSummary {
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  netWorthUSD: number;
  weightedSupplyAPY: number;
  weightedBorrowAPY: number;
  netAPY: number;
  healthFactor: number;
  positions: Position[];
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  type: StrategyType;
  enabled: boolean;
  config: StrategyConfig;
  lastExecuted?: number;
}

export type StrategyType = 
  | 'best-yield'           // Supply to highest APY
  | 'stable-yield'         // Supply stablecoins to best rate
  | 'leverage-loop'        // Supply → Borrow → Re-supply for amplified yield
  | 'rate-arbitrage'       // Borrow low, supply high across protocols
  | 'auto-compound';       // Harvest and reinvest rewards

export interface StrategyConfig {
  tokens: string[];        // Token symbols to include
  protocols: ProtocolName[];
  maxLTV: number;          // Maximum loan-to-value ratio (0-1)
  minHealthFactor: number; // Minimum health factor before rebalance
  rebalanceThreshold: number; // Min APY difference to trigger rebalance (bps)
  maxGasPrice: string;     // Max gas price in gwei
  slippageTolerance: number; // Max slippage (0-1)
  maxPositionSize: string; // Max amount per position in USD
}

export interface TransactionRequest {
  protocol: ProtocolName;
  action: 'supply' | 'withdraw' | 'borrow' | 'repay' | 'claim';
  token: string;           // Token symbol
  amount: string;          // Amount in token units
  gasLimit?: number;
}

export interface TransactionResult {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  action: string;
  token: string;
  amount: string;
  protocol: ProtocolName;
  gasUsed?: string;
  timestamp: number;
  error?: string;
}

export interface AgentAction {
  id: string;
  timestamp: number;
  strategy: string;
  actions: TransactionRequest[];
  results: TransactionResult[];
  reasoning: string;       // Why the agent took this action
}

export interface AgentConfig {
  privateKey: string;
  rpcUrl: string;
  enabled: boolean;
  intervalMs: number;      // How often to check for opportunities
  strategies: Strategy[];
  emergencyWithdrawThreshold: number; // Health factor to trigger emergency
  maxDailyGasUSD: number;
  notifications: {
    telegram?: string;
    webhook?: string;
  };
}

export interface TokenPrice {
  symbol: string;
  priceUSD: number;
  timestamp: number;
}
