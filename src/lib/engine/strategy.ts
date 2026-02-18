import { ProtocolRate, Strategy, StrategyType, TransactionRequest, PortfolioSummary, Position } from '../types';
import { TOKENS, DEFAULT_STRATEGY_CONFIG } from '../config';
import { VenusProtocol } from '../protocols/venus';
import { AaveProtocol } from '../protocols/aave';

export interface StrategyRecommendation {
  strategy: string;
  reasoning: string;
  actions: TransactionRequest[];
  expectedAPY: number;
  risk: 'low' | 'medium' | 'high';
}

export class StrategyEngine {
  private venus: VenusProtocol;
  private aave: AaveProtocol;

  constructor() {
    this.venus = new VenusProtocol();
    this.aave = new AaveProtocol();
  }

  async getAllRates(): Promise<ProtocolRate[]> {
    const [venusRates, aaveRates] = await Promise.all([
      this.venus.getRates(),
      this.aave.getRates(),
    ]);
    return [...venusRates, ...aaveRates];
  }

  async getPortfolio(userAddress: string): Promise<PortfolioSummary> {
    const [venusPositions, aavePositions] = await Promise.all([
      this.venus.getPositions(userAddress),
      this.aave.getPositions(userAddress),
    ]);

    const positions = [...venusPositions, ...aavePositions];

    // Get prices for USD calculation
    const prices: Record<string, number> = {};
    for (const token of Object.keys(TOKENS)) {
      prices[token] = await this.aave.getTokenPriceUSD(token);
    }

    // Calculate USD values
    for (const pos of positions) {
      const price = prices[pos.token.symbol] || 0;
      pos.amountUSD = parseFloat(pos.amount) * price;
    }

    const supplyPositions = positions.filter(p => p.type === 'supply');
    const borrowPositions = positions.filter(p => p.type === 'borrow');

    const totalSuppliedUSD = supplyPositions.reduce((sum, p) => sum + p.amountUSD, 0);
    const totalBorrowedUSD = borrowPositions.reduce((sum, p) => sum + p.amountUSD, 0);

    const weightedSupplyAPY = totalSuppliedUSD > 0
      ? supplyPositions.reduce((sum, p) => sum + p.apy * p.amountUSD, 0) / totalSuppliedUSD
      : 0;

    const weightedBorrowAPY = totalBorrowedUSD > 0
      ? borrowPositions.reduce((sum, p) => sum + p.apy * p.amountUSD, 0) / totalBorrowedUSD
      : 0;

    // Health factor from both protocols
    const [venusHF, aaveHF] = await Promise.all([
      this.venus.getHealthFactor(userAddress),
      this.aave.getHealthFactor(userAddress),
    ]);
    const healthFactor = Math.min(venusHF || 999, aaveHF || 999);

    return {
      totalSuppliedUSD,
      totalBorrowedUSD,
      netWorthUSD: totalSuppliedUSD - totalBorrowedUSD,
      weightedSupplyAPY,
      weightedBorrowAPY,
      netAPY: weightedSupplyAPY - (totalBorrowedUSD > 0 ? weightedBorrowAPY * (totalBorrowedUSD / totalSuppliedUSD) : 0),
      healthFactor,
      positions,
    };
  }

  // Find the best supply rate for a token across all protocols
  findBestSupplyRate(rates: ProtocolRate[], symbol: string): ProtocolRate | null {
    const tokenRates = rates.filter(r => r.token.symbol === symbol);
    if (tokenRates.length === 0) return null;
    return tokenRates.reduce((best, r) => r.netSupplyAPY > best.netSupplyAPY ? r : best);
  }

  // Find the best borrow rate for a token across all protocols
  findBestBorrowRate(rates: ProtocolRate[], symbol: string): ProtocolRate | null {
    const tokenRates = rates.filter(r => r.token.symbol === symbol);
    if (tokenRates.length === 0) return null;
    return tokenRates.reduce((best, r) => r.netBorrowAPY < best.netBorrowAPY ? r : best);
  }

  // Generate recommendations based on current rates and positions
  async generateRecommendations(userAddress: string): Promise<StrategyRecommendation[]> {
    const rates = await this.getAllRates();
    const recommendations: StrategyRecommendation[] = [];

    // Strategy 1: Best Yield - find highest supply APY across all tokens/protocols
    const bestYieldRecs = this.bestYieldStrategy(rates);
    recommendations.push(...bestYieldRecs);

    // Strategy 2: Stable Yield - best stablecoin yields
    const stableRecs = this.stableYieldStrategy(rates);
    recommendations.push(...stableRecs);

    // Strategy 3: Rate Arbitrage - borrow low, supply high
    const arbRecs = this.rateArbitrageStrategy(rates);
    recommendations.push(...arbRecs);

    // If user has positions, check for rebalance opportunities
    if (userAddress) {
      const portfolio = await this.getPortfolio(userAddress);
      const rebalanceRecs = this.checkRebalance(rates, portfolio);
      recommendations.push(...rebalanceRecs);
    }

    return recommendations.sort((a, b) => b.expectedAPY - a.expectedAPY);
  }

