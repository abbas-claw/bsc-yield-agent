import { Token, ProtocolName } from './types';

// BSC Mainnet Chain ID
export const BSC_CHAIN_ID = 56;
export const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org';
export const BSC_RPC_URLS = [
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
  'https://bsc-dataseed3.binance.org',
  'https://bsc-dataseed4.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed2.defibit.io',
];

// Supported Tokens
export const TOKENS: Record<string, Token> = {
  BNB: {
    symbol: 'BNB',
    name: 'BNB',
    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    decimals: 18,
    isStablecoin: false,
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    decimals: 18,
    isStablecoin: false,
  },
  BTCB: {
    symbol: 'BTCB',
    name: 'Bitcoin BEP2',
    address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    decimals: 18,
    isStablecoin: false,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18,
    isStablecoin: true,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    decimals: 18,
    isStablecoin: true,
  },
  FDUSD: {
    symbol: 'FDUSD',
    name: 'First Digital USD',
    address: '0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409',
    decimals: 18,
    isStablecoin: true,
  },
};

// Venus Protocol Addresses (Core Pool - BSC Mainnet)
export const VENUS = {
  COMPTROLLER: '0xfD36E2c2a6789Db23113685031d7F16329158384',
  ORACLE: '0xd8B6dA2bfEC71D684D3E2a2FC9492dDad5C3787F',
  XVS: '0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63',
  VAI: '0x4BD17003473389A42DAF6a0a729f6Fdb328BbBd7',
  LENS: '0xf89C06e81085bC4BAb68A96dB7773D47f0CdDEE4',
  // vToken addresses (Core Pool)
  vTokens: {
    BNB: '0xA07c5b74C9B40447a954e1466938b865b6BBea36',    // vBNB (native)
    USDT: '0xfD5840Cd36d94D7229439859C0112a4185BC0255',   // vUSDT
    USDC: '0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8',   // vUSDC
    BTCB: '0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B',   // vBTC
    ETH: '0xf508fCD89b8bd15579dc79A6827cB4686A3592c8',    // vETH
    FDUSD: '0xC4eF4229FEc74Ccfe17B2bdeF7715fAC740BA0ba',  // vFDUSD
  } as Record<string, string>,
};

// Aave V3 Addresses (BSC Mainnet)
export const AAVE = {
  POOL: '0x6807dc923806fE8Fd134338EABCA509979a7e0cB',
  POOL_DATA_PROVIDER: '0xc90Df74A7c16245c5F5C5870327Ceb38Fe5d5328',
  POOL_ADDRESSES_PROVIDER: '0xff75B6da14FfbbfD355Daf7a2731456b3562Ba6D',
  ORACLE: '0x39bc1bfDa2130d6Bb6DBEfd366939b4c7aa7C697',
  INCENTIVES_CONTROLLER: '0xC206C2764A9dBF27d599613b8F9A63ACd1160ab4',
  WETH_GATEWAY: '0x0c2C95b24529664fE55D4437D7A31175CFE6c4f7',
  UI_POOL_DATA_PROVIDER: '0x632b5Dfc315b228bfE779E6442322Ad8a110Ea13',
  // Underlying token addresses for Aave
  underlyings: {
    BNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',   // WBNB
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    FDUSD: '0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409',
  } as Record<string, string>,
  aTokens: {
    BNB: '0x9B00a09492a626678E5A3009982191586C444Df9',
    USDT: '0xa9251ca9DE909CB71783723713B21E4233fbf1B1',
    USDC: '0x00901a076785e0906d1028c7d6372d247bec7d61',
    BTCB: '0x56a7ddc4e848EbF43845854205ad71D5D5F72d3D',
    ETH: '0x2E94171493fAbE316b6205f1585779C887771E2F',
    FDUSD: '0x75bd1A659bdC62e4C313950d44A2416faB43E785',
  } as Record<string, string>,
  vTokens: {
    BNB: '0x0E76414d433ddfe8004d2A7505d218874875a996',
    USDT: '0xF8bb2Be50647447Fb355e3a77b81be4db64107cd',
    USDC: '0xcDBBEd5606d9c5C98eEedd67933991dC17F0c68d',
    BTCB: '0x7b1E82F4f542fbB25D64c5523Fe3e44aBe4F2702',
    ETH: '0x8FDea7891b4D6dbdc746309245B316aF691A636C',
    FDUSD: '0xE628B8a123e6037f1542e662B9F55141a16945C8',
  } as Record<string, string>,
};

// Default strategy configurations
export const DEFAULT_STRATEGY_CONFIG = {
  maxLTV: 0.65,                    // 65% max LTV
  minHealthFactor: 1.5,            // Minimum health factor
  rebalanceThreshold: 50,          // 50 bps (0.5%) minimum APY difference
  maxGasPrice: '5',                // 5 gwei max
  slippageTolerance: 0.005,        // 0.5% slippage
  maxPositionSize: '100000',       // $100k max per position
  emergencyWithdrawThreshold: 1.1, // Emergency at 1.1 health factor
  maxDailyGasUSD: 50,              // $50 max daily gas spend
  intervalMs: 5 * 60 * 1000,       // Check every 5 minutes
};

// Protocol list
export const PROTOCOLS: ProtocolName[] = ['venus', 'aave'];