  private bestYieldStrategy(rates: ProtocolRate[]): StrategyRecommendation[] {
    const recs: StrategyRecommendation[] = [];

    // Group by token, find best rate for each
    const tokenGroups = new Map<string, ProtocolRate[]>();
    for (const rate of rates) {
      const existing = tokenGroups.get(rate.token.symbol) || [];
      existing.push(rate);
      tokenGroups.set(rate.token.symbol, existing);
    }

    for (const [symbol, tokenRates] of tokenGroups) {
      const best = tokenRates.reduce((a, b) => a.netSupplyAPY > b.netSupplyAPY ? a : b);
      if (best.netSupplyAPY > 0.5) { // Only recommend if > 0.5% APY
        recs.push({
          strategy: 'best-yield',
          reasoning: `${symbol} has best supply APY of ${best.netSupplyAPY.toFixed(2)}% on ${best.protocol}`,
          actions: [{
            protocol: best.protocol,
            action: 'supply',
            token: symbol,
            amount: '0', // User decides amount
          }],
          expectedAPY: best.netSupplyAPY,
          risk: best.token.isStablecoin ? 'low' : 'medium',
        });
      }
    }

    return recs;
  }

  private stableYieldStrategy(rates: ProtocolRate[]): StrategyRecommendation[] {
    const stableRates = rates.filter(r => r.token.isStablecoin);
    if (stableRates.length === 0) return [];

    const best = stableRates.reduce((a, b) => a.netSupplyAPY > b.netSupplyAPY ? a : b);

    return [{
      strategy: 'stable-yield',
      reasoning: `Best stablecoin yield: ${best.token.symbol} at ${best.netSupplyAPY.toFixed(2)}% APY on ${best.protocol}. Low impermanent loss risk.`,
      actions: [{
        protocol: best.protocol,
        action: 'supply',
        token: best.token.symbol,
        amount: '0',
      }],
      expectedAPY: best.netSupplyAPY,
      risk: 'low',
    }];
  }

  private rateArbitrageStrategy(rates: ProtocolRate[]): StrategyRecommendation[] {
    const recs: StrategyRecommendation[] = [];

    // Look for opportunities: supply token A on protocol X, borrow token A on protocol Y
    // where supply APY > borrow APY (rare but possible with rewards)
    const tokenGroups = new Map<string, ProtocolRate[]>();
    for (const rate of rates) {
      const existing = tokenGroups.get(rate.token.symbol) || [];
      existing.push(rate);
      tokenGroups.set(rate.token.symbol, existing);
    }

    for (const [symbol, tokenRates] of tokenGroups) {
      if (tokenRates.length < 2) continue;

      const bestSupply = tokenRates.reduce((a, b) => a.netSupplyAPY > b.netSupplyAPY ? a : b);
      const bestBorrow = tokenRates.reduce((a, b) => a.netBorrowAPY < b.netBorrowAPY ? a : b);

      // Only if they're on different protocols and spread is meaningful
      if (bestSupply.protocol !== bestBorrow.protocol) {
        const spread = bestSupply.netSupplyAPY - bestBorrow.netBorrowAPY;
        if (spread > 1) { // > 1% spread
          recs.push({
            strategy: 'rate-arbitrage',
            reasoning: `Supply ${symbol} on ${bestSupply.protocol} (${bestSupply.netSupplyAPY.toFixed(2)}%) and borrow on ${bestBorrow.protocol} (${bestBorrow.netBorrowAPY.toFixed(2)}%). Spread: ${spread.toFixed(2)}%`,
            actions: [
              { protocol: bestSupply.protocol, action: 'supply', token: symbol, amount: '0' },
              { protocol: bestBorrow.protocol, action: 'borrow', token: symbol, amount: '0' },
            ],
            expectedAPY: spread,
            risk: 'high',
          });
        }
      }
    }

    return recs;
  }

  private checkRebalance(rates: ProtocolRate[], portfolio: PortfolioSummary): StrategyRecommendation[] {
    const recs: StrategyRecommendation[] = [];
    const threshold = DEFAULT_STRATEGY_CONFIG.rebalanceThreshold / 100; // Convert bps to %

    for (const position of portfolio.positions) {
      if (position.type !== 'supply') continue;

      const bestRate = this.findBestSupplyRate(rates, position.token.symbol);
      if (!bestRate) continue;

      // Check if current position is on a suboptimal protocol
      if (bestRate.protocol !== position.protocol) {
        const improvement = bestRate.netSupplyAPY - position.apy;
        if (improvement > threshold) {
          recs.push({
            strategy: 'rebalance',
            reasoning: `Move ${position.token.symbol} from ${position.protocol} (${position.apy.toFixed(2)}%) to ${bestRate.protocol} (${bestRate.netSupplyAPY.toFixed(2)}%). Improvement: +${improvement.toFixed(2)}%`,
            actions: [
              { protocol: position.protocol, action: 'withdraw', token: position.token.symbol, amount: position.amount },
              { protocol: bestRate.protocol, action: 'supply', token: position.token.symbol, amount: position.amount },
            ],
            expectedAPY: bestRate.netSupplyAPY,
            risk: 'low',
          });
        }
      }
    }

    return recs;
  }
}
